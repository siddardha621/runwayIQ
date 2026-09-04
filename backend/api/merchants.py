from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models.database import get_db
from backend.models.merchant import Merchant
from backend.models.obligation import Obligation
from backend.services.cashflow_service import CashflowService
from backend.services.forecast_service import ForecastService
from backend.services.anomaly_service import AnomalyService
from backend.api.schemas import (
    MerchantResponse,
    MerchantSummaryResponse,
    DataQualityResponse,
    ObligationResponse,
    LoginOrRegisterRequest,
    LoginResponse,
    ResetPasswordRequest,
)
from backend.core.constants import RiskLevel

router = APIRouter(prefix="/merchants", tags=["Merchants"])


@router.get("", response_model=List[MerchantResponse])
def list_merchants(db: Session = Depends(get_db)):
    """List all registered merchants across different behavior archetypes."""
    merchants = db.query(Merchant).all()
    return merchants


@router.get("/{merchant_id}", response_model=MerchantResponse)
def get_merchant(merchant_id: str, db: Session = Depends(get_db)):
    """Get single merchant details by ID."""
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail=f"Merchant {merchant_id} not found.")
    return merchant


@router.get("/{merchant_id}/summary", response_model=MerchantSummaryResponse)
def get_merchant_summary(merchant_id: str, db: Session = Depends(get_db)):
    """
    Returns executive KPI cards:
    Current cash, expected inflows/outflows, dynamic operating buffer,
    projected minimum cash point, overall risk level, confidence, and data quality.
    """
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail=f"Merchant {merchant_id} not found.")

    ledger = CashflowService.get_merchant_ledger(db, merchant_id)
    current_cash = ledger["current_balance"]
    ref_date = ledger["as_of_date"]

    # Forecast and Dynamic Buffer
    forecast = ForecastService.generate_forecast(db, merchant_id, horizon_days=30, as_of_date=ref_date)
    buffer = forecast["dynamic_buffer_details"]["effective_buffer"]
    projected_min = forecast["projected_min_cash"]
    projected_date = forecast["projected_min_cash_date"]
    confidence = forecast["confidence"]

    # Sum 30-day expected inflows and outflows
    exp_inflows = sum(p["predicted_inflow"] for p in forecast["points"])
    exp_outflows = sum(p["predicted_outflow"] for p in forecast["points"])

    # Anomalies
    anomaly_data = AnomalyService.get_merchant_anomalies(db, merchant_id, as_of_date=ref_date)
    anom_count = len(anomaly_data["anomalies"])

    # Data Quality
    dq = CashflowService.calculate_data_quality_score(db, merchant_id, as_of_date=ref_date)

    # Obligations
    ob_total = db.query(func.sum(Obligation.amount)).filter(
        Obligation.merchant_id == merchant_id,
        Obligation.due_date >= ref_date,
        Obligation.status == "UPCOMING"
    ).scalar() or 0.0

    # Risk level classification for current baseline state
    if dq["history_days"] < 14:
        risk_level = RiskLevel.MODERATE  # Insufficient history
    elif projected_min < 0:
        risk_level = RiskLevel.CRITICAL
    elif projected_min < buffer:
        risk_level = RiskLevel.HIGH
    elif projected_min < (buffer * 1.20) or anom_count > 0:
        risk_level = RiskLevel.MODERATE
    else:
        risk_level = RiskLevel.LOW

    return {
        "merchant_id": merchant.merchant_id,
        "business_name": merchant.business_name,
        "business_type": merchant.business_type,
        "current_cash": current_cash,
        "expected_inflows_30d": round(exp_inflows, 2),
        "expected_outflows_30d": round(exp_outflows, 2),
        "minimum_operating_cash": buffer,
        "projected_min_cash": projected_min,
        "projected_min_cash_date": projected_date,
        "risk_level": risk_level,
        "forecast_confidence": confidence,
        "data_quality_score": dq["overall_score"],
        "active_anomalies_count": anom_count,
        "pending_obligations_total": round(ob_total, 2),
    }


@router.get("/{merchant_id}/data-quality", response_model=DataQualityResponse)
def get_data_quality(merchant_id: str, db: Session = Depends(get_db)):
    """Returns data quality breakdown and factors (history depth, completeness, reconciliation)."""
    return CashflowService.calculate_data_quality_score(db, merchant_id)


