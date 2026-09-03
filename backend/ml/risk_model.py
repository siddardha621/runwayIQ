"""
Dynamic Minimum Operating Cash Engine.
Calculates behavior-driven safety cash buffer based on near-term mandatory obligations,
working capital burn rate, cash flow volatility, and refund reserves.
"""

from typing import Dict, List, Any, Optional
from datetime import date, timedelta
import pandas as pd
import numpy as np


class DynamicBufferEngine:
    @classmethod
    def calculate_operating_buffer(
        cls,
        history_df: pd.DataFrame,
        upcoming_obligations: List[Dict[str, Any]],
        configured_floor: float = 100000.0,
        ref_date: Optional[date] = None,
        obligation_window_days: int = 14
    ) -> Dict[str, Any]:
        """
        Calculates the transparent dynamic minimum operating cash buffer:
        Minimum Operating Cash = Near-Term Mandatory Obligations + Burn Buffer + Volatility Buffer + Refund Reserve
        """
        as_of = ref_date or date(2026, 9, 2)
        cutoff_date = as_of + timedelta(days=obligation_window_days)

        # 1. Near-term mandatory obligations within 14 days
        near_term_obligations = 0.0
        obligation_items = []
        for ob in upcoming_obligations:
            ob_due = ob["due_date"] if isinstance(ob["due_date"], date) else date.fromisoformat(str(ob["due_date"]))
            if as_of <= ob_due <= cutoff_date and ob.get("priority") in ["MANDATORY", "HIGH"]:
                amt = float(ob["amount"])
                near_term_obligations += amt
                obligation_items.append({
                    "id": ob["obligation_id"],
                    "category": ob["category"],
                    "amount": amt,
                    "due_date": ob_due,
                    "priority": ob["priority"],
                })

        # 2. Operating Expense Run-Rate (Burn Buffer: 7 days of average daily outflows)
        if not history_df.empty:
            recent_outflows = history_df["outflows"].tail(30).values
            avg_daily_outflows = float(np.mean(recent_outflows)) if len(recent_outflows) > 0 else 5000.0
            burn_buffer = round(avg_daily_outflows * 7.0, 2)  # 7 days runway
        else:
            avg_daily_outflows = 5000.0
            burn_buffer = 35000.0

        # 3. Cash-Flow Volatility Buffer (1.44 * std(net daily cashflow))
        if not history_df.empty and len(history_df) >= 7:
            net_flows = history_df["net_flow"].tail(30).values
            volatility_std = float(np.std(net_flows))
            volatility_buffer = round(1.44 * volatility_std, 2)
        else:
            volatility_buffer = 20000.0

        # 4. Refund Exposure Reserve (7 days of average recent refunds)
        if not history_df.empty and "refund_amount" in history_df.columns:
            recent_refunds = history_df["refund_amount"].tail(14).values
            avg_daily_refund = float(np.mean(recent_refunds)) if len(recent_refunds) > 0 else 0.0
            refund_reserve = round(avg_daily_refund * 7.0, 2)
        else:
            refund_reserve = 10000.0

        # Sum of dynamic components
        dynamic_calculated = near_term_obligations + burn_buffer + volatility_buffer + refund_reserve

        # Effective minimum operating cash (respecting merchant's configured baseline floor)
        effective_buffer = round(max(configured_floor, dynamic_calculated), 2)

        return {
            "effective_buffer": effective_buffer,
            "configured_floor": round(configured_floor, 2),
            "near_term_obligations": round(near_term_obligations, 2),
            "burn_buffer": round(burn_buffer, 2),
            "volatility_buffer": round(volatility_buffer, 2),
            "refund_reserve": round(refund_reserve, 2),
            "included_obligations_count": len(obligation_items),
            "included_obligations": obligation_items,
            "formula_description": (
                f"Dynamic Buffer (₹{effective_buffer:,.0f}) = "
                f"Near-Term Obligations (₹{near_term_obligations:,.0f}) + "
                f"7-Day Burn Buffer (₹{burn_buffer:,.0f}) + "
                f"Volatility Buffer (₹{volatility_buffer:,.0f}) + "
                f"Refund Reserve (₹{refund_reserve:,.0f})"
            ),
        }
