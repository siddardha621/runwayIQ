"""
Feature Engineering for Merchant Cash Flow Forecasting.
Constructs calendar, rolling, and lagged features without lookahead leakage.
"""

from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np


class CashflowFeatureEngineer:
    @staticmethod
    def ledger_to_dataframe(entries: List[Dict[str, Any]]) -> pd.DataFrame:
        """Converts daily ledger entries into a structured time-series DataFrame."""
        df = pd.DataFrame(entries)
        if df.empty:
            return df

        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
        return df

    @classmethod
    def build_forecasting_features(cls, df: pd.DataFrame, target_col: str = "inflows") -> Tuple[pd.DataFrame, pd.Series]:
        """
        Builds feature matrix X and target vector y for supervised tabular forecasting.
        Ensures strict temporal ordering: no future leakage.
        """
        if len(df) < 8:
            return pd.DataFrame(), pd.Series(dtype=float)

        data = df.copy()
        data["date"] = pd.to_datetime(data["date"])

        # Calendar features
        data["day_of_week"] = data["date"].dt.dayofweek
        data["day_of_month"] = data["date"].dt.day
        data["is_weekend"] = data["day_of_week"].isin([5, 6]).astype(int)
        data["month"] = data["date"].dt.month

        # Lag features (strictly past values)
        data[f"{target_col}_lag_1"] = data[target_col].shift(1)
        data[f"{target_col}_lag_2"] = data[target_col].shift(2)
        data[f"{target_col}_lag_7"] = data[target_col].shift(7)
        if len(data) >= 20:
            data[f"{target_col}_lag_14"] = data[target_col].shift(14)
        else:
            data[f"{target_col}_lag_14"] = data[target_col].shift(7)

        # Rolling statistics on past window (shift by 1 to prevent current-step inclusion)
        data[f"{target_col}_roll_mean_7"] = data[target_col].shift(1).rolling(window=7, min_periods=3).mean()
        data[f"{target_col}_roll_std_7"] = data[target_col].shift(1).rolling(window=7, min_periods=3).std().fillna(0.0)

        # Drop NaN rows resulting from shifts
        feature_cols = [
            "day_of_week", "day_of_month", "is_weekend", "month",
            f"{target_col}_lag_1", f"{target_col}_lag_2", f"{target_col}_lag_7", f"{target_col}_lag_14",
            f"{target_col}_roll_mean_7", f"{target_col}_roll_std_7"
        ]

        valid_data = data.dropna(subset=feature_cols + [target_col]).reset_index(drop=True)
        if valid_data.empty:
            return pd.DataFrame(), pd.Series(dtype=float)

        X = valid_data[feature_cols]
        y = valid_data[target_col]
        return X, y

    @classmethod
    def get_single_step_feature_vector(
        cls, 
        history_values: List[float], 
        target_date: pd.Timestamp, 
        target_col: str = "inflows"
    ) -> pd.DataFrame:
        """Constructs a single-row feature vector for forecasting target_date given known history."""
        dow = target_date.dayofweek
        dom = target_date.day
        is_wknd = 1 if dow in [5, 6] else 0
        mo = target_date.month

        l1 = history_values[-1] if len(history_values) >= 1 else 0.0
        l2 = history_values[-2] if len(history_values) >= 2 else l1
        l7 = history_values[-7] if len(history_values) >= 7 else l1
        l14 = history_values[-14] if len(history_values) >= 14 else l7

        recent_7 = history_values[-7:] if len(history_values) >= 7 else history_values
        roll_mean_7 = float(np.mean(recent_7)) if recent_7 else 0.0
        roll_std_7 = float(np.std(recent_7)) if len(recent_7) > 1 else 0.0

        row = {
            "day_of_week": dow,
            "day_of_month": dom,
            "is_weekend": is_wknd,
            "month": mo,
            f"{target_col}_lag_1": l1,
            f"{target_col}_lag_2": l2,
            f"{target_col}_lag_7": l7,
            f"{target_col}_lag_14": l14,
            f"{target_col}_roll_mean_7": roll_mean_7,
            f"{target_col}_roll_std_7": roll_std_7
        }
        return pd.DataFrame([row])
