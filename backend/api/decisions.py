import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.models.decision import Decision
from backend.services.decision_service import DecisionEngineService
from backend.services.explanation_service import ExplanationService
from backend.ml.evaluation import EvaluationEngine
from backend.api.schemas import (
    DecisionRequest,
    DecisionResponse,
    CopilotRequest,
    CopilotResponse,
    ModelEvaluationResponse,
)

router = APIRouter(tags=["Decisions & Intelligence"])


@router.post("/merchants/{merchant_id}/decision", response_model=DecisionResponse)
def evaluate_financial_decision(
    merchant_id: str,
    request: DecisionRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluates proposed financial commitments (e.g. ₹2,00,000 inventory purchase tomorrow).
    Performs: FORECAST -> DIAGNOSE -> SIMULATE -> DECIDE -> EXPLAIN.
    Returns SAFE / CAUTION / HIGH_RISK / INSUFFICIENT_CONFIDENCE.
    """
    try:
        decision_result = DecisionEngineService.evaluate_commitment(db, merchant_id, request)
        return decision_result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/merchants/{merchant_id}/decisions")
def list_merchant_decision_audit(
    merchant_id: str,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Returns immutable audit trail of past evaluated decisions."""
    decisions = (
        db.query(Decision)
        .filter(Decision.merchant_id == merchant_id)
        .order_by(Decision.timestamp.desc())
        .limit(limit)
        .all()
    )
    result = []
    for d in decisions:
        result.append({
            "decision_id": d.decision_id,
            "merchant_id": d.merchant_id,
            "timestamp": d.timestamp,
            "requested_action": d.requested_action,
            "decision": d.decision,
            "confidence": d.confidence,
            "evidence": json.loads(d.evidence) if d.evidence else [],
            "assumptions": json.loads(d.assumptions) if d.assumptions else [],
            "recommendation": d.recommendation,
            "model_version": d.model_version,
        })
    return result


@router.post("/merchants/{merchant_id}/copilot", response_model=CopilotResponse)
def ask_ai_copilot(
    merchant_id: str,
    request: CopilotRequest,
    db: Session = Depends(get_db),
):
    """
    Fintech Copilot Natural Language Interface.
    Translates merchant questions to structured intents and returns evidence-grounded commentary.
    """
    try:
        response = ExplanationService.process_copilot_query(db, merchant_id, request.question)
        return response
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/models/evaluation")
def get_model_evaluations():
    """
    Returns empirical evaluation benchmarks comparing Baselines 1, 2, 3
    against Proposed Decision Engine with asymmetric financial loss weighting.
    """
    return EvaluationEngine.evaluate_decision_engine_benchmarks()
