from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.models.transaction import Transaction
from backend.models.merchant import Merchant
from backend.models.settlement import Settlement
from backend.models.expense import Expense
from backend.services.ingestion_service import IngestionService
from backend.services.cashflow_service import CashflowService

router = APIRouter(prefix="/merchants", tags=["Transactions"])


@router.get("/{merchant_id}/transactions")
def get_merchant_transactions(
    merchant_id: str,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Returns recent raw transactions for a merchant."""
    txns = (
        db.query(Transaction)
        .filter(Transaction.merchant_id == merchant_id)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "transaction_id": t.transaction_id,
            "timestamp": t.timestamp,
            "amount": t.amount,
            "payment_method": t.payment_method,
            "status": t.status,
            "customer_segment": t.customer_segment,
            "order_value": t.order_value,
        }
        for t in txns
    ]


@router.get("/{merchant_id}/statement-history")
def get_merchant_statement_history(
    merchant_id: str,
    limit: int = Query(250, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Returns unified chronological bank statement records (both credits and debits)
    with descriptions, amounts, running balances, and statement statistics.
    """
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    ledger = CashflowService.get_merchant_ledger(db, merchant_id)
    ref_date = ledger["as_of_date"]

    settlements = (
        db.query(Settlement)
        .filter(
            Settlement.merchant_id == merchant_id,
            Settlement.settlement_date <= ref_date,
            Settlement.status == "SETTLED",
        )
        .all()
    )
    expenses = (
        db.query(Expense)
        .filter(
            Expense.merchant_id == merchant_id,
            Expense.date <= ref_date,
        )
        .all()
    )

    entries = []
    for s in settlements:
        entries.append({
            "id": s.settlement_id,
            "date": str(s.settlement_date),
            "date_obj": s.settlement_date,
            "description": "Settlement Payout / Bank Credit" if "stl_imp" not in s.settlement_id else "Imported Bank Settlement",
            "type": "CREDIT",
            "category": "SETTLEMENT",
            "amount": round(float(s.net_amount), 2),
        })

    for e in expenses:
        entries.append({
            "id": e.expense_id,
            "date": str(e.date),
            "date_obj": e.date,
            "description": e.category if e.category else "Operating Outflow",
            "type": "DEBIT",
            "category": e.category or "OPERATING",
            "amount": round(float(e.amount), 2),
        })

    # Sort chronologically by date
    entries.sort(key=lambda x: x["date_obj"])

    # Calculate running balance starting from merchant's starting balance
    curr_balance = float(merchant.starting_balance)
    total_credits = 0.0
    total_debits = 0.0
    for item in entries:
        if item["type"] == "CREDIT":
            curr_balance += item["amount"]
            total_credits += item["amount"]
        else:
            curr_balance -= item["amount"]
            total_debits += item["amount"]
        item["balance"] = round(curr_balance, 2)
        del item["date_obj"]

    # Reverse to show newest transactions first
    display_entries = list(reversed(entries))[:limit]

    return {
        "merchant_id": merchant_id,
        "business_name": merchant.business_name,
        "starting_balance": float(merchant.starting_balance),
        "current_balance": round(curr_balance, 2),
        "total_credits": round(total_credits, 2),
        "total_debits": round(total_debits, 2),
        "total_entries": len(entries),
        "entries": display_entries,
    }


@router.post("/{merchant_id}/upload-statement")
async def upload_merchant_statement(
    merchant_id: str,
    file: UploadFile = File(...),
    closing_balance: Optional[float] = Form(None),
    replace_mode: bool = Form(False),
    db: Session = Depends(get_db),
):
    """
    Upload and parse an external bank or gateway statement (PDF, Excel, CSV, TXT).
    Automatically updates the merchant's cash ledger, synchronizes bank balance, and recalibrates buffers.
    If replace_mode is True, replaces existing ledger history with this statement.
    """
    allowed_extensions = (".csv", ".txt", ".xlsx", ".xls", ".pdf")
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Please upload a statement in {', '.join(allowed_extensions)} format.",
        )

    try:
        contents = await file.read()
        result = IngestionService.ingest_statement(
            db,
            merchant_id,
            contents,
            filename=file.filename,
            manual_balance=closing_balance,
            replace_mode=replace_mode,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
