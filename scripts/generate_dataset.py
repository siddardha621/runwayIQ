"""
Synthetic Merchant Financial Data Generator.
Generates realistic merchant transaction, settlement, refund, expense, and obligation data
across 10 distinct merchant archetypes with controlled financial event injections.
"""

import os
import json
import random
import datetime
from datetime import timedelta, date
from typing import Dict, List, Any

# Fix random seed for reproducibility
random.seed(42)

ARCHETYPES = [
    {
        "merchant_id": "merch_urbancart",
        "business_name": "UrbanCart Direct",
        "business_type": "D2C_RETAIL",
        "starting_balance": 520000.0,
        "minimum_operating_cash": 160000.0,
        "settlement_cycle": "T+2",
        "history_days": 180,
        "base_daily_txns": 85,
        "avg_order_val": 2200.0,
        "refund_rate": 0.04,
        "growth_rate": -0.001,  # slightly declining
        "description": "Primary Demo: Healthy cash but facing liquidity crunch due to supplier obligations, 14% recent sales dip, and 21% refund surge."
    },
    {
        "merchant_id": "merch_seasonalfest",
        "business_name": "FestiveGifts India",
        "business_type": "GIFTING_SEASONAL",
        "starting_balance": 350000.0,
        "minimum_operating_cash": 120000.0,
        "settlement_cycle": "T+2",
        "history_days": 180,
        "base_daily_txns": 40,
        "avg_order_val": 1800.0,
        "refund_rate": 0.03,
        "growth_rate": 0.005,
        "description": "Seasonal peaks during festive months with low off-season volume."
    },
    {
        "merchant_id": "merch_hypergrowth",
        "business_name": "VoltPulse Gear",
        "business_type": "ELECTRONICS_APPAREL",
        "starting_balance": 280000.0,
        "minimum_operating_cash": 180000.0,
        "settlement_cycle": "T+2",
        "history_days": 180,
        "base_daily_txns": 110,
        "avg_order_val": 3100.0,
        "refund_rate": 0.05,
        "growth_rate": 0.006,  # fast growth
        "description": "Rapid revenue growth, but working capital strained by rapid inventory cycles."
    },
    {
        "merchant_id": "merch_highrefund",
        "business_name": "VelvetCouture",
        "business_type": "FASHION_APPAREL",
        "starting_balance": 410000.0,
        "minimum_operating_cash": 150000.0,
        "settlement_cycle": "T+2",
        "history_days": 180,
        "base_daily_txns": 70,
        "avg_order_val": 2600.0,
        "refund_rate": 0.16,  # inherently high refunds
        "growth_rate": 0.001,
        "description": "High return rate fashion retailer with volatile net settlements."
    },
    {
        "merchant_id": "merch_saasflow",
        "business_name": "CloudMetric Technologies",
        "business_type": "B2B_SAAS",
        "starting_balance": 650000.0,
        "minimum_operating_cash": 200000.0,
        "settlement_cycle": "T+1",
        "history_days": 180,
        "base_daily_txns": 25,
        "avg_order_val": 8500.0,
        "refund_rate": 0.01,
        "growth_rate": 0.003,
        "description": "Predictable recurring monthly billings on the 1st and 15th."
    },
    {
        "merchant_id": "merch_weekendcafe",
        "business_name": "Roast & Toast Eateries",
        "business_type": "FOOD_BEVERAGE",
        "starting_balance": 190000.0,
        "minimum_operating_cash": 80000.0,
        "settlement_cycle": "T+1",
        "history_days": 180,
        "base_daily_txns": 140,
        "avg_order_val": 650.0,
        "refund_rate": 0.01,
        "growth_rate": 0.001,
        "description": "Heavy Friday-Sunday sales spikes with lower weekday volumes."
    },
    {
        "merchant_id": "merch_lowmargin",
        "business_name": "Apex Component Distro",
        "business_type": "HARDWARE_SUPPLIES",
        "starting_balance": 310000.0,
        "minimum_operating_cash": 220000.0,
        "settlement_cycle": "T+3",
        "history_days": 180,
        "base_daily_txns": 30,
        "avg_order_val": 12000.0,
        "refund_rate": 0.02,
        "growth_rate": 0.001,
        "description": "Very thin 6% margins with high supplier payables; vulnerable to settlement lags."
    },
    {
        "merchant_id": "merch_declining",
        "business_name": "Heritage Bookstore Online",
        "business_type": "MEDIA_BOOKS",
        "starting_balance": 180000.0,
        "minimum_operating_cash": 90000.0,
        "settlement_cycle": "T+2",
        "history_days": 180,
        "base_daily_txns": 45,
        "avg_order_val": 950.0,
        "refund_rate": 0.03,
        "growth_rate": -0.004,  # steadily declining
        "description": "Sustained revenue drop eroding safety buffer."
    },
    {
        "merchant_id": "merch_volatile",
        "business_name": "Zenith Import Export",
        "business_type": "WHOLESALE_TRADING",
        "starting_balance": 720000.0,
        "minimum_operating_cash": 250000.0,
        "settlement_cycle": "T+2",
        "history_days": 180,
        "base_daily_txns": 12,
        "avg_order_val": 35000.0,
        "refund_rate": 0.03,
        "growth_rate": 0.001,
        "description": "Lumpy, erratic order volumes causing high cash variance."
    },
    {
        "merchant_id": "merch_newonboard",
        "business_name": "KiteAura Boutique",
        "business_type": "HOME_DECOR",
        "starting_balance": 120000.0,
        "minimum_operating_cash": 50000.0,
        "settlement_cycle": "T+2",
        "history_days": 9,  # Only 9 days of history!
        "base_daily_txns": 18,
        "avg_order_val": 1400.0,
        "refund_rate": 0.02,
        "growth_rate": 0.01,
        "description": "New onboarding merchant with only 9 days of history. Specifically triggers abstention rule."
    }
]


