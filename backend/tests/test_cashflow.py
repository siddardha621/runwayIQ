import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.database import Base
from backend.models.merchant import Merchant
from backend.models.settlement import Settlement
from backend.models.expense import Expense
from backend.services.cashflow_service import CashflowService

# In-memory SQLite for testing
engine_test = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()
    try:
        # Seed minimal merchant
        m = Merchant(
            merchant_id="test_m1",
            business_name="Test Store",
            business_type="RETAIL",
            starting_balance=100000.0,
            minimum_operating_cash=50000.0,
            settlement_cycle="T+2",
        )
        db.add(m)
        db.commit()

        # Day 1: Settlement +20,000, Expense -5,000 -> Net +15,000 -> End: 115,000
        d1 = m.created_at.date()
        s1 = Settlement(
            settlement_id="s1",
            merchant_id="test_m1",
            source_transaction_date=d1 - timedelta(days=2),
            settlement_date=d1,
            gross_amount=20500.0,
            fees=400.0,
            taxes=100.0,
            adjustments=0.0,
            net_amount=20000.0,
            status="SETTLED",
        )
        e1 = Expense(
            expense_id="e1",
            merchant_id="test_m1",
            date=d1,
            category="MARKETING",
            amount=5000.0,
            priority="HIGH",
        )
        db.add_all([s1, e1])
        db.commit()

        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine_test)


def test_cash_ledger_calculation(db_session):
    ledger = CashflowService.get_merchant_ledger(db_session, "test_m1")
    assert ledger["starting_balance"] == 100000.0
    assert ledger["total_inflows"] == 20000.0
    assert ledger["total_outflows"] == 5000.0
    assert ledger["current_balance"] == 115000.0
    assert len(ledger["entries"]) >= 1
    assert ledger["entries"][0]["ending_cash"] == 115000.0


def test_data_quality_scoring_low_history(db_session):
    dq = CashflowService.calculate_data_quality_score(db_session, "test_m1")
    # Low history should trigger warning and non-100 score
    assert dq["history_days"] < 14
    assert len(dq["data_gap_warnings"]) > 0
    assert dq["overall_score"] < 80.0
