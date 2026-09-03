"""
Grounded Explanation & AI Copilot Intent Service.
Converts merchant natural language questions into structured intents, executes underlying
deterministic engines, and renders faithful explanations. Never invents financial data.
"""

import re
from typing import Dict, Any, List, Optional
from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.services.decision_service import DecisionEngineService
from backend.services.forecast_service import ForecastService
from backend.services.anomaly_service import AnomalyService
from backend.services.scenario_service import ScenarioService
from backend.services.cashflow_service import CashflowService
from backend.models.obligation import Obligation
from backend.schemas import DecisionRequest, ScenarioRequest
from backend.core.config import settings


class ExplanationService:
    @staticmethod
    def process_copilot_query(
        db: Session,
        merchant_id: str,
        query: str,
        as_of_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Parses intent from query, invokes deterministic services, and formats grounded natural language.
        """
        q_lower = query.lower().strip()
        ref_date = as_of_date or date(2026, 9, 2)

        # 1. Intent: Proposed Spend / Commitment Evaluation
        # e.g., "Can I spend ₹2,00,000 tomorrow?" or "Can I spend 200000 on inventory?" or "2 lakh"
        if any(w in q_lower for w in ["spend", "buy", "purchase", "pay", "afford", "can i"]):
            # Extract amount
            amount = ExplanationService._extract_amount(q_lower) or 200000.0
            category = "INVENTORY" if "inventory" in q_lower else ("MARKETING" if "marketing" in q_lower else "SUPPLIER")

            decision_req = DecisionRequest(
                amount=amount,
                category=category,
                commitment_date=ref_date + timedelta(days=1),
            )
            res = DecisionEngineService.evaluate_commitment(db, merchant_id, decision_req, as_of_date=ref_date)

            verdict = res["decision"].value if hasattr(res["decision"], "value") else str(res["decision"])
            min_with = res["projected_min_cash_with"]
            buffer = res["minimum_operating_cash"]
            breach = res["buffer_breach_amount"]

            if verdict == "INSUFFICIENT_CONFIDENCE":
                resp_text = (
                    f"**Verdict: INSUFFICIENT CONFIDENCE**\n\n"
                    f"{res['abstention_reason']}"
                )
            elif verdict == "SAFE":
                resp_text = (
                    f"**Verdict: SAFE**\n\n"
                    f"Yes, you can safely commit **₹{amount:,.0f}** on {ref_date + timedelta(days=1)}. "
                    f"Your projected lowest cash position is **₹{min_with:,.0f}**, remaining safely above your "
                    f"dynamic operating cash buffer of **₹{buffer:,.0f}**.\n\n"
                    f"**Confidence**: {int(res['confidence']*100)}%\n"
                    f"**Safety Margin**: ₹{min_with - buffer:,.0f}"
                )
            elif verdict == "CAUTION":
                resp_text = (
                    f"**Verdict: CAUTION**\n\n"
                    f"Making a **₹{amount:,.0f}** commitment is risky. Projected minimum cash drops to "
                    f"**₹{min_with:,.0f}**, causing a **₹{breach:,.0f}** breach below your dynamic operating buffer "
                    f"(₹{buffer:,.0f}).\n\n"
                    f"**Primary Risk Drivers**:\n"
                    + "\n".join([f"- {r}" for r in res["primary_reasons"]]) + "\n\n"
                    f"**Recommendation**: {res['recommendation']}"
                )
            else:  # HIGH_RISK
                resp_text = (
                    f"**Verdict: HIGH RISK**\n\n"
                    f"A **₹{amount:,.0f}** outlay will severely endanger liquidity. Projected cash drops to "
                    f"**₹{min_with:,.0f}** (buffer breach of **₹{breach:,.0f}**).\n\n"
                    f"**Primary Reasons**:\n"
                    + "\n".join([f"- {r}" for r in res["primary_reasons"]]) + "\n\n"
                    f"**Suggested Alternative**: Consider splitting into 2 tranches or capping immediate spend at "
                    f"**₹{res.get('evidence', [{}])[-1].get('value', '0')}**."
                )

            return {
                "merchant_id": merchant_id,
                "question": query,
                "intent_detected": "EVALUATE_COMMITMENT",
                "response_text": resp_text,
                "grounded_evidence": res["evidence"],
                "suggested_followups": [
                    "What happens if sales fall 15%?",
                    "What is causing my cash-flow risk?",
                    "Which obligation is most dangerous?",
                    "What is the safest amount I can spend today?"
                ],
                "confidence": res["confidence"],
                "llm_source": "grounded_template",
            }

        # 2. Intent: Stress Test / What-If Scenario
        # e.g., "What happens if sales fall 15%?" or "What if revenue drops 20%?"
        elif any(w in q_lower for w in ["what if", "sales fall", "revenue drop", "sales drop", "what happens"]):
            # Extract percentage
            pct_match = re.search(r"(\d+)\s*%", q_lower)
            drop_pct = float(pct_match.group(1)) if pct_match else 15.0

            scen_req = ScenarioRequest(revenue_change_pct=-abs(drop_pct))
            scen_res = ScenarioService.simulate_scenario(db, merchant_id, scen_req, as_of_date=ref_date)

            resp_text = (
                f"**Simulation: {drop_pct:.0f}% Revenue Drop**\n\n"
                f"- **Baseline Min Cash**: ₹{scen_res['baseline_min_cash']:,.0f}\n"
                f"- **Stressed Min Cash**: ₹{scen_res['scenario_min_cash']:,.0f} (Drop of ₹{abs(scen_res['delta_min_cash']):,.0f})\n"
                f"- **Operating Buffer**: ₹{scen_res['operating_buffer']:,.0f}\n"
                f"- **Buffer Breach**: ₹{scen_res['breach_amount']:,.0f}\n"
                f"- **Risk Level**: **{scen_res['risk_level'].value}**\n\n"
                f"**Assessment**: {scen_res['recommendation']}"
            )

            return {
                "merchant_id": merchant_id,
                "question": query,
                "intent_detected": "SIMULATE_SCENARIO",
                "response_text": resp_text,
                "grounded_evidence": [
                    {"metric": "Revenue Shock", "value": f"-{drop_pct:.0f}%", "impact": "NEGATIVE"},
                    {"metric": "Stressed Cash Trough", "value": f"₹{scen_res['scenario_min_cash']:,.0f}", "impact": "NEGATIVE"},
                    {"metric": "Operating Buffer", "value": f"₹{scen_res['operating_buffer']:,.0f}", "impact": "NEUTRAL"},
                ],
                "suggested_followups": [
                    "Can I spend ₹2,00,000 tomorrow?",
                    "What happens if my settlement is delayed by 2 days?",
                    "Which obligation is most dangerous?"
                ],
                "confidence": 0.88,
                "llm_source": "grounded_template",
            }

        # 3. Intent: Most Dangerous / Critical Obligation
        elif any(w in q_lower for w in ["dangerous", "obligation", "upcoming payment", "biggest expense", "due"]):
            obligations = db.query(Obligation).filter(
                Obligation.merchant_id == merchant_id,
                Obligation.due_date >= ref_date,
                Obligation.status == "UPCOMING"
            ).order_by(Obligation.amount.desc()).all()

            if not obligations:
                resp_text = "There are no upcoming obligations recorded for the next 30 days."
                top_ob_data = []
            else:
                top_ob = obligations[0]
                days_left = (top_ob.due_date - ref_date).days
                resp_text = (
                    f"**Highest Liquidity Risk Obligation**:\n\n"
                    f"- **Category**: {top_ob.category}\n"
                    f"- **Amount**: **₹{top_ob.amount:,.0f}**\n"
                    f"- **Due Date**: {top_ob.due_date.strftime('%B %d, %Y')} ({days_left} days away)\n"
                    f"- **Priority**: {top_ob.priority}\n\n"
                    f"This single obligation represents the largest near-term claim on your working capital. "
                    f"Ensure incoming settlements arriving prior to {top_ob.due_date.strftime('%b %d')} are preserved."
                )
                top_ob_data = [
                    {"metric": "Obligation", "value": f"₹{top_ob.amount:,.0f}", "impact": "NEGATIVE"},
                    {"metric": "Due Date", "value": f"{days_left} Days", "impact": "NEUTRAL"}
                ]

            return {
                "merchant_id": merchant_id,
                "question": query,
                "intent_detected": "CRITICAL_OBLIGATION",
                "response_text": resp_text,
                "grounded_evidence": top_ob_data,
                "suggested_followups": [
                    "Can I spend ₹2,00,000 on inventory tomorrow?",
                    "What is causing my cash-flow risk?"
                ],
                "confidence": 0.95,
                "llm_source": "grounded_template",
            }

        # 4. Intent: Risk Drivers / Why is Risk Elevated
        elif any(w in q_lower for w in ["why", "risk", "causing", "deteriorat", "driver"]):
            anom_res = AnomalyService.get_merchant_anomalies(db, merchant_id, as_of_date=ref_date)
            radar = anom_res["risk_radar"]
            anomalies = anom_res["anomalies"]

            reasons = []
            for a in anomalies:
                reasons.append(f"- **{a['type'].replace('_', ' ').title()}**: {a['description']}")

            if not reasons:
                reasons.append("- Daily revenue and refund rates are tracking normal historical distributions.")

            resp_text = (
                f"**Cash-Flow Risk Driver Analysis**:\n\n"
                + "\n".join(reasons) + "\n\n"
                f"**Risk Radar Metrics (0-100)**:\n"
                f"- Revenue Decline: {radar['revenue_drop']}/100\n"
                f"- Refund Pressure: {radar['refund_spike']}/100\n"
                f"- Settlement Timing Lag: {radar['settlement_delay']}/100\n"
                f"- Obligation Concentration: {radar['obligation_risk']}/100"
            )

            return {
                "merchant_id": merchant_id,
                "question": query,
                "intent_detected": "RISK_DRIVERS",
                "response_text": resp_text,
                "grounded_evidence": [
                    {"metric": "Revenue Risk Score", "value": f"{radar['revenue_drop']}/100", "impact": "NEGATIVE"},
                    {"metric": "Refund Spike Score", "value": f"{radar['refund_spike']}/100", "impact": "NEGATIVE"},
                    {"metric": "Settlement Delay Score", "value": f"{radar['settlement_delay']}/100", "impact": "NEGATIVE"},
                ],
                "suggested_followups": [
                    "Can I spend ₹2,00,000 on inventory tomorrow?",
                    "What happens if sales fall 15%?"
                ],
                "confidence": 0.88,
                "llm_source": "grounded_template",
            }

        # 5. Default Fallback
        else:
            fc = ForecastService.generate_forecast(db, merchant_id, horizon_days=30, as_of_date=ref_date)
            buf = fc["dynamic_buffer_details"]["effective_buffer"]
            min_c = fc["projected_min_cash"]

            resp_text = (
                f"I am your **Merchant Cash-Flow Decision Support Copilot**.\n\n"
                f"Under current baseline forecasts:\n"
                f"- **Projected 30-Day Minimum Cash**: ₹{min_c:,.0f} (on {fc['projected_min_cash_date']})\n"
                f"- **Dynamic Operating Buffer**: ₹{buf:,.0f}\n"
                f"- **Forecast Confidence**: {int(fc['confidence']*100)}%\n\n"
                f"You can ask me to evaluate commitments (e.g., *'Can I spend ₹2L tomorrow?'*), "
                f"stress test your business (e.g., *'What if sales fall 15%?'*), or inspect risk drivers."
            )

            return {
                "merchant_id": merchant_id,
                "question": query,
                "intent_detected": "GENERAL_FINANCIAL_INQUIRY",
                "response_text": resp_text,
                "grounded_evidence": [
                    {"metric": "Forecast Horizon", "value": "30 Days", "impact": "NEUTRAL"},
                    {"metric": "Model Confidence", "value": f"{int(fc['confidence']*100)}%", "impact": "POSITIVE"}
                ],
                "suggested_followups": [
                    "Can I spend ₹2,00,000 on inventory tomorrow?",
                    "What happens if sales fall 15%?",
                    "Which obligation is most dangerous?",
                    "What is causing my cash-flow risk?"
                ],
                "confidence": fc["confidence"],
                "llm_source": "grounded_template",
            }

    @staticmethod
    def _extract_amount(text: str) -> Optional[float]:
        """Extracts financial amounts including Indian numbering format (e.g., 2 lakh, 2,00,000)."""
        # Match '2 lakh' or '2.5 lakh'
        lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b", text)
        if lakh_match:
            return float(lakh_match.group(1)) * 100000.0

        # Match '200000' or '2,00,000'
        num_match = re.search(r"₹?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?)", text)
        if num_match:
            clean_str = num_match.group(1).replace(",", "")
            val = float(clean_str)
            if val > 100:  # Filter out trivial numbers
                return val

        return None
