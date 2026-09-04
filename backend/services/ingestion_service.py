"""
Ingestion Service: Parses and imports merchant statements across multiple formats (CSV, Excel, PDF, TXT)
into the cash ledger and automatically synchronizes the merchant's real bank balance.
"""

import csv
import io
import re
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.models.merchant import Merchant
from backend.models.settlement import Settlement
from backend.models.expense import Expense
from backend.core.exceptions import MerchantNotFoundError


class IngestionService:
    @staticmethod
    def parse_amount(val: Any) -> float:
        """Sanitizes strings like '₹1,50,000.00', '150000', '-500.5' into float."""
        if val is None:
            return 0.0
        s = str(val).strip().replace("₹", "").replace("Rs.", "").replace("Rs", "").replace(",", "").replace(" ", "")
        if not s:
            return 0.0
        try:
            return float(s)
        except ValueError:
            return 0.0

    @staticmethod
    def parse_date(val: Any) -> date:
        """Parses various date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD-Mon-YYYY)."""
        if isinstance(val, (datetime, date)):
            return val if isinstance(val, date) else val.date()
        s = str(val).strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d-%b-%Y", "%d/%m/%y", "%d-%m-%y"):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return date.today()

    @classmethod
    def extract_closing_balance_from_text(cls, text: str) -> Optional[float]:
        """
        Scans raw statement text for explicit closing / available balance lines.
        Examples: 'Closing Balance: 8,85,000.00', 'Available Balance: ₹5,40,000'
        """
        pattern = re.compile(
            r"(?:closing|available|book|net|account|current|ledger|total|clear)\s*balance\s*[:\-]?(?:\s*(?:inr|rs\.?|₹))?\s*([0-9,]+(?:\.[0-9]{1,2})?)",
            re.IGNORECASE,
        )
        matches = pattern.findall(text)
        if matches:
            # Return the last detected closing balance occurrence
            candidate = matches[-1]
            amt = cls.parse_amount(candidate)
            if amt > 0:
                return amt
        return None

    @classmethod
    def ingest_statement(
        cls,
        db: Session,
        merchant_id: str,
        file_contents: bytes,
        filename: str = "statement.csv"
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

        # 1. EXCEL SPREADSHEETS (.xlsx, .xls)
        if ext in ("xlsx", "xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(file_contents), data_only=True)
                ws = wb.active
                all_rows = list(ws.iter_rows(values_only=True))
                if not all_rows:
                    raise ValueError("Excel file is empty.")

                # Locate header row (first row with at least 2 non-empty cells)
                header_idx = 0
                for idx, r in enumerate(all_rows):
                    non_empty = [c for c in r if c is not None and str(c).strip()]
                    if len(non_empty) >= 2:
                        header_idx = idx
                        break

                headers = [str(c).strip().lower() if c is not None else f"col_{i}" for i, c in enumerate(all_rows[header_idx])]

                for r in all_rows[header_idx + 1:]:
                    if not any(r):
                        continue
                    row_dict = {}
                    for col_name, cell_val in zip(headers, r):
                        if cell_val is not None:
                            row_dict[col_name] = str(cell_val).strip()
                    if row_dict:
                        rows_data.append(row_dict)

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

                # Parse tabular lines from PDF text
                # Standard line pattern: Date (DD/MM/YYYY or YYYY-MM-DD) Description ... Amount / Credit / Debit
                lines = [l.strip() for l in pdf_text.splitlines() if l.strip()]
                for line in lines:
                    # Look for date at the start
                    date_match = re.match(r"^(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{2,4})", line)
                    if date_match:
                        date_str = date_match.group(1)
                        # Extract all numbers from line
                        numbers = re.findall(r"(?:₹|Rs\.?)?\s*([0-9,]+\.[0-9]{2})", line)
                        if numbers:
                            # If multiple numbers: usually [Withdrawal/Debit, Deposit/Credit, Balance]
                            amounts = [cls.parse_amount(n) for n in numbers if cls.parse_amount(n) > 0]
                            desc = line[len(date_str):].strip()
                            if amounts:
                                if "cr" in line.lower() or "deposit" in line.lower() or "payout" in line.lower() or "settlement" in line.lower():
                                    rows_data.append({"date": date_str, "description": desc, "credit": amounts[0]})
                                elif "dr" in line.lower() or "withdraw" in line.lower() or "debit" in line.lower() or "transfer" in line.lower():
                                    rows_data.append({"date": date_str, "description": desc, "debit": amounts[0]})
                                else:
                                    # Fallback: assume inflow if positive
                                    rows_data.append({"date": date_str, "description": desc, "amount": amounts[0], "type": "INFLOW"})

            except Exception as e:
                raise ValueError(f"Failed to parse PDF statement: {str(e)}")

        # 3. CSV / TEXT STATEMENTS (.csv, .txt)
        else:
            decoded_text = file_contents.decode("utf-8-sig", errors="replace")
            raw_text_for_summary = decoded_text
            extracted_balance = cls.extract_closing_balance_from_text(decoded_text)

            text_stream = io.StringIO(decoded_text)
            reader = csv.DictReader(text_stream)

            if reader.fieldnames:
                for row in reader:
                    cleaned_row = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
                    if any(cleaned_row.values()):
                        rows_data.append(cleaned_row)

        if not rows_data:
            # If no tabular rows were extracted but an explicit closing balance was found in PDF/text
            if extracted_balance and extracted_balance > 0:
                from backend.services.cashflow_service import CashflowService
                ledger = CashflowService.get_merchant_ledger(db, merchant_id)
                old_cash = ledger["current_balance"]
                delta = extracted_balance - old_cash
                merchant.starting_balance = round(float(merchant.starting_balance) + delta, 2)
                db.commit()
                return {
                    "success": True,
                    "merchant_id": merchant_id,
                    "rows_processed": 0,
                    "inflows_added": 0,
                    "outflows_added": 0,
                    "total_inflow_amount": 0.0,
                    "total_outflow_amount": 0.0,
                    "closing_balance_extracted": extracted_balance,
                    "previous_cash": old_cash,
                    "new_cash": extracted_balance,
                    "message": f"Successfully parsed statement. Extracted closing bank balance of ₹{extracted_balance:,.2f}. Updated current available cash from ₹{old_cash:,.2f} to ₹{extracted_balance:,.2f}.",
                }
            raise ValueError("No transaction entries could be extracted from the file. Please check file format.")

        # Process Extracted Rows into Database
        rows_processed = 0
        inflows_added = 0
        outflows_added = 0
        total_inflow_amt = 0.0
        total_outflow_amt = 0.0

        for r in rows_data:
            rows_processed += 1

            # Check for running balance column
            for bal_key in ("balance", "closing balance", "running balance", "net balance"):
                if bal_key in r and r[bal_key]:
                    val = cls.parse_amount(r[bal_key])
                    if val > 0:
                        extracted_balance = val  # keep updating to latest row balance

            # Strategy 1: Separate Credit and Debit columns
            if "credit" in r or "debit" in r:
                row_date = cls.parse_date(r.get("date", date.today()))
                credit_amt = cls.parse_amount(r.get("credit", 0))
                debit_amt = cls.parse_amount(r.get("debit", 0))
                desc = r.get("description", r.get("narration", r.get("particulars", "Bank Statement Entry")))

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
                    inflows_added += 1
                    total_inflow_amt += credit_amt

                if debit_amt > 0:
                    exp = Expense(
                        expense_id=f"exp_imp_{uuid.uuid4().hex[:10]}",
                        merchant_id=merchant_id,
                        date=row_date,
                        category="SUPPLIER" if "supp" in str(desc).lower() else "OTHER",
                        amount=debit_amt,
                        recurring=False,
                        priority="HIGH",
                    )
                    db.add(exp)
                    outflows_added += 1
                    total_outflow_amt += debit_amt

            # Strategy 2: Amount + Type
            elif "amount" in r:
                row_date = cls.parse_date(r.get("date", r.get("settlement_date", date.today())))
                amt = cls.parse_amount(r.get("amount", 0))
                row_type = str(r.get("type", r.get("transaction_type", "INFLOW"))).upper()
                desc = r.get("description", r.get("category", "Imported Entry"))

                if any(x in row_type for x in ("INFLOW", "CREDIT", "SETTLEMENT", "DEPOSIT", "CR")):
                    settle = Settlement(
                        settlement_id=f"stl_imp_{uuid.uuid4().hex[:10]}",
                        merchant_id=merchant_id,
                        source_transaction_date=row_date - timedelta(days=2),
                        settlement_date=row_date,
                        gross_amount=amt,
                        fees=round(amt * 0.02, 2),
                        taxes=round(amt * 0.02 * 0.18, 2),
                        adjustments=0.0,
                        net_amount=amt,
                        status="SETTLED",
                    )
                    db.add(settle)
                    inflows_added += 1
                    total_inflow_amt += amt
                else:
                    exp = Expense(
                        expense_id=f"exp_imp_{uuid.uuid4().hex[:10]}",
                        merchant_id=merchant_id,
                        date=row_date,
                        category="SUPPLIER" if "supp" in str(desc).lower() else "OTHER",
                        amount=abs(amt),
                        recurring=False,
                        priority="HIGH",
                    )
                    db.add(exp)
                    outflows_added += 1
                    total_outflow_amt += abs(amt)

        # Synchronize merchant bank cash balance if closing balance was extracted
        from backend.services.cashflow_service import CashflowService
        ledger_before = CashflowService.get_merchant_ledger(db, merchant_id)
        old_cash = ledger_before["current_balance"]
        new_cash = old_cash

        if extracted_balance is not None and extracted_balance > 0:
            # Reconcile starting balance so the ledger ending cash matches extracted bank balance
            delta = extracted_balance - (old_cash + total_inflow_amt - total_outflow_amt)
            merchant.starting_balance = round(float(merchant.starting_balance) + delta, 2)
            new_cash = extracted_balance

        db.commit()

        balance_msg = f" Bank closing balance synchronized to ₹{new_cash:,.2f}." if extracted_balance else ""

        return {
            "success": True,
            "merchant_id": merchant_id,
            "filename": filename,
            "rows_processed": rows_processed,
            "inflows_added": inflows_added,
            "outflows_added": outflows_added,
            "total_inflow_amount": total_inflow_amt,
            "total_outflow_amount": total_outflow_amt,
            "closing_balance_extracted": extracted_balance,
            "previous_cash": old_cash,
            "new_cash": new_cash,
            "message": f"Successfully ingested {rows_processed} entries ({filename}): +{inflows_added} settlements (₹{total_inflow_amt:,.2f}), -{outflows_added} expenses (₹{total_outflow_amt:,.2f}).{balance_msg} Ledger and buffers recalculated.",
        }

    # Backward compatibility wrapper
    @classmethod
    def ingest_statement_csv(cls, db: Session, merchant_id: str, file_contents: bytes) -> Dict[str, Any]:
        return cls.ingest_statement(db, merchant_id, file_contents, filename="statement.csv")
