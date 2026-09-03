from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.services.scenario_service import ScenarioService
from backend.api.schemas import ScenarioRequest, ScenarioResponse

router = APIRouter(prefix="/merchants", tags=["Scenarios"])


@router.post("/{merchant_id}/scenario", response_model=ScenarioResponse)
def simulate_merchant_scenario(
    merchant_id: str,
    params: ScenarioRequest,
    db: Session = Depends(get_db),
):
    """
    Simulates what-if stress scenarios:
    revenue change (%), refund change (%), settlement delay (days), and proposed commitments.
    """
    try:
        scenario_result = ScenarioService.simulate_scenario(db, merchant_id, params)
        return scenario_result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
