"""
Model Registry & Metadata Store.
Tracks active model versions, hyperparameters, and feature definitions.
"""

from typing import Dict, Any


class ModelRegistry:
    CURRENT_VERSION = "v1.2.0-hybrid"

    METADATA = {
        "forecasting": {
            "model_type": "Hybrid GradientBoostingRegressor + Ridge",
            "features": [
                "day_of_week", "day_of_month", "is_weekend", "month",
                "inflow_lag_1", "inflow_lag_2", "inflow_lag_7", "inflow_lag_14",
                "inflow_roll_mean_7", "inflow_roll_std_7"
            ],
            "hyperparameters": {
                "inflow": {"n_estimators": 60, "max_depth": 3, "learning_rate": 0.08},
                "outflow": {"alpha": 1.5, "fit_intercept": True},
            },
            "interval_method": "Empirical Residual-Based Normal/Quantile Band (85% Coverage)",
            "version": CURRENT_VERSION,
        },
        "anomaly": {
            "model_type": "Rolling Z-Score + Isolation Forest",
            "hyperparameters": {"contamination": 0.08, "lookback_days": 30},
            "signals": ["inflow_drop", "refund_spike", "expense_spike", "settlement_delay"],
            "version": CURRENT_VERSION,
        },
        "risk_buffer": {
            "model_type": "Dynamic Operating Cash Buffer",
            "components": ["Near-Term Obligations", "7-Day Burn Buffer", "Volatility Reserve", "Refund Exposure"],
            "version": CURRENT_VERSION,
        }
    }

    @classmethod
    def get_metadata(cls) -> Dict[str, Any]:
        return cls.METADATA
