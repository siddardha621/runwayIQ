import pytest
import pandas as pd
from datetime import date, timedelta
from backend.ml.anomaly_detection import FinancialAnomalyDetector


def test_anomaly_detection_flags_revenue_drop():
    # Baseline: 30 days of 50k inflows
    dates = [date(2026, 8, 1) + timedelta(days=i) for i in range(30)]
    inflows = [50000.0] * 20 + [25000.0] * 10  # 50% drop in last 10 days
    outflows = [20000.0] * 30
    refunds = [1000.0] * 30
    settle_cnt = [5] * 30

    df = pd.DataFrame({
        "date": dates,
        "inflows": inflows,
        "outflows": outflows,
        "refund_amount": refunds,
        "settlement_count": settle_cnt,
    })

    res = FinancialAnomalyDetector.detect_anomalies(df, ref_date=dates[-1])
    assert len(res["anomalies"]) > 0
    types = [a["type"] for a in res["anomalies"]]
    assert "REVENUE_DROP" in types
    assert res["risk_radar"]["revenue_drop"] > 50.0
