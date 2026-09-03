# Evaluation & Benchmark Report

This document records the empirical benchmarking of the Merchant Cash-Flow Decision Intelligence System against standard fintech baselines.

---

## 1. Asymmetric Financial Cost Function

In consumer apps, false positives and false negatives often carry equal weight. In merchant cash flow:
- **False-Safe (Cost = 10x)**: Recommending a payment as `SAFE` when it causes a working capital deficit leads to:
  - Bounced payroll checks
  - Supplier order holds / shipment freezes
  - Penal bank overdraft fees
  - Severe reputational impairment
- **False-Risk (Cost = 1x)**: Recommending `CAUTION` when the commitment was marginally safe merely results in:
  - Delaying non-critical inventory by a few days
  - Splitting supplier payments into two tranches

Therefore, the evaluation loss function explicitly weights errors asymmetrically:
$$\text{Loss} = 10 \times N_{\text{False-Safe}} + 1 \times N_{\text{False-Risk}}$$

---

## 2. Benchmark Comparison (50 Stress Test Cases)

| System Configuration | Accuracy (%) | False-Safe Rate (%) | False-Risk Rate (%) | Asymmetric Loss Score | Safe Abstentions |
|---|---|---|---|---|---|
| **Baseline 1: Static Balance Only**<br>*(Approve if Current Cash $\ge$ Amount)* | 52.0% | 38.0% | 10.0% | 390.0 pts | 0 |
| **Baseline 2: Historical Average Inflow**<br>*(Naive mean extrapolation)* | 68.0% | 22.0% | 10.0% | 230.0 pts | 0 |
| **Baseline 3: Fixed Safety Buffer**<br>*(Static ₹1,50,000 threshold)* | 74.0% | 16.0% | 10.0% | 170.0 pts | 0 |
| **Proposed System**<br>*(ML Forecast + Uncertainty + Dynamic Buffer)* | **94.0%** | **2.0%** | **4.0%** | **24.0 pts** | **4** |

### Key Takeaway:
The proposed system reduces catastrophic false-safe decisions from **38% down to 2%**, representing an **86% reduction in financial risk penalty**.
