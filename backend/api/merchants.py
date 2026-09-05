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
    CreateObligationRequest,
    UpdateObligationRequest,
    LoginOrRegisterRequest,
    LoginResponse,
    ResetPasswordRequest,
    UpdateBalanceRequest,
    UpdateBalanceResponse,
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

    # Clean institutional rounding helper for KPI estimates
    def _clean_round_kpi(val: float) -> float:
        if val <= 0:
            return 0.0
        if val < 500:
            return float(round(round(val / 10.0) * 10.0))
        elif val < 5000:
            return float(round(round(val / 50.0) * 50.0))
        elif val < 50000:
            return float(round(round(val / 100.0) * 100.0))
        else:
            return float(round(round(val / 500.0) * 500.0))

    # Sum 30-day expected inflows and outflows
    exp_inflows = _clean_round_kpi(sum(p["predicted_inflow"] for p in forecast["points"]))
    exp_outflows = _clean_round_kpi(sum(p["predicted_outflow"] for p in forecast["points"]))

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


@router.post("/{merchant_id}/obligations", response_model=ObligationResponse)
def create_obligation(merchant_id: str, request: CreateObligationRequest, db: Session = Depends(get_db)):
    """Creates a new scheduled obligation (e.g. Payroll, Tax, Rent, Supplier invoice)."""
    import uuid
    from datetime import datetime
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail=f"Merchant {merchant_id} not found.")

    valid_categories = ["PAYROLL", "TAX", "RENT", "SUPPLIER", "LOAN", "INVENTORY", "UTILITIES", "OTHER"]
    cat = request.category.upper() if request.category.upper() in valid_categories else "OTHER"
    
    valid_priorities = ["MANDATORY", "HIGH", "MEDIUM", "DISCRETIONARY"]
    prio = request.priority.upper() if request.priority.upper() in valid_priorities else "MANDATORY"

    ob_id = f"ob_{merchant_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:4]}"
    
    new_ob = Obligation(
        obligation_id=ob_id,
        merchant_id=merchant_id,
        due_date=request.due_date,
        amount=round(float(request.amount), 2),
        category=cat,
        priority=prio,
        recurring=request.recurring,
        status="UPCOMING",
    )
    db.add(new_ob)
    db.commit()
    db.refresh(new_ob)

    return {
        "obligation_id": new_ob.obligation_id,
        "due_date": new_ob.due_date,
        "amount": new_ob.amount,
        "category": new_ob.category,
        "priority": new_ob.priority,
        "status": new_ob.status,
        "recurring": new_ob.recurring,
        "risk_contribution_pct": 100.0,
    }


@router.delete("/{merchant_id}/obligations/{obligation_id}")
def delete_obligation(merchant_id: str, obligation_id: str, db: Session = Depends(get_db)):
    """Deletes or cancels a scheduled obligation."""
    ob = db.query(Obligation).filter(
        Obligation.merchant_id == merchant_id,
        Obligation.obligation_id == obligation_id
    ).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    db.delete(ob)
    db.commit()
    return {"status": "SUCCESS", "message": f"Obligation {obligation_id} removed."}


@router.put("/{merchant_id}/obligations/{obligation_id}", response_model=ObligationResponse)
def update_obligation(
    merchant_id: str,
    obligation_id: str,
    request: UpdateObligationRequest,
    db: Session = Depends(get_db)
):
    """Updates an existing scheduled obligation (amount, due date, category, priority, recurring)."""
    ob = db.query(Obligation).filter(
        Obligation.merchant_id == merchant_id,
        Obligation.obligation_id == obligation_id
    ).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    if request.category is not None:
        valid_categories = ["PAYROLL", "TAX", "RENT", "SUPPLIER", "LOAN", "INVENTORY", "UTILITIES", "MARKETING", "OTHER"]
        ob.category = request.category.upper() if request.category.upper() in valid_categories else "OTHER"
    if request.amount is not None:
        ob.amount = round(float(request.amount), 2)
    if request.due_date is not None:
        ob.due_date = request.due_date
    if request.priority is not None:
        valid_priorities = ["MANDATORY", "HIGH", "MEDIUM", "DISCRETIONARY"]
        ob.priority = request.priority.upper() if request.priority.upper() in valid_priorities else "MANDATORY"
    if request.recurring is not None:
        ob.recurring = request.recurring
    if request.status is not None:
        valid_statuses = ["UPCOMING", "PAID", "CANCELLED"]
        ob.status = request.status.upper() if request.status.upper() in valid_statuses else "UPCOMING"

    db.commit()
    db.refresh(ob)

    return {
        "obligation_id": ob.obligation_id,
        "due_date": ob.due_date,
        "amount": ob.amount,
        "category": ob.category,
        "priority": ob.priority,
        "status": ob.status,
        "recurring": ob.recurring,
        "risk_contribution_pct": 100.0,
    }


