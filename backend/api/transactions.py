from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.models.transaction import Transaction
from backend.services.ingestion_service import IngestionService

router = APIRouter(prefix="/merchants", tags=["Transactions"])


@router.get("/{merchant_id}/transactions")
def get_merchant_transactions(
    merchant_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Returns recent transactions for a merchant."""
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


@router.post("/{merchant_id}/upload-statement")
async def upload_merchant_statement(
    merchant_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload and parse an external bank or gateway statement (PDF, Excel, CSV, TXT).
    Automatically updates the merchant's cash ledger, synchronizes bank balance, and recalibrates buffers.
    """
    allowed_extensions = (".csv", ".txt", ".xlsx", ".xls", ".pdf")
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Please upload a statement in {', '.join(allowed_extensions)} format.",
        )

    try:
        contents = await file.read()
        result = IngestionService.ingest_statement(db, merchant_id, contents, filename=file.filename)
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

