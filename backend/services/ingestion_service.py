"""
Ingestion Service: Parses and imports merchant statements across multiple formats (CSV, Excel, PDF, TXT)
into the cash ledger and automatically synchronizes the merchant's real bank balance.
"""

import csv
import io
import re
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.models.merchant import Merchant
from backend.models.settlement import Settlement
from backend.models.expense import Expense
from backend.models.transaction import Transaction
from backend.models.refund import Refund
from backend.models.obligation import Obligation
from backend.core.exceptions import MerchantNotFoundError


class IngestionService:
    @staticmethod
    def parse_amount(val: Any) -> float:
        """Sanitizes strings like '₹1,50,000.00', '150000', '-500.5', '(200.00)', '8,85,000 Cr' into float."""
        if val is None:
            return 0.0
        s = str(val).strip()
        # Handle parentheses representing negative numbers: (500.00) -> -500.00
        is_negative = False
        if s.startswith("(") and s.endswith(")"):
            is_negative = True
            s = s[1:-1]
        s = (
            s.replace("₹", "")
            .replace("Rs.", "")
            .replace("Rs", "")
            .replace("INR", "")
            .replace("$", "")
            .replace(",", "")
            .replace(" ", "")
        )
        # Strip trailing Cr / Dr notations
        s = re.sub(r"(?i)(?:cr|dr)$", "", s).strip()
        if not s:
            return 0.0
        try:
            val_float = float(s)
            return -val_float if is_negative else val_float
        except ValueError:
            return 0.0

    @staticmethod
    def parse_date(val: Any) -> date:
        """Parses various date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD-Mon-YYYY, etc.)."""
        if isinstance(val, (datetime, date)):
            return val if isinstance(val, date) else val.date()
        s = str(val).strip()
        # Clean potential trailing times or extra spaces
        if " " in s and len(s) > 11:
            parts = s.split()
            if len(parts) >= 2 and any(sep in parts[0] for sep in ("-", "/")):
                s = parts[0]

        date_formats = (
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%d-%b-%Y",
            "%d-%B-%Y",
            "%d %b %Y",
            "%d %B %Y",
            "%b %d, %Y",
            "%B %d, %Y",
            "%d/%m/%y",
            "%d-%m-%y",
            "%d.%m.%Y",
            "%d.%m.%y",
        )
        for fmt in date_formats:
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue

        # Regex fallback for embedded dates like "31-Aug-2026" or "31/08/2026"
        d_match = re.search(r"(\d{1,2})[-/\.]([a-zA-Z]{3}|\d{1,2})[-/\.](\d{2,4})", s)
        if d_match:
            day, mon, yr = d_match.groups()
            if len(yr) == 2:
                yr = f"20{yr}"
            for fmt in ("%d-%m-%Y", "%d-%b-%Y"):
                try:
                    return datetime.strptime(f"{day}-{mon}-{yr}", fmt).date()
                except ValueError:
                    pass

        return date.today()

    @classmethod
    def extract_closing_balance_from_text(cls, text: str) -> Optional[float]:
        """
        Scans statement text across multiple Indian and international bank phrasing patterns.
        Examples:
        - 'Closing Balance: ₹8,85,000.00'
        - 'Available Balance: 8,85,000.00'
        - 'Clear Bal : Rs. 8,85,000.00'
        - 'Balance as on 31/08/2026 : 8,85,000.00 Cr'
        - 'Account Balance (INR) : 8,85,000.00'
        - 'Ending Balance: 885000'
        """
        patterns = [
            # Pattern 1: Keywords + optional "as of / on" + separator + optional currency + amount + optional Cr/Dr
            re.compile(
                r"(?:closing|available|book|net|account|current|ledger|total|clear|eff(?:ective)?|avail(?:able)?|ending|final)\s*(?:cash|fund|funds)?\s*(?:balance|bal\.?)(?:\s+as\s+(?:of|on|at)\s+[^:\n\r]{1,30})?\s*[:\-=]?\s*(?:inr|rs\.?|₹|\$)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:cr|dr)?",
                re.IGNORECASE,
            ),
            # Pattern 2: "Balance as on / as of [date] : [amount]"
            re.compile(
                r"balance\s+as\s+(?:of|on|at)\s+[^:\n\r]{1,30}\s*[:\-=]?\s*(?:inr|rs\.?|₹|\$)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:cr|dr)?",
                re.IGNORECASE,
            ),
            # Pattern 3: Currency + amount + "available balance / closing balance"
            re.compile(
                r"(?:inr|rs\.?|₹|\$)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:cr)?\s*(?:\([a-z\s]+\))?\s*(?:available|closing|net|clear)\s*balance",
                re.IGNORECASE,
            ),
        ]

        for pat in patterns:
            matches = pat.findall(text)
            if matches:
                # Iterate in reverse to get the final closing balance
                for candidate in reversed(matches):
                    amt = cls.parse_amount(candidate)
                    if amt > 0:
                        return amt

        return None

    @classmethod
    def _normalize_header(cls, header: str) -> str:
        """Normalizes header string for fuzzy matching (e.g. 'Closing Balance (INR)' -> 'closing balance')."""
        s = str(header).strip().lower().replace("_", " ").replace("-", " ")
        s = re.sub(r"[^a-z0-9 ]", "", s).strip()
        return s

    @classmethod
    def _map_columns(cls, raw_headers: List[str]) -> Dict[str, str]:
        """
        Maps arbitrary bank statement headers into standard keys:
        'date', 'description', 'credit', 'debit', 'balance', 'amount', 'type'
        """
        mapping = {}
        for raw in raw_headers:
            norm = cls._normalize_header(raw)
            if not norm:
                continue

            # Balance mapping
            if any(k in norm for k in ("closing balance", "closing bal", "available balance", "avail bal", "running balance", "clear balance", "book balance", "net balance", "balance", "bal")) and not any(k in norm for k in ("opening", "open bal", "type")):
                if "balance" not in mapping:
                    mapping["balance"] = raw

            # Credit / Inflow mapping
            elif any(k in norm for k in ("credit", "deposit", "inflow", "cr amount", "amount credited", "received")) or norm == "cr":
                if "credit" not in mapping:
                    mapping["credit"] = raw

            # Debit / Outflow mapping
            elif any(k in norm for k in ("debit", "withdrawal", "outflow", "dr amount", "amount debited", "paid", "spent", "payments")) or norm == "dr":
                if "debit" not in mapping:
                    mapping["debit"] = raw

            # Date mapping
            elif any(k in norm for k in ("txn date", "transaction date", "value date", "post date", "booking date", "date", "time")) and "date" not in mapping:
                mapping["date"] = raw

            # Description mapping
            elif any(k in norm for k in ("narration", "particulars", "description", "remarks", "details", "desc", "payee", "note")) and "description" not in mapping:
                mapping["description"] = raw

            # Amount mapping (when credit and debit are not split)
            elif any(k in norm for k in ("amount", "txn amount", "gross amount", "net amount", "val")) and "amount" not in mapping:
                mapping["amount"] = raw

            # Type mapping (INFLOW/OUTFLOW, CR/DR)
            elif any(k in norm for k in ("type", "txn type", "transaction type", "dr/cr", "cr/dr", "indicator")) and "type" not in mapping:
                mapping["type"] = raw

        return mapping

    @classmethod
    def parse_statement_text_rows(cls, text: str) -> Tuple[List[Dict[str, Any]], Optional[float], bool]:
        """
        Parses transactions from raw statement text across PDF extractions.
        Distinguishes between standard bank statements with balance columns
        and UPI app statements (PhonePe, Google Pay, Paytm) that do NOT have bank balances.
        Guarantees:
        - Platform fees (e.g. ₹6.00) or UTRs are NEVER confused with bank balances or main amounts.
        - Accepts ALL transaction amounts (> 0).
        """
        is_upi = any(k in text.lower() for k in ("phonepe", "upi transaction id", "google pay", "gpay", "paytm", "bhim", "utr:"))
        has_balance_col = any(h in text.lower() for h in ("closing balance", "running balance", "clear balance", "balance (inr)", "bal inr", "bal (cr/dr)"))

        date_regex = re.compile(
            r"(?:^|[\s\b])(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{1,2}[-\s/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s/]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})",
            re.IGNORECASE,
        )

        lines = [l.strip() for l in text.splitlines() if l.strip()]
        blocks = []
        curr_block = []

        for l in lines:
            if date_regex.search(l[:35]):
                if curr_block:
                    blocks.append(curr_block)
                curr_block = [l]
            elif curr_block:
                curr_block.append(l)
        if curr_block:
            blocks.append(curr_block)

        rows = []
        last_extracted_balance = None

        for blk in blocks:
            d_match = date_regex.search(blk[0][:35])
            if not d_match:
                continue
            date_str = d_match.group(1).strip()

            desc = ""
            direction = None
            amount = 0.0
            fee = 0.0
            row_balance = None

            for idx, l in enumerate(blk):
                low = l.lower()
                if any(k in low for k in ("utr:", "txn id:", "transaction id:", "statement of", "page ", "generated on")):
                    continue

                fee_match = re.search(r"(?i)(?:platform\s*fee|convenience\s*fee|fee|gst|charges?)[\s:]*(?:₹|rs\.?|inr|\$)?\s*([0-9]+(?:\.[0-9]{1,2})?)", l)
                if fee_match:
                    fee = float(fee_match.group(1))

                bal_match = re.search(r"(?i)\b(?:closing\s*bal(?:ance)?|avail(?:able)?\s*bal(?:ance)?|clear\s*bal(?:ance)?)\s*[:\-=]?\s*(?:₹|rs\.?|inr|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)", l)
                if bal_match:
                    row_balance = cls.parse_amount(bal_match.group(1))

                if any(k in low for k in ("cr", "credit", "credited", "deposit", "received from", "received", "payout", "settlement", "cashback")):
                    direction = "CREDIT"
                elif any(k in low for k in ("dr", "debit", "debited", "paid to", "payment to", "withdrawal", "transfer to", "sent to", "expense", "bill paid")):
                    direction = "DEBIT"

                if any(k in low for k in ("paid to", "received from", "transfer to", "payment to", "settlement", "payout", "upi", "neft", "rtgs", "imps", "swiggy", "zomato", "amazon", "flipkart", "supplier", "vendor")):
                    if not desc:
                        desc = l.strip()

                line_for_amt = l[d_match.end():] if idx == 0 else l
                line_for_amt = re.sub(r"\b\d{10,}\b", "", line_for_amt)
                if fee_match:
                    line_for_amt = line_for_amt[:fee_match.start()] + line_for_amt[fee_match.end():]

                numbers = re.findall(
                    r"(?:₹|Rs\.?|INR|\$)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)",
                    line_for_amt,
                )
                line_amts = [cls.parse_amount(n) for n in numbers if cls.parse_amount(n) > 0]
                if fee > 0:
                    line_amts = [a for a in line_amts if abs(a - fee) > 0.001]

                if line_amts:
                    if has_balance_col and len(line_amts) >= 2 and row_balance is None:
                        amount = line_amts[0]
                        row_balance = line_amts[-1]
                    else:
                        amount = line_amts[0]

            if amount <= 0:
                continue

            if not desc:
                desc = blk[0][d_match.end():].strip() or "Bank Statement Entry"
            if not direction:
                direction = "DEBIT"

            row_dict = {
                "date": date_str,
                "description": desc,
                "type": direction,
                "amount": amount,
            }
            if direction == "CREDIT":
                row_dict["credit"] = amount
                row_dict["debit"] = 0.0
            else:
                row_dict["debit"] = amount
                row_dict["credit"] = 0.0

            if row_balance is not None and row_balance > 0:
                row_dict["balance"] = str(row_balance)
                last_extracted_balance = row_balance

            rows.append(row_dict)

        return rows, last_extracted_balance, is_upi

    @classmethod
    def ingest_statement(
        cls,
        db: Session,
        merchant_id: str,
        file_contents: bytes,
        filename: str = "statement.csv",
        manual_balance: Optional[float] = None,
        replace_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Dispatches statement parsing based on file extension (.csv, .xlsx, .pdf, .txt),
        extracts settlements and expenses, identifies the closing bank balance,
        and automatically updates the merchant's live bank cash balance in SQLite.
        """
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if not merchant:
            raise MerchantNotFoundError(f"Merchant {merchant_id} not found.")

        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "csv"

        rows_data = []
        raw_text_for_summary = ""
        extracted_balance = None
        is_upi_detected = False

        # 1. EXCEL SPREADSHEETS (.xlsx, .xls)
        if ext in ("xlsx", "xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(file_contents), data_only=True)
                ws = wb.active
                all_rows = list(ws.iter_rows(values_only=True))
                if not all_rows:
                    raise ValueError("Excel file is empty.")

                header_idx = 0
                keywords = ("date", "description", "narration", "credit", "debit", "deposit", "withdrawal", "balance", "amount", "particulars", "remarks")
                for idx, r in enumerate(all_rows):
                    row_str = " ".join([str(c).lower() for c in r if c is not None])
                    matched_kw = sum(1 for kw in keywords if kw in row_str)
                    if matched_kw >= 2:
                        header_idx = idx
                        break

                raw_headers = [str(c).strip() if c is not None else f"col_{i}" for i, c in enumerate(all_rows[header_idx])]
                col_map = cls._map_columns(raw_headers)

                for r in all_rows[header_idx + 1:]:
                    if not any(r):
                        continue
                    row_dict = {}
                    for i, cell_val in enumerate(r):
                        if i < len(raw_headers) and cell_val is not None:
                            row_dict[raw_headers[i]] = str(cell_val).strip()

                    canonical_row = {}
                    for canon_key, orig_col in col_map.items():
                        if orig_col in row_dict:
                            canonical_row[canon_key] = row_dict[orig_col]

                    if canonical_row:
                        rows_data.append(canonical_row)

            except Exception as e:
                raise ValueError(f"Failed to parse Excel statement: {str(e)}")

        # 2. PDF BANK STATEMENTS (.pdf)
        elif ext == "pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(file_contents))
                pdf_text = ""
                for page in reader.pages:
                    txt = page.extract_text()
                    if txt:
                        pdf_text += txt + "\n"

                raw_text_for_summary = pdf_text
                extracted_balance = cls.extract_closing_balance_from_text(pdf_text)

                pdf_rows, pdf_bal, is_upi = cls.parse_statement_text_rows(pdf_text)
                rows_data.extend(pdf_rows)
                is_upi_detected = is_upi

                if pdf_bal is not None:
                    extracted_balance = pdf_bal

            except Exception as e:
                raise ValueError(f"Failed to parse PDF statement: {str(e)}")

        # 3. CSV / TEXT STATEMENTS (.csv, .txt)
        else:
            decoded_text = file_contents.decode("utf-8-sig", errors="replace")
            raw_text_for_summary = decoded_text
            extracted_balance = cls.extract_closing_balance_from_text(decoded_text)

            text_stream = io.StringIO(decoded_text)
            reader = csv.reader(text_stream)
            all_lines = list(reader)

            if all_lines:
                # Find header row
                header_idx = 0
                keywords = ("date", "description", "narration", "credit", "debit", "deposit", "withdrawal", "balance", "amount", "particulars")
                for idx, r in enumerate(all_lines):
                    line_str = " ".join([c.lower() for c in r])
                    if sum(1 for kw in keywords if kw in line_str) >= 2:
                        header_idx = idx
                        break

                raw_headers = all_lines[header_idx]
                col_map = cls._map_columns(raw_headers)

                for r in all_lines[header_idx + 1:]:
                    if not any(r):
                        continue
                    row_dict = {raw_headers[i]: r[i].strip() for i in range(min(len(raw_headers), len(r)))}
                    canonical_row = {}
                    for canon_key, orig_col in col_map.items():
                        if orig_col in row_dict:
                            canonical_row[canon_key] = row_dict[orig_col]

                    if canonical_row:
                        rows_data.append(canonical_row)

        # Fallback balance extraction from raw text if not yet found
        if extracted_balance is None and raw_text_for_summary:
            extracted_balance = cls.extract_closing_balance_from_text(raw_text_for_summary)

        # Allow user-provided manual balance override
        final_balance = None
        if manual_balance is not None and float(manual_balance) > 0:
            final_balance = round(float(manual_balance), 2)
        elif extracted_balance is not None and float(extracted_balance) > 0:
            final_balance = round(float(extracted_balance), 2)

        # Capture old cash ledger state
        from backend.services.cashflow_service import CashflowService
        ledger_before = CashflowService.get_merchant_ledger(db, merchant_id)
        old_cash = ledger_before["current_balance"]

        # If no rows extracted but a balance is identified, directly sync the balance!
        if not rows_data:
            if final_balance is not None and final_balance > 0:
                delta = final_balance - old_cash
                merchant.starting_balance = round(float(merchant.starting_balance) + delta, 2)
                merchant.minimum_operating_cash = round(max(300.0, final_balance * 0.35), 2)
                db.commit()
                return {
                    "success": True,
                    "merchant_id": merchant_id,
                    "filename": filename,
                    "rows_processed": 0,
                    "inflows_added": 0,
                    "outflows_added": 0,
                    "total_inflow_amount": 0.0,
                    "total_outflow_amount": 0.0,
                    "closing_balance_extracted": final_balance,
                    "previous_cash": old_cash,
                    "new_cash": final_balance,
                    "preview_rows": [],
                    "message": f"Successfully parsed {filename}. Extracted closing bank balance of ₹{final_balance:,.2f}. Updated live bank cash from ₹{old_cash:,.2f} to ₹{final_balance:,.2f}.",
                }
            raise ValueError("No transaction entries or bank balance could be extracted from this file. Please verify file format or enter the closing balance.")

        # Process Extracted Rows into Database
        if replace_mode:
            # Clean old records so account reflects exact uploaded statement
            db.query(Refund).filter(Refund.merchant_id == merchant_id).delete()
            db.query(Settlement).filter(Settlement.merchant_id == merchant_id).delete()
            db.query(Expense).filter(Expense.merchant_id == merchant_id).delete()
            db.query(Transaction).filter(Transaction.merchant_id == merchant_id).delete()

            # Clean old demo obligations if they vastly exceed the new statement balance
            old_obs = db.query(Obligation).filter(Obligation.merchant_id == merchant_id).all()
            total_ob_amt = sum(o.amount for o in old_obs)
            target_bal = float(final_balance if (final_balance is not None and final_balance > 0) else (manual_balance or 2000.0))
            if total_ob_amt > target_bal * 1.5 or any(o.amount > target_bal for o in old_obs):
                db.query(Obligation).filter(Obligation.merchant_id == merchant_id).delete()
                starter_obs = [
                    Obligation(
                        obligation_id=f"ob_{merchant_id}_tax",
                        merchant_id=merchant_id,
                        due_date=date(2026, 9, 20),
                        amount=round(min(500.0, max(100.0, target_bal * 0.25)), 2),
                        category="TAX",
                        priority="MANDATORY",
                        recurring=True,
                        status="UPCOMING",
                    ),
                    Obligation(
                        obligation_id=f"ob_{merchant_id}_util",
                        merchant_id=merchant_id,
                        due_date=date(2026, 9, 12),
                        amount=round(min(350.0, max(50.0, target_bal * 0.15)), 2),
                        category="UTILITIES",
                        priority="HIGH",
                        recurring=True,
                        status="UPCOMING",
                    ),
                ]
                db.bulk_save_objects(starter_obs)

            # Recalibrate merchant minimum operating cash floor to match the new scale
            if merchant.minimum_operating_cash > target_bal:
                merchant.minimum_operating_cash = round(max(300.0, target_bal * 0.35), 2)
            db.commit()

        rows_processed = 0
        inflows_added = 0
        outflows_added = 0
        total_inflow_amt = 0.0
        total_outflow_amt = 0.0
        preview_rows = []

        for r in rows_data:
            rows_processed += 1

            # Update running balance if column is present in row
            if "balance" in r and r["balance"]:
                row_bal = cls.parse_amount(r["balance"])
                if row_bal > 0 and manual_balance is None:
                    final_balance = round(row_bal, 2)

            desc = r.get("description", "Bank Statement Entry")
            row_date = cls.parse_date(r.get("date", date.today()))

            # Check for Credit vs Debit
            credit_amt = cls.parse_amount(r.get("credit", 0))
            debit_amt = cls.parse_amount(r.get("debit", 0))

            if credit_amt == 0 and debit_amt == 0 and "amount" in r:
                amt = cls.parse_amount(r.get("amount", 0))
                row_type = str(r.get("type", "")).upper()
                if any(x in row_type for x in ("INFLOW", "CREDIT", "CR", "DEPOSIT", "SETTLEMENT")):
                    credit_amt = abs(amt)
                elif any(x in row_type for x in ("OUTFLOW", "DEBIT", "DR", "WITHDRAWAL", "EXPENSE")):
                    debit_amt = abs(amt)
                elif amt > 0:
                    credit_amt = amt
                else:
                    debit_amt = abs(amt)

            # Record Inflows
            if credit_amt > 0:
                settle = Settlement(
                    settlement_id=f"stl_imp_{uuid.uuid4().hex[:10]}",
                    merchant_id=merchant_id,
                    source_transaction_date=row_date - timedelta(days=2),
                    settlement_date=row_date,
                    gross_amount=credit_amt,
                    fees=round(credit_amt * 0.02, 2),
                    taxes=round(credit_amt * 0.02 * 0.18, 2),
                    adjustments=0.0,
                    net_amount=credit_amt,
                    status="SETTLED",
                )
                db.add(settle)

                tx = Transaction(
                    transaction_id=f"tx_imp_{uuid.uuid4().hex[:12]}",
                    merchant_id=merchant_id,
                    timestamp=datetime.combine(row_date, datetime.min.time()),
                    amount=credit_amt,
                    payment_method="BANK_TRANSFER" if any(x in desc.lower() for x in ("neft", "rtgs", "imps", "bank")) else ("UPI" if "upi" in desc.lower() else "NETBANKING"),
                    status="SUCCESS",
                    customer_segment="RETAIL",
                    geography="DOMESTIC",
                    order_value=credit_amt,
                )
                db.add(tx)

                inflows_added += 1
                total_inflow_amt += credit_amt
                if len(preview_rows) < 8:
                    preview_rows.append({
                        "date": str(row_date),
                        "description": desc,
                        "type": "CREDIT",
                        "amount": credit_amt,
                        "balance": final_balance,
                    })

            # Record Outflows
            if debit_amt > 0:
                exp = Expense(
                    expense_id=f"exp_imp_{uuid.uuid4().hex[:10]}",
                    merchant_id=merchant_id,
                    date=row_date,
                    category=desc if desc else "SUPPLIER",
                    amount=debit_amt,
                    recurring=False,
                    priority="HIGH",
                )
                db.add(exp)
                outflows_added += 1
                total_outflow_amt += debit_amt
                if len(preview_rows) < 8:
                    preview_rows.append({
                        "date": str(row_date),
                        "description": desc,
                        "type": "DEBIT",
                        "amount": debit_amt,
                        "balance": final_balance,
                    })

        # Commit ingested transactions to SQLite
        db.commit()

        # Synchronize merchant bank cash balance to the verified closing balance
        new_cash = old_cash
        if final_balance is not None and final_balance > 0:
            if replace_mode:
                net_flow = total_inflow_amt - total_outflow_amt
                merchant.starting_balance = round(final_balance - net_flow, 2)
                db.commit()
                reconciled_ledger = CashflowService.get_merchant_ledger(db, merchant_id)
                new_cash = reconciled_ledger["current_balance"]
            else:
                current_ledger = CashflowService.get_merchant_ledger(db, merchant_id)
                delta = final_balance - current_ledger["current_balance"]
                merchant.starting_balance = round(float(merchant.starting_balance) + delta, 2)
                db.commit()
                reconciled_ledger = CashflowService.get_merchant_ledger(db, merchant_id)
                new_cash = reconciled_ledger["current_balance"]

            # Recalibrate merchant minimum operating cash floor to match the new scale
            merchant.minimum_operating_cash = round(max(300.0, new_cash * 0.35), 2)

            # Adapt obligations if they vastly exceed new balance scale
            active_obs = db.query(Obligation).filter(
                Obligation.merchant_id == merchant_id,
                Obligation.status == "UPCOMING"
            ).all()
            total_active_obs = sum(o.amount for o in active_obs)
            if total_active_obs > new_cash * 1.5 or any(o.amount > new_cash for o in active_obs):
                for o in active_obs:
                    if o.amount > new_cash * 0.40:
                        o.amount = round(max(100.0, new_cash * 0.25), 2)
            db.commit()
        else:
            current_ledger = CashflowService.get_merchant_ledger(db, merchant_id)
            new_cash = current_ledger["current_balance"]


        if final_balance:
            balance_msg = f" Bank closing balance synchronized to ₹{new_cash:,.2f}."
        elif is_upi_detected:
            balance_msg = f" Note: UPI app statement (PhonePe/GPay) parsed without core bank balance column. Live store cash updated to ₹{new_cash:,.2f} based on transaction flow."
        else:
            balance_msg = ""

        return {
            "success": True,
            "merchant_id": merchant_id,
            "filename": filename,
            "is_upi_statement": is_upi_detected,
            "rows_processed": rows_processed,
            "inflows_added": inflows_added,
            "outflows_added": outflows_added,
            "total_inflow_amount": round(total_inflow_amt, 2),
            "total_outflow_amount": round(total_outflow_amt, 2),
            "closing_balance_extracted": final_balance,
            "previous_cash": old_cash,
            "new_cash": new_cash,
            "preview_rows": preview_rows,
            "message": f"Successfully ingested {rows_processed} entries ({filename}): +{inflows_added} credits (₹{total_inflow_amt:,.2f}), -{outflows_added} debits (₹{total_outflow_amt:,.2f}).{balance_msg} Live ledger recalculated.",
        }

    # Backward compatibility wrapper
    @classmethod
    def ingest_statement_csv(cls, db: Session, merchant_id: str, file_contents: bytes) -> Dict[str, Any]:
        return cls.ingest_statement(db, merchant_id, file_contents, filename="statement.csv")
