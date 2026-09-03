"""
Cash Flow Forecasting Engine.
Implements Baseline (Seasonal Moving Average) and ML Regressor (Gradient Boosting / Ridge)
with empirical prediction intervals and uncertainty quantification.
"""

from typing import List, Dict, Any, Tuple, Optional
import math
from datetime import date, timedelta
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from backend.ml.feature_engineering import CashflowFeatureEngineer
from backend.core.config import settings


class CashflowForecaster:
    def __init__(self, model_type: str = "gradient_boosting"):
        self.model_type = model_type
        self.inflow_model = None
        self.outflow_model = None
        self.inflow_residual_std = 0.0
        self.outflow_residual_std = 0.0
        self.is_fitted = False

    def fit_and_forecast(
        self,
        history_df: pd.DataFrame,
        horizon_days: int = 30,
        current_balance: float = 0.0,
        start_date: Optional[date] = None,
        confidence_level: float = 0.85
    ) -> Dict[str, Any]:
        """
        Fits separate models for Inflow and Outflow, forecasts horizon_days into the future,
        and constructs uncertainty prediction intervals for cash trajectory.
        """
        ref_date = start_date or date(2026, 9, 2)
        n_obs = len(history_df)

        # 1. Fallback for very small histories (< 14 days)
        if n_obs < 14:
            return self._forecast_naive_baseline(
                history_df, horizon_days, current_balance, ref_date, confidence_penalty=0.45
            )

        # 2. Train ML models for inflows and outflows
        X_in, y_in = CashflowFeatureEngineer.build_forecasting_features(history_df, target_col="inflows")
        X_out, y_out = CashflowFeatureEngineer.build_forecasting_features(history_df, target_col="outflows")

        if len(X_in) < 6 or len(X_out) < 6:
            return self._forecast_naive_baseline(
                history_df, horizon_days, current_balance, ref_date, confidence_penalty=0.25
            )

        # Inflow model
        self.inflow_model = GradientBoostingRegressor(
            n_estimators=60, max_depth=3, learning_rate=0.08, random_state=42
        )
        self.inflow_model.fit(X_in, y_in)
        preds_in = self.inflow_model.predict(X_in)
        self.inflow_residual_std = float(np.std(y_in - preds_in)) if len(y_in) > 1 else 1000.0

        # Outflow model (often lumpier, Ridge regularized avoids overfitting)
        self.outflow_model = Ridge(alpha=1.5, random_state=42)
        self.outflow_model.fit(X_out, y_out)
        preds_out = self.outflow_model.predict(X_out)
        self.outflow_residual_std = float(np.std(y_out - preds_out)) if len(y_out) > 1 else 1000.0

        self.is_fitted = True

        # 3. Multi-step recursive/roll-forward forecast
        inflow_history = list(history_df["inflows"].values)
        outflow_history = list(history_df["outflows"].values)

        forecast_points = []
        running_cash = current_balance
        cum_variance = 0.0

        # Z-score for confidence level (0.85 -> ~1.44, 0.90 -> 1.645)
        # Using normal approximation:
        z_multiplier = 1.44 if confidence_level <= 0.85 else 1.645

        for step in range(1, horizon_days + 1):
            f_date = ref_date + timedelta(days=step)
            f_ts = pd.Timestamp(f_date)

            # Predict Inflow
            feat_in = CashflowFeatureEngineer.get_single_step_feature_vector(
                inflow_history, f_ts, target_col="inflows"
            )
            # Ensure column order matches
            feat_in = feat_in[X_in.columns]
            pred_inflow = max(0.0, float(self.inflow_model.predict(feat_in)[0]))

            # Predict Outflow
            feat_out = CashflowFeatureEngineer.get_single_step_feature_vector(
                outflow_history, f_ts, target_col="outflows"
            )
            feat_out = feat_out[X_out.columns]
            pred_outflow = max(0.0, float(self.outflow_model.predict(feat_out)[0]))

            # Update rolling history for next step
            inflow_history.append(pred_inflow)
            outflow_history.append(pred_outflow)

            # Update cash balance trajectory
            net_change = pred_inflow - pred_outflow
            running_cash += net_change

            # Accumulated uncertainty over time horizon
            # Variance accumulates with forecast horizon sqrt(step)
            step_var = (self.inflow_residual_std ** 2) + (self.outflow_residual_std ** 2)
            cum_variance += step_var
            step_std = math.sqrt(cum_variance)

            interval_margin = z_multiplier * step_std
            lower_bound = max(0.0, running_cash - interval_margin)
            upper_bound = running_cash + interval_margin

            forecast_points.append({
                "date": f_date,
                "predicted_inflow": round(pred_inflow, 2),
                "predicted_outflow": round(pred_outflow, 2),
                "predicted_balance": round(running_cash, 2),
                "lower_bound": round(lower_bound, 2),
                "upper_bound": round(upper_bound, 2),
            })

        # Calculate forecast confidence score (0.0 to 1.0)
        # Based on data length, residual relative error, and horizon
        avg_inflow = float(np.mean(history_df["inflows"].tail(30))) if not history_df.empty else 1.0
        cv_error = min(1.0, (self.inflow_residual_std / max(1.0, avg_inflow)))
        base_confidence = max(0.40, min(0.95, 1.0 - (0.4 * cv_error)))
        if n_obs >= 90:
            confidence = min(0.92, base_confidence + 0.05)
        elif n_obs >= 30:
            confidence = base_confidence
        else:
            confidence = base_confidence * 0.85

        return {
            "method": "GradientBoosting+Ridge Regressor (Multi-Step Lagged)",
            "confidence": round(confidence, 2),
            "horizon_days": horizon_days,
            "forecast_date": ref_date,
            "inflow_residual_std": round(self.inflow_residual_std, 2),
            "outflow_residual_std": round(self.outflow_residual_std, 2),
            "points": forecast_points,
        }

    def _forecast_naive_baseline(
        self,
        history_df: pd.DataFrame,
        horizon_days: int,
        current_balance: float,
        ref_date: date,
        confidence_penalty: float = 0.3
    ) -> Dict[str, Any]:
        """7-Day Seasonal Moving Average Naive Baseline."""
        if history_df.empty:
            mean_in = 50000.0
            mean_out = 30000.0
            std_in = 15000.0
            std_out = 10000.0
        else:
            recent_in = history_df["inflows"].tail(7).values
            recent_out = history_df["outflows"].tail(7).values
            mean_in = float(np.mean(recent_in)) if len(recent_in) > 0 else 50000.0
            mean_out = float(np.mean(recent_out)) if len(recent_out) > 0 else 30000.0
            std_in = float(np.std(recent_in)) if len(recent_in) > 1 else mean_in * 0.3
            std_out = float(np.std(recent_out)) if len(recent_out) > 1 else mean_out * 0.3

        forecast_points = []
        running_cash = current_balance
        cum_var = 0.0

        for step in range(1, horizon_days + 1):
            f_date = ref_date + timedelta(days=step)
            # Day-of-week seasonality from recent 7 days if available
            day_idx = (step - 1) % len(recent_in) if len(recent_in) > 0 else 0
            p_in = float(recent_in[day_idx]) if len(recent_in) > 0 else mean_in
            p_out = float(recent_out[day_idx]) if len(recent_out) > 0 else mean_out

            running_cash += (p_in - p_out)
            cum_var += (std_in ** 2 + std_out ** 2)
            margin = 1.44 * math.sqrt(cum_var)

            forecast_points.append({
                "date": f_date,
                "predicted_inflow": round(p_in, 2),
                "predicted_outflow": round(p_out, 2),
                "predicted_balance": round(running_cash, 2),
                "lower_bound": round(max(0.0, running_cash - margin), 2),
                "upper_bound": round(running_cash + margin, 2),
            })

        confidence = round(max(0.20, min(0.65, 0.70 - confidence_penalty)), 2)

        return {
            "method": "7-Day Seasonal Moving Average Baseline (Limited History)",
            "confidence": confidence,
            "horizon_days": horizon_days,
            "forecast_date": ref_date,
            "inflow_residual_std": round(std_in, 2),
            "outflow_residual_std": round(std_out, 2),
            "points": forecast_points,
        }
