# Decision Logic Specification: Deterministic Risk & Decision Engine

The core philosophy of this system is that **the LLM must never decide or calculate financial risk**. All decisions are governed by deterministic, transparent mathematical logic.

---

## 1. Decision States

The system can output exactly four mutually exclusive verdicts:

| Verdict | Meaning | Merchant Action |
|---|---|---|
| `SAFE` | Projected cash remains comfortably above dynamic operating buffer under forecast uncertainty. | Proceed with commitment. |
| `CAUTION` | Projected cash or downside tail breaches the dynamic buffer, but avoids an outright negative balance. | Reduce outlay, split payment into tranches, or defer. |
| `HIGH_RISK` | Commitment causes an outright cash deficit (overdraft) or severe buffer breach (>25% buffer). | Prohibit outlay. High risk of dishonoured bills or frozen operations. |
| `INSUFFICIENT_CONFIDENCE` | Historical data is too shallow (<14 days), data quality is low (<50%), or variance is extreme. | **System abstains** from issuing a financial recommendation. |

---

## 2. Dynamic Minimum Operating Cash Formula

$$\text{Minimum Operating Cash} = \max\left(\text{ConfiguredFloor}, \sum \text{NearTermObligations} + \text{BurnBuffer} + \text{VolatilityBuffer} + \text{RefundReserve}\right)$$

Where:
- $\text{NearTermObligations} = \sum_{\text{due} \le 14d, \text{priority}\in\{\text{MANDATORY}, \text{HIGH}\}} \text{Amount}$
- $\text{BurnBuffer} = 7 \times \text{AvgDailyOutflows}_{30d}$ (1 week of working capital runway)
- $\text{VolatilityBuffer} = 1.44 \times \sigma(\text{NetDailyCashflow}_{30d})$
- $\text{RefundReserve} = 7 \times \text{AvgDailyRefunds}_{14d}$

---

## 3. Deterministic Decision Rules

Let:
- $C_0$ = Current cash balance
- $P_{\text{min\_without}}$ = Projected minimum cash position without commitment
- $P_{\text{min\_with}}$ = Projected minimum cash position with commitment
- $B_{\text{dyn}}$ = Dynamic minimum operating buffer
- $L_{\text{downside}}$ = 85% prediction interval lower bound at minimum cash point
- $D_{\text{breach}} = \max(0, B_{\text{dyn}} - P_{\text{min\_with}})$

### Rule 1: Abstention Gate
$$\text{IF } \text{HistoryDays} < 14 \text{ OR } \text{DataQualityScore} < 50.0 \implies \mathbf{INSUFFICIENT\_CONFIDENCE}$$

### Rule 2: Cash Deficit (Default Risk)
$$\text{IF } P_{\text{min\_with}} < 0 \implies \mathbf{HIGH\_RISK}$$

### Rule 3: Severe Operating Buffer Breach
$$\text{IF } D_{\text{breach}} > 0.25 \times B_{\text{dyn}} \text{ OR } L_{\text{downside}} < 0 \implies \mathbf{HIGH\_RISK}$$

### Rule 4: Moderate Operating Buffer Breach
$$\text{IF } D_{\text{breach}} > 0 \implies \mathbf{CAUTION}$$

### Rule 5: Downside Uncertainty Tail Breach
$$\text{IF } L_{\text{downside}} < B_{\text{dyn}} \implies \mathbf{CAUTION}$$

### Rule 6: Full Safety Cushion
$$\text{IF } P_{\text{min\_with}} \ge B_{\text{dyn}} \text{ AND } L_{\text{downside}} \ge B_{\text{dyn}} \implies \mathbf{SAFE}$$

---

## 4. Maximum Safe Immediate Spend

$$\text{MaxSafeCommitment} = \max\left(0, P_{\text{min\_without}} - B_{\text{dyn}}\right)$$

This metric tells the merchant precisely how much cash can be committed today without violating any buffer constraint across the 30-day forward horizon.
