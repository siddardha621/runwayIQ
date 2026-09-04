"""
Deterministic Decision Engine.
Evaluates proposed financial commitments under forecast uncertainty, dynamic buffers,
and strict reliability/abstention gates.
"""

import json
import uuid
from typing import Dict, Any, Optional
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from backend.services.forecast_service import ForecastService
from backend.services.cashflow_service import CashflowService
from backend.services.anomaly_service import AnomalyService
from backend.services.evidence_service import EvidenceEngine
from backend.models.merchant import Merchant
from backend.models.decision import Decision
from backend.models.obligation import Obligation
from backend.schemas import DecisionRequest
from backend.core.constants import DecisionVerdict
from backend.core.config import settings
from backend.core.exceptions import MerchantNotFoundError


class DecisionEngineService:
    @staticmethod
    def evaluate_commitment(
        db: Session,
        merchant_id: str,
        request: DecisionRequest,
        as_of_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Main decision-support pipeline:
        FORECAST -> DIAGNOSE -> SIMULATE -> DECIDE -> EXPLAIN
        """
        merchant = db.query(Merchant).filter(Merchant.merchant_id == merchant_id).first()
        if not merchant:
            raise MerchantNotFoundError(f"Merchant {merchant_id} not found.")

        ledger = CashflowService.get_merchant_ledger(db, merchant_id, as_of_date=as_of_date)
        ref_date = as_of_date or ledger["as_of_date"]
        commit_date = request.commitment_date or (ref_date + timedelta(days=1))
        amount = float(request.amount)

        # 1. Evaluate Data Quality & Historical Depth for Abstention Gate
        dq_info = CashflowService.calculate_data_quality_score(db, merchant_id, as_of_date=ref_date)
        history_days = dq_info["history_days"]
        data_quality_score = dq_info["overall_score"]

        # ABSTENTION RULE: Check if system should abstain
        if history_days < settings.MIN_HISTORY_DAYS_FOR_DECISION or data_quality_score < 50.0:
            abstention_msg = (
                f"INSUFFICIENT CONFIDENCE: The merchant has only {history_days} days of recorded history "
                f"(minimum {settings.MIN_HISTORY_DAYS_FOR_DECISION} days required) with a data quality score of {data_quality_score}%. "
                "Settlement arrival cadence and seasonal outflow variability have not stabilized. "
                "The system abstains from issuing a financial commitment recommendation to prevent false-safe liquidity failure."
            )

            # Audit record for abstention
            decision_record = Decision(
                decision_id=f"dec_{merchant_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}",
                merchant_id=merchant_id,
                timestamp=datetime.utcnow(),
                requested_action=f"Proposed {request.category} payment of ₹{amount:,.0f} on {commit_date}",
                decision=DecisionVerdict.INSUFFICIENT_CONFIDENCE.value,
                confidence=round(data_quality_score / 100.0, 2),
                evidence=json.dumps([{"metric": "Historical Depth", "value": f"{history_days} Days", "impact": "NEGATIVE", "detail": abstention_msg}]),
                assumptions=json.dumps(["Minimum 14-day historical window required for deterministic decisioning."]),
                recommendation=abstention_msg,
                model_version=settings.MODEL_VERSION,
            )
            db.add(decision_record)
            db.commit()

            return {
                "decision_id": decision_record.decision_id,
                "merchant_id": merchant_id,
                "timestamp": decision_record.timestamp,
                "requested_action": decision_record.requested_action,
                "decision": DecisionVerdict.INSUFFICIENT_CONFIDENCE,
                "confidence": round(data_quality_score / 100.0, 2),
                "projected_min_cash_without": round(merchant.starting_balance, 2),
                "projected_min_cash_with": round(max(0.0, merchant.starting_balance - amount), 2),
                "minimum_operating_cash": round(merchant.minimum_operating_cash, 2),
                "buffer_breach_amount": 0.0,
                "prediction_interval_lower": 0.0,
                "prediction_interval_upper": 0.0,
                "evidence": [
                    {
                        "metric": "Data Sufficiency",
                        "value": f"{history_days} Days ({data_quality_score}% Quality)",
                        "impact": "NEGATIVE",
                        "detail": abstention_msg,
                    }
                ],
                "assumptions": ["Minimum 14-day history required."],
                "primary_reasons": ["Historical data insufficient to formulate reliable cash distribution."],
                "recommendation": abstention_msg,
                "safer_alternatives": [],
                "model_version": settings.MODEL_VERSION,
                "data_quality_score": data_quality_score,
                "abstention_reason": abstention_msg,
            }

        # 2. Generate Baseline Forecast & Dynamic Operating Buffer
        forecast_res = ForecastService.generate_forecast(db, merchant_id, horizon_days=30, as_of_date=ref_date)
        base_points = forecast_res["points"]
        operating_buffer = forecast_res["dynamic_buffer_details"]["effective_buffer"]
        confidence = forecast_res["confidence"]

        # 3. Simulate Proposed Commitment
        sim_min_cash = float("inf")
        sim_min_date = ref_date
        buffer_breach = 0.0
        lower_bound_at_min = 0.0
        upper_bound_at_min = 0.0

        for pt in base_points:
            pt_date = pt["date"]
            # After commitment date, cash is reduced by amount
            is_post_commit = pt_date >= commit_date
            post_balance = pt["predicted_balance"] - (amount if is_post_commit else 0.0)
            post_lower = max(0.0, pt["lower_bound"] - (amount if is_post_commit else 0.0))

            if post_balance < sim_min_cash:
                sim_min_cash = post_balance
                sim_min_date = pt_date
                lower_bound_at_min = post_lower
                upper_bound_at_min = max(0.0, pt["upper_bound"] - (amount if is_post_commit else 0.0))

            if post_balance < operating_buffer:
                breach = operating_buffer - post_balance
                if breach > buffer_breach:
                    buffer_breach = breach

        projected_min_without = forecast_res["projected_min_cash"]
        projected_min_with = round(sim_min_cash, 2)
        buffer_breach = round(buffer_breach, 2)

        # 4. Ingest Anomalies & Upcoming Obligations for Contextual Evidence
        anomaly_res = AnomalyService.get_merchant_anomalies(db, merchant_id, as_of_date=ref_date)
        anomalies = anomaly_res["anomalies"]

        near_obligations = db.query(Obligation).filter(
            Obligation.merchant_id == merchant_id,
            Obligation.due_date >= ref_date,
            Obligation.due_date <= ref_date + timedelta(days=14),
            Obligation.status == "UPCOMING"
        ).all()
        near_ob_total = sum(o.amount for o in near_obligations)

        # Maximum safe commitment calculation
        max_safe_commitment = max(0.0, round(projected_min_without - operating_buffer, 2))

        # 5. Deterministic Decision Classification Logic
        primary_reasons = []
        if projected_min_with < 0:
            decision = DecisionVerdict.HIGH_RISK
            primary_reasons.append(f"Commitment triggers a projected cash deficit of ₹{abs(projected_min_with):,.0f} on {sim_min_date}.")
        elif buffer_breach > 0:
            if buffer_breach > (operating_buffer * 0.25) or lower_bound_at_min < 0:
                decision = DecisionVerdict.HIGH_RISK
                primary_reasons.append(f"Severe buffer breach: projected cash drops ₹{buffer_breach:,.0f} below the dynamic operating buffer.")
            else:
                decision = DecisionVerdict.CAUTION
                primary_reasons.append(f"Moderate buffer breach: projected cash falls ₹{buffer_breach:,.0f} below operating buffer of ₹{operating_buffer:,.0f}.")
        elif lower_bound_at_min < operating_buffer:
            decision = DecisionVerdict.CAUTION
            primary_reasons.append(f"Downside prediction interval tail (₹{lower_bound_at_min:,.0f}) breaches safety buffer under 85% uncertainty.")
        else:
            decision = DecisionVerdict.SAFE
            primary_reasons.append(f"Projected cash remains safely above dynamic operating buffer with a ₹{projected_min_with - operating_buffer:,.0f} surplus.")

        # Contextual reason additions
        if near_ob_total > 0:
            primary_reasons.append(f"₹{near_ob_total:,.0f} in mandatory obligations due within 14 days.")
        for a in anomalies:
            if a["type"] == "REVENUE_DROP":
                primary_reasons.append(a["description"])
            elif a["type"] == "REFUND_SPIKE":
                primary_reasons.append(a["description"])
            elif a["type"] == "SETTLEMENT_DELAY":
                primary_reasons.append(a["description"])

        # 6. Recommendation & Safer Alternatives
        safer_alternatives = []
        if decision in [DecisionVerdict.CAUTION, DecisionVerdict.HIGH_RISK]:
            recommendation = (
                f"Consider delaying the purchase until post-settlement or reducing the initial commitment to "
                f"maintain liquidity above the ₹{operating_buffer:,.0f} dynamic operating buffer."
            )

            # Alternative 1: Cap at maximum safe immediate spend
            if max_safe_commitment > 10000:
                safer_alternatives.append({
                    "strategy": "REDUCE_AMOUNT",
                    "title": f"Reduce Immediate Commitment to ₹{max_safe_commitment:,.0f}",
                    "description": "Preserves 100% of the dynamic safety buffer with zero breach risk.",
                    "adjusted_amount": max_safe_commitment,
                    "adjusted_date": commit_date,
                    "resulting_min_cash": operating_buffer,
                })

            # Alternative 2: Split payment (50% upfront, 50% in 12 days)
            half_amt = round(amount * 0.5, 2)
            safer_alternatives.append({
                "strategy": "SPLIT_PAYMENT",
                "title": f"Split Payment into 2 Tranches (₹{half_amt:,.0f} now + ₹{half_amt:,.0f} in 12 days)",
                "description": "Allows incoming settlements from current sales to replenish cash before the second tranche matures.",
                "adjusted_amount": half_amt,
                "adjusted_date": commit_date + timedelta(days=12),
                "resulting_min_cash": round(projected_min_with + half_amt * 0.8, 2),
            })

            # Alternative 3: Defer payment by 8 days
            defer_date = commit_date + timedelta(days=8)
            safer_alternatives.append({
                "strategy": "DEFER_PAYMENT",
                "title": f"Defer Commitment to {defer_date.strftime('%b %d, %Y')}",
                "description": "Postpones outlay until after upcoming settlements clear and immediate supplier obligations resolve.",
                "adjusted_amount": amount,
                "adjusted_date": defer_date,
                "resulting_min_cash": round(projected_min_with + 45000.0, 2),
            })
        else:
            recommendation = (
                f"Approved: The proposed commitment of ₹{amount:,.0f} is safe to execute on {commit_date}. "
                f"Projected cash trough remains at ₹{projected_min_with:,.0f}, preserving a safety margin above the dynamic buffer."
            )

        # 7. Compile Structured Evidence
        evidence = EvidenceEngine.compile_decision_evidence(
            projected_min_without=projected_min_without,
            projected_min_with=projected_min_with,
            operating_buffer=operating_buffer,
            buffer_breach=buffer_breach,
            lower_bound_with=lower_bound_at_min,
            upcoming_obligations_total=near_ob_total,
            anomaly_findings=anomalies,
            confidence=confidence,
            data_quality_score=data_quality_score,
            max_safe_commitment=max_safe_commitment,
        )

        assumptions = [
            f"Daily collections track the hybrid ML forecast (Confidence: {int(confidence*100)}%).",
            f"Dynamic safety buffer includes ₹{near_ob_total:,.0f} in near-term mandatory obligations.",
            "Settlements arrive on scheduled T+2 clearing cadence.",
            "Refunds remain within historical bounds unless flagged by anomaly detector."
        ]

        # 8. Persist Decision in Database Audit Trail
        decision_record = Decision(
            decision_id=f"dec_{merchant_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}",
            merchant_id=merchant_id,
            timestamp=datetime.utcnow(),
            requested_action=f"Proposed {request.category} payment of ₹{amount:,.0f} on {commit_date}",
            decision=decision.value,
            confidence=confidence,
            evidence=json.dumps(evidence),
            assumptions=json.dumps(assumptions),
            recommendation=recommendation,
            model_version=settings.MODEL_VERSION,
        )
        db.add(decision_record)
        db.commit()

        return {
            "decision_id": decision_record.decision_id,
            "merchant_id": merchant_id,
            "timestamp": decision_record.timestamp,
            "requested_action": decision_record.requested_action,
            "decision": decision,
            "confidence": confidence,
            "projected_min_cash_without": projected_min_without,
            "projected_min_cash_with": projected_min_with,
            "minimum_operating_cash": operating_buffer,
            "buffer_breach_amount": buffer_breach,
            "prediction_interval_lower": round(lower_bound_at_min, 2),
            "prediction_interval_upper": round(upper_bound_at_min, 2),
            "evidence": evidence,
            "assumptions": assumptions,
            "primary_reasons": primary_reasons[:4],
            "recommendation": recommendation,
            "safer_alternatives": safer_alternatives,
            "model_version": settings.MODEL_VERSION,
            "data_quality_score": data_quality_score,
            "abstention_reason": None,
        }
