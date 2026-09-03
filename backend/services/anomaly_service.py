"""
Anomaly Service.
Coordinates anomaly detection across cash flows and upcoming obligations.
"""

from typing import Dict, Any, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.services.cashflow_service import CashflowService
from backend.ml.feature_engineering import CashflowFeatureEngineer
from backend.ml.anomaly_detection import FinancialAnomalyDetector
from backend.models.obligation import Obligation
from backend.models.merchant import Merchant
from backend.core.exceptions import MerchantNotFoundError


class AnomalyService:
    @staticmethod
    def get_merchant_anomalies(
        db: Session, merchant_id: str, as_of_date: Optional[date] = None
    ) -> Dict[str, Any]:
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if not merchant:
            raise MerchantNotFoundError(f"Merchant {merchant_id} not found.")

        ref_date = as_of_date or date(2026, 9, 2)

        ledger_data = CashflowService.get_merchant_ledger(db, merchant_id, as_of_date=ref_date)
        history_df = CashflowFeatureEngineer.ledger_to_dataframe(ledger_data["entries"])

        # Run cashflow anomaly detector
        detector_result = FinancialAnomalyDetector.detect_anomalies(history_df, ref_date=ref_date)
        anomalies = detector_result["anomalies"]
        risk_radar = detector_result["risk_radar"]

        # Calculate Obligation Concentration Risk for Risk Radar
        obligations_total = db.query(func.sum(Obligation.amount)).filter(
            Obligation.merchant_id == merchant_id,
            Obligation.due_date >= ref_date,
            Obligation.status == "UPCOMING"
        ).scalar() or 0.0

        current_cash = ledger_data["current_balance"]
        obligation_ratio = (obligations_total / max(1.0, current_cash))
        
        # Scale to 0-100 score
        if obligation_ratio >= 0.70:
            ob_risk = min(95.0, 70.0 + (obligation_ratio - 0.70) * 50)
        elif obligation_ratio >= 0.40:
            ob_risk = 50.0 + (obligation_ratio - 0.40) * 60
        else:
            ob_risk = max(10.0, obligation_ratio * 100)

        risk_radar["obligation_risk"] = round(ob_risk, 1)

        return {
            "merchant_id": merchant_id,
            "anomalies": anomalies,
            "risk_radar": risk_radar,
        }
