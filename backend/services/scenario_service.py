"""
Scenario Simulator Service.
Applies what-if stress parameters (revenue drops, refund spikes, settlement delays,
and one-off commitments) to project altered cash trajectories against operating buffers.
"""

from typing import Dict, Any, Optional
from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.services.forecast_service import ForecastService
from backend.schemas import ScenarioRequest
from backend.core.constants import RiskLevel


class ScenarioService:
    @staticmethod
    def simulate_scenario(
        db: Session,
        merchant_id: str,
        params: ScenarioRequest,
        as_of_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Simulates altered cash trajectory under stressed scenario assumptions."""
        ref_date = as_of_date or date(2026, 9, 2)

        # 1. Obtain baseline forecast
        baseline = ForecastService.generate_forecast(
            db, merchant_id, horizon_days=30, as_of_date=ref_date
        )
        base_points = baseline["points"]
        operating_buffer = baseline["dynamic_buffer_details"]["effective_buffer"]

        # 2. Apply scenario modifiers
        rev_mult = 1.0 + (params.revenue_change_pct / 100.0)
        refund_mult = 1.0 + (params.refund_change_pct / 100.0)
        delay_days = max(0, params.settlement_delay_days)

        # Commitment / one-off expense timing
        commit_date = params.commitment_date or (ref_date + timedelta(days=1))
        exp_date = params.additional_expense_date or (ref_date + timedelta(days=1))

        # Build adjusted daily inflows and outflows
        simulated_inflows = []
        for i, pt in enumerate(base_points):
            # Apply revenue multiplier
            adjusted_inflow = pt["predicted_inflow"] * rev_mult
            # If refund surge is specified, net settlement inflow drops proportionally
            if params.refund_change_pct > 0:
                adjusted_inflow -= (pt["predicted_inflow"] * 0.04 * (refund_mult - 1.0))
            simulated_inflows.append(max(0.0, adjusted_inflow))

        # Apply settlement delay shift: delayed inflows move forward in time
        if delay_days > 0:
            delayed = [0.0] * delay_days + simulated_inflows[:-delay_days]
            simulated_inflows = delayed

        # 3. Simulate day-by-day cash trajectory
        # Starting cash is baseline beginning balance
        # From first point: baseline_cash[0] = starting_balance + base_inflow[0] - base_outflow[0]
        # So starting_cash = base_points[0]["predicted_balance"] - base_points[0]["predicted_inflow"] + base_points[0]["predicted_outflow"]
        starting_cash = (
            base_points[0]["predicted_balance"]
            - base_points[0]["predicted_inflow"]
            + base_points[0]["predicted_outflow"]
        )

        running_sim_cash = starting_cash
        trajectory = []
        sim_min_cash = float("inf")
        sim_min_date = ref_date
        buffer_breached = False
        max_breach = 0.0

        for i, pt in enumerate(base_points):
            curr_d = pt["date"]
            inflow = simulated_inflows[i]
            outflow = pt["predicted_outflow"]

            # Add proposed one-off commitments
            one_off_deduction = 0.0
            if params.proposed_commitment > 0 and curr_d == commit_date:
                one_off_deduction += params.proposed_commitment

            if params.additional_expense > 0 and curr_d == exp_date:
                one_off_deduction += params.additional_expense

            running_sim_cash += (inflow - outflow - one_off_deduction)

            is_breach = running_sim_cash < operating_buffer
            if is_breach:
                buffer_breached = True
                breach_val = operating_buffer - running_sim_cash
                if breach_val > max_breach:
                    max_breach = breach_val

            if running_sim_cash < sim_min_cash:
                sim_min_cash = running_sim_cash
                sim_min_date = curr_d

            trajectory.append({
                "date": curr_d,
                "baseline_cash": pt["predicted_balance"],
                "scenario_cash": round(running_sim_cash, 2),
                "operating_buffer": operating_buffer,
                "is_breached": is_breach,
            })

        baseline_min_cash = baseline["projected_min_cash"]
        delta_min_cash = round(sim_min_cash - baseline_min_cash, 2)

        # Risk classification
        if sim_min_cash < 0:
            risk_level = RiskLevel.CRITICAL
            recommendation = (
                f"CRITICAL: Projected liquidity deficit of ₹{abs(sim_min_cash):,.0f} on {sim_min_date}. "
                "The business would face overdraft or payment dishonours. Strict deferral required."
            )
        elif buffer_breached:
            risk_level = RiskLevel.HIGH if max_breach > (operating_buffer * 0.3) else RiskLevel.MODERATE
            recommendation = (
                f"WARNING: Cash falls ₹{max_breach:,.0f} below the dynamic safety buffer of ₹{operating_buffer:,.0f}. "
                "Operating resilience is severely compromised. Consider staged disbursements."
            )
        elif sim_min_cash < (operating_buffer * 1.15):
            risk_level = RiskLevel.MODERATE
            recommendation = (
                "CAUTION: Cash remains above safety buffer but safety margin is under 15%. "
                "Monitor collections closely."
            )
        else:
            risk_level = RiskLevel.LOW
            recommendation = (
                "HEALTHY: Projected cash remains comfortably above dynamic operating buffer "
                "even under the simulated stress parameters."
            )

        return {
            "merchant_id": merchant_id,
            "baseline_min_cash": baseline_min_cash,
            "scenario_min_cash": round(sim_min_cash, 2),
            "delta_min_cash": delta_min_cash,
            "operating_buffer": operating_buffer,
            "buffer_breached": buffer_breached,
            "breach_amount": round(max_breach, 2),
            "risk_level": risk_level,
            "recommendation": recommendation,
            "trajectory": trajectory,
        }
