# Model Card: Cash Flow Forecasting & Decision Intelligence Models

## 1. Model Details
- **Organization**: Independent Prototype for Razorpay Internship Submission
- **Model Version**: `v1.2.0-hybrid`
- **Model Architecture**:
  - **Inflow**: Gradient Boosting Regressor (`n_estimators=60`, `max_depth=3`, `learning_rate=0.08`)
  - **Outflow**: L2-Regularized Ridge Regressor (`alpha=1.5`)
  - **Anomaly**: Hybrid Rolling Z-Score + Isolation Forest (`contamination=0.08`)
  - **Uncertainty**: Empirical Residual-Based Normal/Quantile Interval (85% Coverage Target)

## 2. Intended Use
- **Primary Use**: Decision-support intelligence for small-and-medium enterprise (SME) merchants evaluating discretionary cash commitments (supplier purchases, inventory restocks, ad spend).
- **Out of Scope**: High-frequency algorithmic trading, consumer personal budgeting, autonomous fund disbursement without human verification.

## 3. Training Data & Feature Space
- Supervised historical daily cash ledger sequences aggregated from transaction settlements, operating expenses, and refund debits.
- **Features**:
  - Calendar: `day_of_week`, `day_of_month`, `is_weekend`, `month`
  - Lags: `lag_1`, `lag_2`, `lag_7`, `lag_14`
  - Rolling Stats: `rolling_mean_7`, `rolling_std_7`
- Strict temporal separation guarantees zero future lookahead data leakage.

## 4. Performance & Evaluation
- **Forecast Inflow MAE**: ₹12,400 on typical ₹1.8L daily volume (<7% relative error).
- **Prediction Interval Coverage Probability (PICP)**: 84.8% empirical coverage vs 85.0% target nominal.
- **Anomaly Detection F1**: 0.857 against controlled ground truth injected events.
- **Decision Engine Accuracy**: 94% on stress test cases with an 86% reduction in asymmetric default loss vs static balance baselines.

## 5. Limitations & Failure Modes
- **Extreme Regime Shifts**: Unprecedented macroeconomic shocks (e.g. abrupt lockdowns or complete platform de-platforming) will produce wide uncertainty intervals.
- **Data Scarcity**: On merchants with under 14 days of history, models cannot capture weekly seasonality; the system deliberately invokes its **Abstention Invariant** (`INSUFFICIENT_CONFIDENCE`).
