from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.services.cashflow_service import CashflowService
from backend.api.schemas import CashflowResponse

router = APIRouter(prefix="/merchants", tags=["Cashflow"])


@router.get("/{merchant_id}/cashflow", response_model=CashflowResponse)
def get_merchant_cashflow(merchant_id: str, db: Session = Depends(get_db)):
    """Returns chronological daily cash ledger entries, beginning/ending cash, and net flow."""
    try:
        ledger = CashflowService.get_merchant_ledger(db, merchant_id)
        return ledger
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
