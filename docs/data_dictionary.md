# Data Dictionary: Merchant Cash-Flow Decision Intelligence System

This document describes all relational database entities and their financial semantics.

---

### 1. Merchant (`merchants`)
Represents the business profile and baseline financial policy.

| Field | Type | Description |
|---|---|---|
| `merchant_id` | `VARCHAR(50)` (PK) | Unique merchant identifier (e.g. `merch_urbancart`) |
| `business_name` | `VARCHAR(100)` | Legal/trade name of the merchant |
| `business_type` | `VARCHAR(50)` | Industry category (`D2C_RETAIL`, `B2B_SAAS`, etc.) |
| `created_at` | `DATETIME` | Onboarding timestamp |
| `starting_balance` | `FLOAT` | Initial working capital balance in INR |
| `minimum_operating_cash` | `FLOAT` | Merchant's configured minimum safety buffer floor |
| `settlement_cycle` | `VARCHAR(20)` | Settlement turnaround schedule (e.g. `T+1`, `T+2`, `T+3`) |
| `currency` | `VARCHAR(10)` | Currency code (`INR`) |

---

### 2. Transaction (`transactions`)
Customer payment attempts captured via payment gateway.

| Field | Type | Description |
|---|---|---|
| `transaction_id` | `VARCHAR(50)` (PK) | Unique transaction ID |
| `merchant_id` | `VARCHAR(50)` (FK) | Foreign key to `merchants` |
| `timestamp` | `DATETIME` | Transaction capture timestamp |
| `amount` | `FLOAT` | Gross payment amount in INR |
| `payment_method` | `VARCHAR(30)` | Instrument used (`UPI`, `CARD`, `NETBANKING`, `WALLET`) |
| `status` | `VARCHAR(30)` | Transaction status (`SUCCESS`, `FAILED`, `REFUNDED`) |
| `customer_segment` | `VARCHAR(30)` | Retail vs SME customer |
| `geography` | `VARCHAR(30)` | Domestic or International |
| `order_value` | `FLOAT` | Nominal cart order value |

---

### 3. Settlement (`settlements`)
Batch payouts disbursed from payment gateway to the merchant's bank account.

| Field | Type | Description |
|---|---|---|
| `settlement_id` | `VARCHAR(50)` (PK) | Unique settlement payout ID |
| `merchant_id` | `VARCHAR(50)` (FK) | Foreign key to `merchants` |
| `source_transaction_date` | `DATE` | Origin transaction date batch |
| `settlement_date` | `DATE` | Bank credit arrival date ($T+k$) |
| `gross_amount` | `FLOAT` | Aggregate gross transaction volume |
| `fees` | `FLOAT` | Payment aggregator fee deduction (e.g. 2%) |
| `taxes` | `FLOAT` | GST on fees (18%) |
| `adjustments` | `FLOAT` | Chargeback or dispute adjustments |
| `net_amount` | `FLOAT` | **Net cash inflow credited to bank** |
| `status` | `VARCHAR(30)` | `SETTLED`, `PENDING`, `DELAYED` |

---

### 4. Refund (`refunds`)
Customer chargebacks and returns deducted from merchant balance.

| Field | Type | Description |
|---|---|---|
| `refund_id` | `VARCHAR(50)` (PK) | Unique refund ID |
| `transaction_id` | `VARCHAR(50)` (FK) | Associated original transaction |
| `merchant_id` | `VARCHAR(50)` (FK) | Foreign key to `merchants` |
| `amount` | `FLOAT` | Refunded amount |
| `timestamp` | `DATETIME` | Refund processing timestamp |
| `reason` | `VARCHAR(100)` | Return reason |

---

### 5. Expense (`expenses`)
Operating expenses paid out of merchant cash.

| Field | Type | Description |
|---|---|---|
| `expense_id` | `VARCHAR(50)` (PK) | Unique expense ID |
| `merchant_id` | `VARCHAR(50)` (FK) | Foreign key to `merchants` |
| `date` | `DATE` | Outflow execution date |
| `category` | `VARCHAR(50)` | `PAYROLL`, `INVENTORY`, `MARKETING`, `RENT`, `SUPPLIER`, `TAX` |
| `amount` | `FLOAT` | Amount debited |
| `recurring` | `BOOLEAN` | Whether expense is scheduled recurring |
| `priority` | `VARCHAR(20)` | `MANDATORY`, `HIGH`, `MEDIUM`, `DISCRETIONARY` |

---

### 6. Obligation (`obligations`)
Upcoming contractual financial commitments due in future horizons.

| Field | Type | Description |
|---|---|---|
| `obligation_id` | `VARCHAR(50)` (PK) | Unique obligation ID |
| `merchant_id` | `VARCHAR(50)` (FK) | Foreign key to `merchants` |
| `due_date` | `DATE` | Contractual due date |
| `amount` | `FLOAT` | Committed payable amount |
| `category` | `VARCHAR(50)` | Category (`SUPPLIER`, `PAYROLL`, `TAX`, etc.) |
| `priority` | `VARCHAR(20)` | `MANDATORY`, `HIGH`, `MEDIUM` |
| `recurring` | `BOOLEAN` | True if regular cycle |
| `status` | `VARCHAR(20)` | `UPCOMING`, `PAID`, `CANCELLED` |

---

### 7. Decision (`decisions`)
Immutable audit trail of all AI-assisted financial recommendations.

| Field | Type | Description |
|---|---|---|
| `decision_id` | `VARCHAR(50)` (PK) | Unique decision audit ID |
| `merchant_id` | `VARCHAR(50)` (FK) | Foreign key to `merchants` |
| `timestamp` | `DATETIME` | Evaluation timestamp |
| `requested_action` | `TEXT` | Proposed outlay amount and details |
| `decision` | `VARCHAR(30)` | `SAFE`, `CAUTION`, `HIGH_RISK`, `INSUFFICIENT_CONFIDENCE` |
| `confidence` | `FLOAT` | Calibrated model confidence (0.0 to 1.0) |
| `evidence` | `TEXT` | JSON list of structured quantitative evidence items |
| `assumptions` | `TEXT` | JSON list of model assumptions |
| `recommendation` | `TEXT` | Natural language action plan |
| `model_version` | `VARCHAR(50)` | Version identifier of model registry |