@router.get("/{merchant_id}/obligations", response_model=List[ObligationResponse])
def get_obligations(merchant_id: str, db: Session = Depends(get_db)):
    """Returns upcoming obligations sorted by due date with risk contribution weight."""
    ref_date = date(2026, 9, 2)
    obs = db.query(Obligation).filter(
        Obligation.merchant_id == merchant_id,
        Obligation.due_date >= ref_date,
        Obligation.status == "UPCOMING"
    ).order_by(Obligation.due_date.asc()).all()

    total_amt = sum(o.amount for o in obs) or 1.0

    result = []
    for o in obs:
        risk_contrib = round((o.amount / total_amt) * 100, 1)
        result.append({
            "obligation_id": o.obligation_id,
            "due_date": o.due_date,
            "amount": o.amount,
            "category": o.category,
            "priority": o.priority,
            "status": o.status,
            "recurring": o.recurring,
            "risk_contribution_pct": risk_contrib,
        })
    return result


@router.post("/login-or-register", response_model=LoginResponse)
def login_or_register_merchant(request: LoginOrRegisterRequest, db: Session = Depends(get_db)):
    """
    Authenticates an existing merchant or registers a new merchant account with any valid real email (Gmail, etc.).
    If the account does not exist, automatically creates a dedicated merchant store in SQLite.
    """
    import re
    import uuid
    from backend.models.auth import UserAuth, hash_password

    normalized_email = request.email.strip().lower()
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(email_regex, normalized_email):
        raise HTTPException(status_code=422, detail="Invalid email format. Please provide a valid email address.")

    auth_entry = db.query(UserAuth).filter(UserAuth.email == normalized_email).first()

    if auth_entry:
        if not auth_entry.verify_password(request.password):
            raise HTTPException(status_code=401, detail="Incorrect password for this account. Click 'Forgot key?' to reset.")
        merchant = db.query(Merchant).filter(Merchant.merchant_id == auth_entry.merchant_id).first()
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant store profile not found.")
        return {
            "merchant_id": merchant.merchant_id,
            "business_name": merchant.business_name,
            "business_type": merchant.business_type,
            "email": normalized_email,
            "role": auth_entry.role,
            "is_new": False,
            "message": f"Welcome back, {merchant.business_name}!",
        }
    else:
        email_prefix = normalized_email.split("@")[0]
        clean_slug = re.sub(r"[^a-zA-Z0-9]", "_", email_prefix).strip("_")
        merchant_id = f"merch_{clean_slug}"

        existing_m = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if existing_m:
            merchant_id = f"merch_{clean_slug}_{uuid.uuid4().hex[:6]}"

        clean_name = request.business_name.strip() if request.business_name else f"{email_prefix.capitalize()}'s Store"
        clean_type = request.business_type.strip() if request.business_type else "Retail & E-commerce"
        starting_bal = float(request.initial_balance) if request.initial_balance is not None and float(request.initial_balance) >= 0 else 2000.0

        new_merchant = Merchant(
            merchant_id=merchant_id,
            business_name=clean_name,
            business_type=clean_type,
            starting_balance=starting_bal,
            minimum_operating_cash=1000.0,
            settlement_cycle="T+1",
            currency="INR",
        )
        db.add(new_merchant)
        db.commit()

        new_auth = UserAuth(
            email=normalized_email,
            merchant_id=merchant_id,
            password_hash=hash_password(request.password),
            role="Merchant Administrator",
        )
        db.add(new_auth)
        db.commit()

        return {
            "merchant_id": merchant_id,
            "business_name": clean_name,
            "business_type": clean_type,
            "email": normalized_email,
            "role": "Merchant Administrator",
            "is_new": True,
            "message": f"Account successfully created for {normalized_email}! Live store initialized.",
        }


@router.post("/reset-password")
def reset_merchant_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Resets password for any registered email."""
    from backend.models.auth import UserAuth, hash_password
    normalized_email = request.email.strip().lower()
    auth_entry = db.query(UserAuth).filter(UserAuth.email == normalized_email).first()
    if not auth_entry:
        raise HTTPException(status_code=404, detail=f"No account found for '{normalized_email}'.")
    if len(request.new_password) < 4:
        raise HTTPException(status_code=422, detail="Password must be at least 4 characters long.")

    auth_entry.password_hash = hash_password(request.new_password)
    db.commit()
    return {"success": True, "message": f"Password for '{normalized_email}' has been successfully updated."}

