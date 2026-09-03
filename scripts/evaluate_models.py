"""
Offline Model & Decision Engine Evaluation Pipeline.
Evaluates forecasting accuracy, prediction interval calibration, anomaly precision/recall,
and decision asymmetric loss across merchant profiles.
"""

import os
import sys
import json
import numpy as np
import pandas as pd

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.models.database import SessionLocal
from backend.models.merchant import Merchant
from backend.services.cashflow_service import CashflowService
from backend.services.forecast_service import ForecastService
from backend.services.anomaly_service import AnomalyService
from backend.ml.feature_engineering import CashflowFeatureEngineer
from backend.ml.evaluation import EvaluationEngine


def run_evaluation_pipeline():
    print("=" * 70)
    print("MERCHANT CASH-FLOW DECISION INTELLIGENCE — EVALUATION PIPELINE")
    print("=" * 70)

    db = SessionLocal()
    try:
        merchants = db.query(Merchant).all()
        if not merchants:
            print("No merchants found. Please run scripts/seed_database.py first.")
            return

        # 1. Evaluate Forecasting Models (Train on first 80%, Test on last 20%)
        print("\n[1/3] EVALUATING CASH-FLOW FORECASTING ACCURACY & UNCERTAINTY INTERVALS...")
        maes = []
        rmses = []
        mapes = []
        coverages = []

        for m in merchants:
            if m.merchant_id == "merch_newonboard":
                continue  # Skip 9-day merchant for 30-day evaluation
            ledger = CashflowService.get_merchant_ledger(db, m.merchant_id)
            df = CashflowFeatureEngineer.ledger_to_dataframe(ledger["entries"])
            if len(df) < 40:
                continue

            split_idx = int(len(df) * 0.8)
            train_df = df.iloc[:split_idx]
            test_df = df.iloc[split_idx:split_idx + 14]  # 14-day holdout test

            from backend.ml.forecasting import CashflowForecaster
            forecaster = CashflowForecaster()
            res = forecaster.fit_and_forecast(
                train_df,
                horizon_days=len(test_df),
                current_balance=train_df.iloc[-1]["ending_cash"],
                start_date=train_df.iloc[-1]["date"].date(),
                confidence_level=0.85
            )

            y_true = test_df["inflows"].values
            y_pred = np.array([p["predicted_inflow"] for p in res["points"]])
            
            # Cumulative cash balance coverage
            y_true_cash = test_df["ending_cash"].values
            lower = np.array([p["lower_bound"] for p in res["points"]])
            upper = np.array([p["upper_bound"] for p in res["points"]])

            # Evaluate on accuracy and interval coverage
            eval_metrics = EvaluationEngine.evaluate_forecasting(y_true_cash, np.array([p["predicted_balance"] for p in res["points"]]), lower, upper)
            # Inflow specific MAE
            inflow_errors = np.abs(y_true - y_pred)
            maes.append(float(np.mean(inflow_errors)))
            rmses.append(float(np.sqrt(np.mean(inflow_errors ** 2))))
            mapes.append(float(np.mean(inflow_errors / np.maximum(1.0, y_true)) * 100))
            coverages.append(eval_metrics["picp_coverage_pct"])

        print(f" -> Mean Absolute Error (MAE):     ₹{np.mean(maes):,.2f}")
        print(f" -> Root Mean Square Error (RMSE): ₹{np.mean(rmses):,.2f}")
        print(f" -> Mean Absolute Pct Error (MAPE): {np.mean(mapes):.2f}%")
        print(f" -> Prediction Interval Coverage:   {np.mean(coverages):.1f}% (Nominal Target: 85.0%)")

        # 2. Evaluate Anomaly Detection against Ground Truth Injections
        print("\n[2/3] EVALUATING ANOMALY DETECTION AGAINST CONTROLLED INJECTIONS...")
        dataset_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "data", "generated", "synthetic_dataset.json"
        )
        with open(dataset_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
        injected = raw_data.get("injected_events", [])

        anomaly_res = AnomalyService.get_merchant_anomalies(db, "merch_urbancart")
        detected = anomaly_res["anomalies"]
        anom_eval = EvaluationEngine.evaluate_anomaly_detection(injected, detected)

        print(f" -> Injected Ground-Truth Events:  {len(injected)}")
        print(f" -> True Positives Detected:       {anom_eval['true_positives']}")
        print(f" -> False Positives:               {anom_eval['false_positives']}")
        print(f" -> Precision:                     {anom_eval['precision']:.3f}")
        print(f" -> Recall:                        {anom_eval['recall']:.3f}")
        print(f" -> F1-Score:                      {anom_eval['f1_score']:.3f}")

        # 3. Evaluate Decision Engine vs Baselines (Asymmetric Financial Loss)
        print("\n[3/3] EVALUATING DECISION ENGINE BENCHMARKS & ASYMMETRIC LOSS...")
        benchmarks = EvaluationEngine.evaluate_decision_engine_benchmarks()["benchmarks"]
        for b in benchmarks:
            print(f"\n  • {b['name']}")
            print(f"    - Accuracy:              {b['accuracy_pct']}%")
            print(f"    - False-Safe Rate:       {b['false_safe_rate_pct']}%  (Danger: Overdraft/Default)")
            print(f"    - False-Risk Rate:       {b['false_risk_rate_pct']}%  (Warning: Staged Payment)")
            print(f"    - Asymmetric Loss Cost:  {b['asymmetric_loss_penalty']} pts")
            print(f"    - Safe Abstentions:      {b['abstentions']}")

        print("\n" + "=" * 70)
        print("EVALUATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
    finally:
        db.close()


if __name__ == "__main__":
    run_evaluation_pipeline()
