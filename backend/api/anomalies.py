from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.services.anomaly_service import AnomalyService
from backend.api.schemas import AnomalyResponse

router = APIRouter(prefix="/merchants", tags=["Anomalies"])


@router.get("/{merchant_id}/anomalies", response_model=AnomalyResponse)
def get_merchant_anomalies(merchant_id: str, db: Session = Depends(get_db)):
    """
    Returns detected financial behavior anomalies (revenue drops, refund spikes,
    settlement delays, expense surges) and normalized risk radar components.
    """
    try:
        anomalies = AnomalyService.get_merchant_anomalies(db, merchant_id)
        return anomalies
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
