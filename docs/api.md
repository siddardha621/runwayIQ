# API Reference: Merchant Cash-Flow Decision Intelligence

Base URL: `/api/v1`

---

### Endpoints Overview

| Method | Path | Summary |
|---|---|---|
| `GET` | `/health` | Service health and model version |
| `GET` | `/merchants` | List all 10 registered merchant archetypes |
| `GET` | `/merchants/{id}` | Single merchant metadata |
| `GET` | `/merchants/{id}/summary` | Executive KPI dashboard ribbon data |
| `GET` | `/merchants/{id}/cashflow` | Daily cash ledger history |
| `GET` | `/merchants/{id}/forecast` | 30-day forecast with uncertainty bands |
| `GET` | `/merchants/{id}/anomalies` | Detected financial anomalies & risk radar |
| `GET` | `/merchants/{id}/obligations` | Upcoming contractual obligations schedule |
| `POST` | `/merchants/{id}/scenario` | Run what-if scenario simulations |
| `POST` | `/merchants/{id}/decision` | Evaluate proposed financial commitment |
| `GET` | `/merchants/{id}/decisions` | Immutable audit trail of evaluated decisions |
| `POST` | `/merchants/{id}/copilot` | Natural-language AI copilot question interface |
| `GET` | `/merchants/{id}/data-quality` | Data quality score and breakdown |
| `GET` | `/models/evaluation` | Offline evaluation metrics vs baselines |

---

### Sample Request: Evaluate Commitment (`POST /merchants/{id}/decision`)
```json
{
  "amount": 200000.0,
  "category": "INVENTORY",
  "commitment_date": "2026-09-03"
}
```

### Sample Response:
```json
{
  "decision_id": "dec_merch_urbancart_20260903001200",
  "decision": "CAUTION",
  "confidence": 0.84,
  "projected_min_cash_without": 305000.0,
  "projected_min_cash_with": 105000.0,
  "minimum_operating_cash": 150000.0,
  "buffer_breach_amount": 45000.0,
  "primary_reasons": [
    "Moderate buffer breach: projected cash falls ₹45,000 below operating buffer of ₹150,000.",
    "₹180,000 in mandatory obligations due within 14 days.",
    "Expected collections are 14.0% below recent 60-day baseline."
  ],
  "recommendation": "Consider delaying the purchase until post-settlement or reducing the initial commitment."
}
```