def generate_synthetic_data(target_dir: str) -> Dict[str, Any]:
    os.makedirs(target_dir, exist_ok=True)
    today = date(2026, 9, 2)  # Base reference date

    dataset = {
        "merchants": [],
        "transactions": [],
        "settlements": [],
        "refunds": [],
        "expenses": [],
        "obligations": [],
        "injected_events": []
    }

    payment_methods = ["UPI", "CARD", "NETBANKING", "WALLET"]
    method_weights = [0.65, 0.22, 0.08, 0.05]

    for arch in ARCHETYPES:
        m_id = arch["merchant_id"]
        history_days = arch["history_days"]
        start_date = today - timedelta(days=history_days)

        merchant_record = {
            "merchant_id": m_id,
            "business_name": arch["business_name"],
            "business_type": arch["business_type"],
            "created_at": datetime.datetime.combine(start_date, datetime.time(9, 0)).isoformat(),
            "starting_balance": arch["starting_balance"],
            "minimum_operating_cash": arch["minimum_operating_cash"],
            "settlement_cycle": arch["settlement_cycle"],
            "currency": "INR",
            "description": arch["description"]
        }
        dataset["merchants"].append(merchant_record)

        # Track daily transactions to build settlements
        daily_txns_map: Dict[date, List[Dict[str, Any]]] = {}

        # 1. Generate Transactions
        for day_offset in range(history_days):
            current_date = start_date + timedelta(days=day_offset)
            is_weekend = current_date.weekday() >= 5

            # Growth / Trend multiplier
            trend = 1.0 + (arch["growth_rate"] * day_offset)

            # Day of week seasonality
            dow_mult = 1.0
            if arch["merchant_id"] == "merch_weekendcafe":
                dow_mult = 1.6 if is_weekend else 0.75
            elif arch["merchant_id"] == "merch_saasflow":
                # Spikes on 1st and 15th
                if current_date.day in [1, 2, 15, 16]:
                    dow_mult = 2.4
                else:
                    dow_mult = 0.5
            else:
                dow_mult = 1.15 if is_weekend else 0.95

            # Injected Events for Demo Persona: UrbanCart
            # Recent sales drop of 14% over last 14 days
            if arch["merchant_id"] == "merch_urbancart" and day_offset >= (history_days - 14):
                dow_mult *= 0.86  # 14% drop

            # Random noise
            noise = random.uniform(0.85, 1.15)
            num_txns = max(1, int(arch["base_daily_txns"] * trend * dow_mult * noise))

            daily_txns_map[current_date] = []

            for t_idx in range(num_txns):
                t_id = f"txn_{m_id}_{current_date.strftime('%Y%m%d')}_{t_idx+1:04d}"
                p_method = random.choices(payment_methods, weights=method_weights)[0]
                
                # Order value variation (log-normal-ish)
                val_noise = random.uniform(0.7, 1.4)
                amount = round(arch["avg_order_val"] * val_noise, 2)

                # Status & Refund logic
                effective_refund_rate = arch["refund_rate"]
                if arch["merchant_id"] == "merch_urbancart" and day_offset >= (history_days - 7):
                    effective_refund_rate *= 1.21  # 21% refund spike in last 7 days!

                is_refunded = random.random() < effective_refund_rate
                status = "REFUNDED" if is_refunded else "SUCCESS"

                txn_time = datetime.datetime.combine(
                    current_date, 
                    datetime.time(random.randint(8, 22), random.randint(0, 59), random.randint(0, 59))
                )

                txn_record = {
                    "transaction_id": t_id,
                    "merchant_id": m_id,
                    "timestamp": txn_time.isoformat(),
                    "amount": amount,
                    "payment_method": p_method,
                    "status": status,
                    "customer_segment": "RETAIL" if random.random() > 0.15 else "SME",
                    "geography": "DOMESTIC",
                    "order_value": amount
                }
                dataset["transactions"].append(txn_record)
                daily_txns_map[current_date].append(txn_record)

                # Create Refund record if refunded
                if is_refunded:
                    refund_delay_days = random.randint(1, 4)
                    refund_date = current_date + timedelta(days=refund_delay_days)
                    if refund_date <= today:
                        ref_record = {
                            "refund_id": f"ref_{t_id}",
                            "transaction_id": t_id,
                            "merchant_id": m_id,
                            "amount": amount,
                            "timestamp": datetime.datetime.combine(refund_date, datetime.time(14, 0)).isoformat(),
                            "reason": random.choice(["CUSTOMER_RETURN", "DEFECTIVE_PRODUCT", "ORDER_CANCELLED", "DELAYED_DELIVERY"])
                        }
                        dataset["refunds"].append(ref_record)

        # 2. Generate Settlements from Successful Transactions
        # Settlement delay: T+2 (or T+1/T+3), fees = 2% + 18% GST = 2.36%
        settlement_lag = int(arch["settlement_cycle"].replace("T+", ""))
        for txn_day, txns in daily_txns_map.items():
            settle_date = txn_day + timedelta(days=settlement_lag)
            
            # Settlement delay injection for UrbanCart over last 3 days
            if arch["merchant_id"] == "merch_urbancart" and txn_day >= (today - timedelta(days=4)):
                settle_date += timedelta(days=2)  # Injected settlement lag

            # Only settle up to today + upcoming 3 days (pending)
            gross_amt = sum(t["amount"] for t in txns if t["status"] == "SUCCESS")
            if gross_amt > 0:
                fee_rate = 0.02
                fees = round(gross_amt * fee_rate, 2)
                taxes = round(fees * 0.18, 2)  # GST
                net_amt = round(gross_amt - fees - taxes, 2)
                
                status = "SETTLED" if settle_date <= today else "PENDING"
                if settle_date > today + timedelta(days=3):
                    continue

                settlement_record = {
                    "settlement_id": f"stl_{m_id}_{txn_day.strftime('%Y%m%d')}",
                    "merchant_id": m_id,
                    "source_transaction_date": txn_day.isoformat(),
                    "settlement_date": settle_date.isoformat(),
                    "gross_amount": gross_amt,
                    "fees": fees,
                    "taxes": taxes,
                    "adjustments": 0.0,
                    "net_amount": net_amt,
                    "status": status
                }
                dataset["settlements"].append(settlement_record)

        # 3. Generate Historical Operating Expenses
        for day_offset in range(history_days):
            current_date = start_date + timedelta(days=day_offset)
            
            # Monthly Payroll on 1st
            if current_date.day == 1:
                payroll_amt = round(arch["starting_balance"] * 0.22, 2)
                dataset["expenses"].append({
                    "expense_id": f"exp_{m_id}_{current_date.strftime('%Y%m%d')}_payroll",
                    "merchant_id": m_id,
                    "date": current_date.isoformat(),
                    "category": "PAYROLL",
                    "amount": payroll_amt,
                    "recurring": True,
                    "priority": "MANDATORY"
                })

            # Monthly Rent on 5th
            if current_date.day == 5:
                rent_amt = round(arch["starting_balance"] * 0.08, 2)
                dataset["expenses"].append({
                    "expense_id": f"exp_{m_id}_{current_date.strftime('%Y%m%d')}_rent",
                    "merchant_id": m_id,
                    "date": current_date.isoformat(),
                    "category": "RENT",
                    "amount": rent_amt,
                    "recurring": True,
                    "priority": "MANDATORY"
                })

            # Utilities on 10th
            if current_date.day == 10:
                dataset["expenses"].append({
                    "expense_id": f"exp_{m_id}_{current_date.strftime('%Y%m%d')}_utils",
                    "merchant_id": m_id,
                    "date": current_date.isoformat(),
                    "category": "UTILITIES",
                    "amount": round(random.uniform(12000, 25000), 2),
                    "recurring": True,
                    "priority": "HIGH"
                })

            # Weekly Marketing
            if current_date.weekday() == 0:  # Monday
                dataset["expenses"].append({
                    "expense_id": f"exp_{m_id}_{current_date.strftime('%Y%m%d')}_mktg",
                    "merchant_id": m_id,
                    "date": current_date.isoformat(),
                    "category": "MARKETING",
                    "amount": round(random.uniform(15000, 40000), 2),
                    "recurring": True,
                    "priority": "HIGH"
                })

            # Bi-weekly Supplier / Inventory restock
            if current_date.day in [12, 26]:
                dataset["expenses"].append({
                    "expense_id": f"exp_{m_id}_{current_date.strftime('%Y%m%d')}_supp",
                    "merchant_id": m_id,
                    "date": current_date.isoformat(),
                    "category": "SUPPLIER",
                    "amount": round(random.uniform(75000, 180000), 2),
                    "recurring": False,
                    "priority": "MANDATORY"
                })

            # Routine Supplier Inventory Restocks (Mon, Wed, Fri) to match realistic COGS
            if current_date.weekday() in [0, 2, 4]:
                txns_today = daily_txns_map.get(current_date, [])
                day_gross = sum(t["amount"] for t in txns_today)
                if arch["merchant_id"] == "merch_urbancart":
                    cogs_pct = 0.88
                elif arch["merchant_id"] == "merch_lowmargin":
                    cogs_pct = 0.85
                else:
                    cogs_pct = 0.78
                # Multiplier for 2.3 days coverage
                cogs_amt = round(day_gross * cogs_pct * 2.3, 2)
                if cogs_amt > 5000:
                    dataset["expenses"].append({
                        "expense_id": f"exp_{m_id}_{current_date.strftime('%Y%m%d')}_cogs",
                        "merchant_id": m_id,
                        "date": current_date.isoformat(),
                        "category": "INVENTORY",
                        "amount": cogs_amt,
                        "recurring": False,
                        "priority": "HIGH"
                    })

        # 4. Generate Upcoming Obligations (Next 30 days)
        # For UrbanCart: specific supplier payment of ₹1,80,000 due in 5 days!
        if arch["merchant_id"] == "merch_urbancart":
            dataset["obligations"].append({
                "obligation_id": f"ob_{m_id}_supplier_critical",
                "merchant_id": m_id,
                "due_date": (today + timedelta(days=5)).isoformat(),
                "amount": 180000.0,
                "category": "SUPPLIER",
                "priority": "MANDATORY",
                "recurring": False,
                "status": "UPCOMING"
            })
            dataset["obligations"].append({
                "obligation_id": f"ob_{m_id}_payroll",
                "merchant_id": m_id,
                "due_date": (today + timedelta(days=28)).isoformat(),
                "amount": 110000.0,
                "category": "PAYROLL",
                "priority": "MANDATORY",
                "recurring": True,
                "status": "UPCOMING"
            })
            dataset["obligations"].append({
                "obligation_id": f"ob_{m_id}_gst_tax",
                "merchant_id": m_id,
                "due_date": (today + timedelta(days=18)).isoformat(),
                "amount": 65000.0,
                "category": "TAX",
                "priority": "MANDATORY",
                "recurring": True,
                "status": "UPCOMING"
            })
            dataset["obligations"].append({
                "obligation_id": f"ob_{m_id}_marketing_agency",
                "merchant_id": m_id,
                "due_date": (today + timedelta(days=12)).isoformat(),
                "amount": 45000.0,
                "category": "MARKETING",
                "priority": "HIGH",
                "recurring": False,
                "status": "UPCOMING"
            })
        else:
            # Generic upcoming obligations for other merchants
            dataset["obligations"].append({
                "obligation_id": f"ob_{m_id}_monthly_payroll",
                "merchant_id": m_id,
                "due_date": (today + timedelta(days=random.randint(10, 25))).isoformat(),
                "amount": round(arch["starting_balance"] * 0.20, 2),
                "category": "PAYROLL",
                "priority": "MANDATORY",
                "recurring": True,
                "status": "UPCOMING"
            })
            dataset["obligations"].append({
                "obligation_id": f"ob_{m_id}_supplier_restock",
                "merchant_id": m_id,
                "due_date": (today + timedelta(days=random.randint(6, 16))).isoformat(),
                "amount": round(arch["starting_balance"] * 0.25, 2),
                "category": "SUPPLIER",
                "priority": "HIGH",
                "recurring": False,
                "status": "UPCOMING"
            })

    # Ground Truth Injected Events for Objective Evaluation
    dataset["injected_events"] = [
        {
            "event_id": "inj_urbancart_sales_drop",
            "merchant_id": "merch_urbancart",
            "type": "REVENUE_DROP",
            "start_date": (today - timedelta(days=14)).isoformat(),
            "magnitude_pct": -14.0,
            "ground_truth_label": "TRUE_ANOMALY"
        },
        {
            "event_id": "inj_urbancart_refund_spike",
            "merchant_id": "merch_urbancart",
            "type": "REFUND_SPIKE",
            "start_date": (today - timedelta(days=7)).isoformat(),
            "magnitude_pct": 21.0,
            "ground_truth_label": "TRUE_ANOMALY"
        },
        {
            "event_id": "inj_urbancart_settlement_delay",
            "merchant_id": "merch_urbancart",
            "type": "SETTLEMENT_DELAY",
            "start_date": (today - timedelta(days=4)).isoformat(),
            "delay_days": 2,
            "ground_truth_label": "TRUE_ANOMALY"
        }
    ]

    # Save to disk
    json_path = os.path.join(target_dir, "synthetic_dataset.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"[DATA GENERATOR] Successfully generated synthetic dataset:")
    print(f" - Merchants: {len(dataset['merchants'])}")
    print(f" - Transactions: {len(dataset['transactions'])}")
    print(f" - Settlements: {len(dataset['settlements'])}")
    print(f" - Refunds: {len(dataset['refunds'])}")
    print(f" - Expenses: {len(dataset['expenses'])}")
    print(f" - Obligations: {len(dataset['obligations'])}")
    print(f" - Injected Events: {len(dataset['injected_events'])}")
    print(f" - Target file: {json_path}")

    return dataset


if __name__ == "__main__":
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    output_directory = os.path.join(current_script_dir, "..", "data", "generated")
    generate_synthetic_data(output_directory)
