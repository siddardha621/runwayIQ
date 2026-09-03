import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta
from backend.ml.feature_engineering import CashflowFeatureEngineer
from backend.ml.forecasting import CashflowForecaster


def test_feature_engineering_no_leakage():
    dates = [date(2026, 1, 1) + timedelta(days=i) for i in range(30)]
    inflows = [10000.0 + (i * 200) for i in range(30)]
    outflows = [5000.0 + (i * 100) for i in range(30)]

    df = pd.DataFrame({"date": dates, "inflows": inflows, "outflows": outflows})
    X, y = CashflowFeatureEngineer.build_forecasting_features(df, target_col="inflows")

    assert not X.empty
    assert len(X) == len(y)
    assert "inflows_lag_1" in X.columns
    assert "inflows_lag_7" in X.columns
    # Ensure lag_1 strictly matches prior row
    assert X.iloc[0]["inflows_lag_1"] == df.iloc[len(df) - len(X) - 1]["inflows"]


def test_forecaster_outputs_intervals():
    dates = [date(2026, 1, 1) + timedelta(days=i) for i in range(45)]
    inflows = [25000.0 + np.sin(i) * 5000 for i in range(45)]
    outflows = [15000.0 + (i % 7) * 1000 for i in range(45)]

    df = pd.DataFrame({"date": dates, "inflows": inflows, "outflows": outflows})
    forecaster = CashflowForecaster()
    res = forecaster.fit_and_forecast(df, horizon_days=14, current_balance=200000.0)

    assert res["horizon_days"] == 14
    assert len(res["points"]) == 14
    for pt in res["points"]:
        assert pt["predicted_balance"] >= 0
        assert pt["lower_bound"] <= pt["predicted_balance"]
        assert pt["upper_bound"] >= pt["predicted_balance"]
