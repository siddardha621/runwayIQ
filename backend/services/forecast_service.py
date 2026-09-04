"""
Forecast Service.
Orchestrates feature extraction, ML forecasting, and overlays dynamic operating buffers.
"""

from typing import Dict, Any, Optional
from datetime import date
import pandas as pd
from sqlalchemy.orm import Session
from backend.services.cashflow_service import CashflowService
from backend.ml.feature_engineering import CashflowFeatureEngineer
from backend.ml.forecasting import CashflowForecaster
from backend.ml.risk_model import DynamicBufferEngine
from backend.models.merchant import Merchant
from backend.models.obligation import Obligation
from backend.core.exceptions import MerchantNotFoundError


class ForecastService:
    @staticmethod
    def generate_forecast(
        db: Session,
        merchant_id: str,
        horizon_days: int = 30,
        as_of_date: Optional[date] = None,
        confidence_level: float = 0.85
    ) -> Dict[str, Any]:
        """Generates full future cash trajectory with prediction intervals and buffer overlay."""
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if not merchant:
            raise MerchantNotFoundError(f"Merchant {merchant_id} not found.")

        # 1. Historical Cash Ledger
        ledger_data = CashflowService.get_merchant_ledger(db, merchant_id, as_of_date=as_of_date)
        ref_date = as_of_date or ledger_data["as_of_date"]
        history_df = CashflowFeatureEngineer.ledger_to_dataframe(ledger_data["entries"])

        # 2. Upcoming Obligations
        obligations = db.query(Obligation).filter(
            Obligation.merchant_id == merchant_id,
            Obligation.due_date >= ref_date,
            Obligation.status == "UPCOMING"
        ).all()
        ob_list = [
            {
                "obligation_id": o.obligation_id,
                "category": o.category,
                "amount": o.amount,
                "due_date": o.due_date,
                "priority": o.priority,
            }
            for o in obligations
        ]

        # 3. Dynamic Operating Buffer
        buffer_info = DynamicBufferEngine.calculate_operating_buffer(
            history_df=history_df,
            upcoming_obligations=ob_list,
            configured_floor=float(merchant.minimum_operating_cash),
            ref_date=ref_date,
            current_balance=float(ledger_data["current_balance"]),
        )
        effective_buffer = buffer_info["effective_buffer"]

        # 4. Forecast Cash Position
        forecaster = CashflowForecaster()
        forecast_result = forecaster.fit_and_forecast(
            history_df=history_df,
            horizon_days=horizon_days,
            current_balance=ledger_data["current_balance"],
            start_date=ref_date,
            confidence_level=confidence_level,
        )

        # 5. Overlay Dynamic Buffer and evaluate breach
        points = forecast_result["points"]
        projected_min_cash = float("inf")
        projected_min_date = ref_date
        buffer_breached = False
        max_breach_amount = 0.0

        for pt in points:
            pt["operating_buffer"] = effective_buffer
            is_breach = pt["predicted_balance"] < effective_buffer
            pt["is_breached"] = is_breach

            if pt["predicted_balance"] < projected_min_cash:
                projected_min_cash = pt["predicted_balance"]
                projected_min_date = pt["date"]

            if is_breach:
                buffer_breached = True
                breach_val = effective_buffer - pt["predicted_balance"]
                if breach_val > max_breach_amount:
                    max_breach_amount = breach_val

        return {
            "merchant_id": merchant_id,
            "forecast_generated_date": ref_date,
            "horizon_days": horizon_days,
            "confidence": forecast_result["confidence"],
            "method": forecast_result["method"],
            "points": points,
            "projected_min_cash": round(projected_min_cash, 2),
            "projected_min_cash_date": projected_min_date,
            "buffer_breached": buffer_breached,
            "breach_amount": round(max_breach_amount, 2),
            "dynamic_buffer_details": buffer_info,
        }
