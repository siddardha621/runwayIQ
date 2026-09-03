from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.services.forecast_service import ForecastService
from backend.api.schemas import ForecastResponse

router = APIRouter(prefix="/merchants", tags=["Forecasts"])


@router.get("/{merchant_id}/forecast", response_model=ForecastResponse)
def get_merchant_forecast(
    merchant_id: str,
    horizon_days: int = Query(30, ge=7, le=90),
    confidence_level: float = Query(0.85, ge=0.50, le=0.99),
    db: Session = Depends(get_db),
):
    """
    Returns 30-day cash flow forecast with uncertainty prediction interval bands
    and dynamic operating buffer thresholds.
    """
    try:
        forecast = ForecastService.generate_forecast(
            db=db,
            merchant_id=merchant_id,
            horizon_days=horizon_days,
            confidence_level=confidence_level,
        )
        return forecast
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
