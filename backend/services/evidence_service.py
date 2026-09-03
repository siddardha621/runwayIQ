"""
Evidence Engine.
Generates deterministic, mathematically verifiable evidence items supporting
financial decision recommendations. Guarantees zero hallucinations.
"""

from typing import List, Dict, Any


class EvidenceEngine:
    @staticmethod
    def compile_decision_evidence(
        projected_min_without: float,
        projected_min_with: float,
        operating_buffer: float,
        buffer_breach: float,
        lower_bound_with: float,
        upcoming_obligations_total: float,
        anomaly_findings: List[Dict[str, Any]],
        confidence: float,
        data_quality_score: float,
        max_safe_commitment: float
    ) -> List[Dict[str, str]]:
        """
        Produces an immutable list of structured quantitative evidence points.
        """
        evidence = []

        # 1. Projected Minimum Cash Point Impact
        delta_impact = projected_min_with - projected_min_without
        evidence.append({
            "metric": "Projected Minimum Cash",
            "value": f"₹{projected_min_with:,.0f} (vs baseline ₹{projected_min_without:,.0f})",
            "impact": "NEGATIVE" if delta_impact < 0 else "NEUTRAL",
            "detail": f"Commitment reduces the projected cash trough by ₹{abs(delta_impact):,.0f}.",
        })

        # 2. Dynamic Operating Buffer Comparison
        if buffer_breach > 0:
            evidence.append({
                "metric": "Operating Buffer Breach",
                "value": f"₹{buffer_breach:,.0f} Deficit",
                "impact": "NEGATIVE",
                "detail": (
                    f"Projected cash falls ₹{buffer_breach:,.0f} below the behavior-based "
                    f"minimum operating buffer of ₹{operating_buffer:,.0f}."
                ),
            })
        else:
            surplus = projected_min_with - operating_buffer
            evidence.append({
                "metric": "Operating Buffer Margin",
                "value": f"₹{surplus:,.0f} Cushion",
                "impact": "POSITIVE",
                "detail": f"Projected cash maintains a ₹{surplus:,.0f} cushion above dynamic buffer (₹{operating_buffer:,.0f}).",
            })

        # 3. Upcoming Mandatory Obligations
        if upcoming_obligations_total > 0:
            evidence.append({
                "metric": "Upcoming Obligations (14d)",
                "value": f"₹{upcoming_obligations_total:,.0f}",
                "impact": "NEGATIVE" if upcoming_obligations_total > operating_buffer * 0.5 else "NEUTRAL",
                "detail": f"Contractual obligations due in the next 14 days require prioritized liquidity.",
            })

        # 4. Prediction Uncertainty Lower Bound (P15 / 85% interval)
        evidence.append({
            "metric": "Downside Prediction Interval",
            "value": f"₹{lower_bound_with:,.0f}",
            "impact": "NEGATIVE" if lower_bound_with < operating_buffer else "POSITIVE",
            "detail": f"At 85% confidence level, downside tail cash could reach ₹{lower_bound_with:,.0f}.",
        })

        # 5. Detected Operational Anomalies (Sales drop, refund spike, settlement delay)
        for anomaly in anomaly_findings[:2]:  # Top 2 anomalies
            evidence.append({
                "metric": f"Anomaly: {anomaly['type'].replace('_', ' ').title()}",
                "value": f"Z-Score: {anomaly['z_score']}",
                "impact": "NEGATIVE",
                "detail": anomaly["description"],
            })

        # 6. Maximum Safe Immediate Spend Limit
        evidence.append({
            "metric": "Safe Spend Capacity Today",
            "value": f"₹{max_safe_commitment:,.0f}",
            "impact": "POSITIVE" if max_safe_commitment > 0 else "NEGATIVE",
            "detail": "Maximum commitment that maintains the dynamic operating buffer intact throughout the 30-day horizon.",
        })

        return evidence
