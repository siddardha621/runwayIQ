# Merchant Cash-Flow Decision Intelligence System
### Autonomous Financial Decision-Support System for Merchants Under Cash-Flow Uncertainty
> **Built for Razorpay Bangalore Internship Submission** | Paradigm: **Forecast → Diagnose → Simulate → Decide → Explain**

---

## 1. Problem Statement
Growing merchants frequently make fatal working capital decisions despite positive revenue because **available cash, settlement arrivals, customer refunds, and fixed obligations do not occur simultaneously**. 

Current financial dashboards tell merchants:
- *What happened* (historical accounting)
- *What their balance is today* (current bank status)
- *What their forecast looks like* (passive time-series prediction)

They fail to answer the critical question:
> **"Given my current cash, expected inflows, uncertainty, and upcoming obligations, is a proposed ₹2,00,000 commitment safe, risky, or uncertain?"**

---

## 2. Why This Problem Matters
1. **Asymmetric Insolvency Risk**: In merchant operations, a **False-Safe** recommendation (approving an outlay that causes a working capital deficit) results in bounced payroll, supplier halts, and bank dishonour fees ($10\times$ penalty), whereas a **False-Risk** recommendation merely causes a brief deferral ($1\times$ penalty).
2. **Settlement Latency**: Payment transactions are captured today, but net settlement payouts only arrive $T+2$ days later (less MDR fees and taxes).
3. **Refund Volatility**: Spikes in returns erode cash directly or reduce incoming settlement batches without warning.

---

## 3. The Solution: Decision Intelligence
This system is **NOT** an "AI Cash Flow Forecaster". It is a **Decision-Support Engine** that combines:
1. **Realized Cash Ledger**: Reconciles actual settlement credits ($T+k$), operational expenses, and refund debits.
2. **Dynamic Minimum Operating Buffer**: Calculates a behavioral safety floor based on near-term obligations, 7-day burn rate, net cash volatility ($\sigma$), and refund exposure.
3. **Uncertainty-Calibrated Forecasting**: Predicts future inflows/outflows with 85% prediction interval bands.
4. **Deterministic Decision Engine**: Evaluates commitment safety using hard numerical rules (no LLM hallucinations).
5. **Principled Abstention**: Refuses to output ungrounded advice (`INSUFFICIENT_CONFIDENCE`) when history $< 14$ days or data quality $< 50\%$.
6. **Grounded AI Copilot**: Uses strict templates (and optional LLMs) strictly to synthesize natural language explanations from immutable calculation facts.

---

## 4. Architecture Overview

```
Frontend (React 18 + Vite + Tailwind + Recharts)
  ├── Executive KPI Cards
  ├── Interactive Cash Flow Forecast & Prediction Interval Chart
  ├── Risk Radar & Behavioral Anomaly Breakdown
  ├── Upcoming Obligations Schedule
  ├── What-If Scenario Stress Simulator
  ├── Commitment Decision Center (Evaluate ₹X Outlay)
  └── Fintech AI Copilot (Natural-Language Q&A)
          │  REST API (/api/v1)
          ▼
FastAPI Gateway & Service Layer
  ├── CashflowService (Ledger & Data Quality)
  ├── ForecastService (Multi-Step Lagged ML Regressors)
  ├── AnomalyService (Rolling Z-Scores + Isolation Forest)
  ├── DynamicBufferEngine (Obligations + Volatility + Runway)
  ├── ScenarioService (What-If Shock Stress Testing)
  ├── DecisionEngineService (Deterministic SAFE/CAUTION/HIGH_RISK/ABSTAIN)
  ├── EvidenceEngine (Quantitative Immutable Audit Facts)
  └── ExplanationService (Intent Parser + Grounded Synthesis)
          │  SQLAlchemy ORM
          ▼
Database (SQLite for Zero-Friction Local Run / PostgreSQL for Production)
```

---

## 5. Decision Engine States

| Verdict | Meaning | Action Recommended |
|---|---|---|
| **`SAFE`** | Projected cash remains comfortably above dynamic buffer with surplus. | Proceed with commitment. |
| **`CAUTION`** | Downside prediction tail or projected trough causes a minor buffer breach. | Split payment into tranches, defer until post-settlement, or cap amount. |
| **`HIGH_RISK`** | Commitment causes an outright cash deficit (overdraft) or severe buffer breach (>25%). | Strict outlay hold. Operations or mandatory obligations endangered. |
| **`INSUFFICIENT_CONFIDENCE`** | Insufficient history (<14 days), low data quality (<50%), or severe distribution shift. | **System abstains** from issuing a recommendation to protect merchant. |