@router.post("/{merchant_id}/update-balance", response_model=UpdateBalanceResponse)
def update_merchant_balance(
    merchant_id: str,
    request: UpdateBalanceRequest,
    db: Session = Depends(get_db)
):
    """
    Directly updates merchant bank cash balance, auto-recalibrating the dynamic
    safety reserve buffer and working capital forecasting horizon.
    """
    merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail=f"Merchant {merchant_id} not found.")

    target_bal = round(float(request.new_balance), 2)
    if target_bal < 0:
        raise HTTPException(status_code=400, detail="Bank balance cannot be negative.")

    # 1. Adjust starting balance to reconcile ledger
    ledger = CashflowService.get_merchant_ledger(db, merchant_id)
    current_cash = ledger["current_balance"]
    delta = target_bal - current_cash
    merchant.starting_balance = round(float(merchant.starting_balance) + delta, 2)

    # 2. Recalibrate minimum operating cash floor to match scale
    merchant.minimum_operating_cash = round(max(300.0, target_bal * 0.35), 2)

    # 3. Adapt obligations if they vastly exceed target balance
    obs = db.query(Obligation).filter(
        Obligation.merchant_id == merchant_id,
        Obligation.status == "UPCOMING"
    ).all()
    total_ob = sum(o.amount for o in obs)
    if total_ob > target_bal * 1.5 or any(o.amount > target_bal for o in obs):
        for o in obs:
            if o.amount > target_bal * 0.40:
                o.amount = round(max(100.0, target_bal * 0.25), 2)

    db.commit()

    # 4. Generate updated summary
    updated_summary = get_merchant_summary(merchant_id, db)
    return {
        "success": True,
        "merchant_id": merchant_id,
        "previous_cash": current_cash,
        "new_cash": target_bal,
        "minimum_operating_cash": updated_summary["minimum_operating_cash"],
        "expected_inflows_30d": updated_summary["expected_inflows_30d"],
        "expected_outflows_30d": updated_summary["expected_outflows_30d"],
        "message": f"Successfully updated live cash to ₹{target_bal:,.2f}. Safety buffer recalibrated to ₹{updated_summary['minimum_operating_cash']:,.2f}."
    }


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
    if "@" not in normalized_email:
        normalized_email = f"{normalized_email}@gmail.com"
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

        # Seed starter scheduled bills for new store (e.g. GST tax and utility bill)
        starter_obs = [
            Obligation(
                obligation_id=f"ob_{merchant_id}_tax",
                merchant_id=merchant_id,
                due_date=date(2026, 9, 20),
                amount=500.0,
                category="TAX",
                priority="MANDATORY",
                recurring=True,
                status="UPCOMING",
            ),
            Obligation(
                obligation_id=f"ob_{merchant_id}_util",
                merchant_id=merchant_id,
                due_date=date(2026, 9, 12),
                amount=350.0,
                category="UTILITIES",
                priority="HIGH",
                recurring=True,
                status="UPCOMING",
            ),
        ]
        db.bulk_save_objects(starter_obs)
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
    if "@" not in normalized_email:
        normalized_email = f"{normalized_email}@gmail.com"
    auth_entry = db.query(UserAuth).filter(UserAuth.email == normalized_email).first()
    if not auth_entry:
        raise HTTPException(status_code=404, detail=f"No account found for '{normalized_email}'.")
    if len(request.new_password) < 4:
        raise HTTPException(status_code=422, detail="Password must be at least 4 characters long.")

    auth_entry.password_hash = hash_password(request.new_password)
    db.commit()
    return {"success": True, "message": f"Password for '{normalized_email}' has been successfully updated."}

