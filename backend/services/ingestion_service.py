"""
Ingestion Service: Parses and imports merchant statements (CSV) into the ledger.
Supports Razorpay settlement exports, standard bank CSV statements, and simple cash-flow logs.
"""

import csv
import io
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.models.merchant import Merchant
from backend.models.settlement import Settlement
from backend.models.transaction import Transaction
from backend.models.expense import Expense
from backend.core.exceptions import MerchantNotFoundError


class IngestionService:
    @staticmethod
    def parse_amount(val: Any) -> float:
        """Sanitizes strings like '₹1,50,000.00', '150000', '-500.5' into float."""
        if val is None:
            return 0.0
        s = str(val).strip().replace("₹", "").replace(",", "").replace(" ", "")
        if not s:
            return 0.0
        try:
            return float(s)
        except ValueError:
            return 0.0

    @staticmethod
    def parse_date(val: Any) -> date:
        """Parses various date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)."""
        s = str(val).strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d-%b-%Y"):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return date.today()

    @classmethod
    def ingest_statement_csv(cls, db: Session, merchant_id: str, file_contents: bytes) -> Dict[str, Any]:
        """
        Parses CSV contents, identifies row format, and inserts realized settlements or expenses.
        """
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if not merchant:
            raise MerchantNotFoundError(f"Merchant {merchant_id} not found.")

        text_stream = io.StringIO(file_contents.decode("utf-8-sig", errors="replace"))
        reader = csv.DictReader(text_stream)

        if not reader.fieldnames:
            raise ValueError("Empty or invalid CSV file. No headers found.")

        # Normalize headers to lowercase
        headers_lower = {h.strip().lower(): h for h in reader.fieldnames if h}

        rows_processed = 0
        inflows_added = 0
        outflows_added = 0
        total_inflow_amt = 0.0
        total_outflow_amt = 0.0

        for row in reader:
            rows_processed += 1
            # Clean row keys to lower
            r = {k.strip().lower(): v.strip() for k, v in row.items() if k}

            # Strategy 1: Check for separate Credit / Debit columns (Bank statement style)
            if "credit" in r or "debit" in r:
                row_date = cls.parse_date(r.get("date", date.today()))
                credit_amt = cls.parse_amount(r.get("credit", 0))
                debit_amt = cls.parse_amount(r.get("debit", 0))
                desc = r.get("description", r.get("narration", "Bank Statement Entry"))

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
                        category="SUPPLIER" if "supp" in desc.lower() else "OTHER",
                        amount=debit_amt,
                        recurring=False,
                        priority="HIGH",
                    )
                    db.add(exp)
                    outflows_added += 1
                    total_outflow_amt += debit_amt

            # Strategy 2: Check for Amount + Type (e.g. INFLOW/OUTFLOW or CREDIT/DEBIT)
            elif "amount" in r:
                row_date = cls.parse_date(r.get("date", r.get("settlement_date", date.today())))
                amt = cls.parse_amount(r.get("amount", 0))
                row_type = r.get("type", r.get("transaction_type", "INFLOW")).upper()
                desc = r.get("description", r.get("category", "Imported Entry"))

                if "INFLOW" in row_type or "CREDIT" in row_type or "SETTLEMENT" in row_type:
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
                        category="SUPPLIER" if "supp" in desc.lower() else "OTHER",
                        amount=abs(amt),
                        recurring=False,
                        priority="HIGH",
                    )
                    db.add(exp)
                    outflows_added += 1
                    total_outflow_amt += abs(amt)

        db.commit()

        return {
            "success": True,
            "merchant_id": merchant_id,
            "rows_processed": rows_processed,
            "inflows_added": inflows_added,
            "outflows_added": outflows_added,
            "total_inflow_amount": total_inflow_amt,
            "total_outflow_amount": total_outflow_amt,
            "message": f"Successfully processed {rows_processed} entries from statement: +{inflows_added} settlements (₹{total_inflow_amt:,.2f}), -{outflows_added} expenses (₹{total_outflow_amt:,.2f}). Ledger and buffers have been recalculated.",
        }