---

## 6. Pre-Configured Merchant Archetypes

The synthetic generator creates **10 realistic merchant archetypes** with 6-12 months of daily history:
1. **UrbanCart Direct (`merch_urbancart`) [PRIMARY DEMO]**: Healthy cash balance (~₹5L), but facing an upcoming ₹1.8L supplier invoice in 5 days, a 14% recent sales drop, and a 21% refund surge.
2. **FestiveGifts India (`merch_seasonalfest`)**: Seasonal gifting spikes.
3. **VoltPulse Gear (`merch_hypergrowth`)**: Fast-growing but cash-constrained.
4. **VelvetCouture (`merch_highrefund`)**: Fashion merchant with 16-25% returns.
5. **CloudMetric Tech (`merch_saasflow`)**: B2B SaaS with billings on the 1st and 15th.
6. **Roast & Toast (`merch_weekendcafe`)**: Friday-Sunday sales spikes.
7. **Apex Component (`merch_lowmargin`)**: Thin 6% margins, vulnerable to delays.
8. **Heritage Bookstore (`merch_declining`)**: Steady negative 4% monthly trend.
9. **Zenith Trade (`merch_volatile`)**: High-value lumpy wholesale orders.
10. **KiteAura Boutique (`merch_newonboard`)**: Only 9 days of history. **Specifically demonstrates the Abstention Invariant**.

---

## 7. Quickstart (Run Locally)

### Step 1: Clone and Set Up Python Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r ../requirements.txt
```

### Step 2: Seed Database & Run Evaluation
```bash
# Generates realistic synthetic dataset and initializes database
python ../scripts/seed_database.py

# Run offline benchmark evaluation
python ../scripts/evaluate_models.py
```

### Step 3: Run Backend Server
```bash
uvicorn backend.main:app --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/api/v1/docs`

### Step 4: Run Frontend Dashboard
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 8. Automated Test Suite

Run all unit, integration, and decision engine tests:
```bash
pytest backend/tests -v
```
Verifies:
- Cash ledger balance calculation and settlement lag handling
- Lagged feature generation with zero lookahead leakage
- Anomaly detector precision on injected events
- Deterministic decision matrix across `SAFE`, `CAUTION`, `HIGH_RISK`, and `INSUFFICIENT_CONFIDENCE` fixtures.

---

## 9. 5-Minute Demo Flow (UrbanCart Persona)

1. **Open Dashboard**: Select **UrbanCart Direct**. Observe Current Cash (~₹5.2L) and Dynamic Buffer (~₹1.65L).
2. **Inspect Risk Radar**: Note anomalies flagged: 14% revenue drop and 21% refund surge.
3. **Decision Center**: Enter proposed commitment: **₹2,00,000 on Inventory**.
4. **Click "Evaluate Commitment Safety"**:
   - Verdict: **`CAUTION`**
   - Buffer breach: ₹45,000
   - Evidence: Explains the upcoming ₹1,80,000 supplier bill due in 5 days and recent sales dip.
   - Safer Alternative: Recommends splitting into 2 tranches (₹1,00,000 now + ₹1,00,000 in 12 days) or capping immediate outlay at ₹1,40,000.
5. **Stress Test in Scenario Simulator**: Set "Revenue Change" to **-15%**. The verdict escalates to **`HIGH_RISK`** with an outright cash deficit warning.
6. **Switch Merchant to KiteAura Boutique (`merch_newonboard`)**:
   - Try evaluating any spend.
   - Observe **`INSUFFICIENT_CONFIDENCE`** abstention triggered by the 9-day history rule.

---

## 10. Core Distinctions from Razorpay / Conventional Dashboards
- **Not a passive report**: Evaluates proposed commitments before money leaves the bank.
- **Asymmetric risk weighting**: Formulated to minimize catastrophic default over generic statistical loss.
- **Transparent evidence**: Every reason maps directly to verifiable mathematical equations.
- **Safety abstention**: Knows when *not* to give advice.
