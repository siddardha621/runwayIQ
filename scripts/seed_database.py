"""
Database Seeding Script.
Reads data/generated/synthetic_dataset.json and populates the database tables.
"""

import os
import sys
import json
import datetime
from datetime import date

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import Base, engine, SessionLocal
from backend.models.merchant import Merchant
from backend.models.transaction import Transaction
from backend.models.settlement import Settlement
from backend.models.refund import Refund
from backend.models.expense import Expense
from backend.models.obligation import Obligation


def seed_database():
    print("[DB SEED] Creating database tables...")
    Base.metadata.create_all(bind=engine)

    data_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "data", "generated", "synthetic_dataset.json"
    )

    if not os.path.exists(data_path):
        print(f"[DB SEED] Dataset not found at {data_path}. Running generator first...")
        from scripts.generate_dataset import generate_synthetic_data
        out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "generated")
        generate_synthetic_data(out_dir)

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    db = SessionLocal()
    try:
        # Check if already seeded
        existing_merchants = db.query(Merchant).count()
        if existing_merchants > 0:
            print(f"[DB SEED] Database already contains {existing_merchants} merchants. Cleaning existing records...")
            db.query(Refund).delete()
            db.query(Settlement).delete()
            db.query(Transaction).delete()
            db.query(Expense).delete()
            db.query(Obligation).delete()
            db.query(Merchant).delete()
            db.commit()

        print("[DB SEED] Inserting merchants...")
        for m in data["merchants"]:
            merchant = Merchant(
                merchant_id=m["merchant_id"],
                business_name=m["business_name"],
                business_type=m["business_type"],
                created_at=datetime.datetime.fromisoformat(m["created_at"]),
                starting_balance=m["starting_balance"],
                minimum_operating_cash=m["minimum_operating_cash"],
                settlement_cycle=m["settlement_cycle"],
                currency=m["currency"],
            )
            db.add(merchant)
        db.commit()

        print(f"[DB SEED] Inserting {len(data['transactions'])} transactions...")
        tx_batch = []
        for t in data["transactions"]:
            tx = Transaction(
                transaction_id=t["transaction_id"],
                merchant_id=t["merchant_id"],
                timestamp=datetime.datetime.fromisoformat(t["timestamp"]),
                amount=t["amount"],
                payment_method=t["payment_method"],
                status=t["status"],
                customer_segment=t["customer_segment"],
                geography=t["geography"],
                order_value=t["order_value"],
            )
            tx_batch.append(tx)
            if len(tx_batch) >= 1000:
                db.bulk_save_objects(tx_batch)
                db.commit()
                tx_batch = []
        if tx_batch:
            db.bulk_save_objects(tx_batch)
            db.commit()

        print(f"[DB SEED] Inserting {len(data['settlements'])} settlements...")
        st_batch = []
        for s in data["settlements"]:
            st = Settlement(
                settlement_id=s["settlement_id"],
                merchant_id=s["merchant_id"],
                source_transaction_date=date.fromisoformat(s["source_transaction_date"]),
                settlement_date=date.fromisoformat(s["settlement_date"]),
                gross_amount=s["gross_amount"],
                fees=s["fees"],
                taxes=s["taxes"],
                adjustments=s["adjustments"],
                net_amount=s["net_amount"],
                status=s["status"],
            )
            st_batch.append(st)
        db.bulk_save_objects(st_batch)
        db.commit()

        print(f"[DB SEED] Inserting {len(data['refunds'])} refunds...")
        rf_batch = []
        for r in data["refunds"]:
            rf = Refund(
                refund_id=r["refund_id"],
                transaction_id=r["transaction_id"],
                merchant_id=r["merchant_id"],
                amount=r["amount"],
                timestamp=datetime.datetime.fromisoformat(r["timestamp"]),
                reason=r["reason"],
            )
            rf_batch.append(rf)
        db.bulk_save_objects(rf_batch)
        db.commit()

        print(f"[DB SEED] Inserting {len(data['expenses'])} expenses...")
        ex_batch = []
        for e in data["expenses"]:
            ex = Expense(
                expense_id=e["expense_id"],
                merchant_id=e["merchant_id"],
                date=date.fromisoformat(e["date"]),
                category=e["category"],
                amount=e["amount"],
                recurring=e["recurring"],
                priority=e["priority"],
            )
            ex_batch.append(ex)
        db.bulk_save_objects(ex_batch)
        db.commit()

        print(f"[DB SEED] Inserting {len(data['obligations'])} obligations...")
        for o in data["obligations"]:
            ob = Obligation(
                obligation_id=o["obligation_id"],
                merchant_id=o["merchant_id"],
                due_date=date.fromisoformat(o["due_date"]),
                amount=o["amount"],
                category=o["category"],
                priority=o["priority"],
                recurring=o["recurring"],
                status=o["status"],
            )
            db.add(ob)
        db.commit()

        # Seed demo user credentials
        from backend.models.auth import UserAuth, hash_password
        db.query(UserAuth).delete()
        demo_users = [
            ("admin@urbancart.in", "merch_urbancart", "admin123"),
            ("finance@kiteaura.com", "merch_kiteaura", "admin123"),
            ("ops@freshdrop.co", "merch_freshdrop", "admin123"),
            ("accounts@apexlogistics.in", "merch_newonboard", "admin123"),
        ]
        for email, m_id, pwd in demo_users:
            auth_user = UserAuth(
                email=email,
                merchant_id=m_id,
                password_hash=hash_password(pwd),
                role="Merchant Administrator",
            )
            db.add(auth_user)
        db.commit()

        print("[DB SEED] Database seeding completed successfully!")
    except Exception as exc:
        db.rollback()
        print(f"[DB SEED] Error during seeding: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
