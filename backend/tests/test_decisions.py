import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.database import Base
from backend.models.merchant import Merchant
from backend.models.obligation import Obligation
from backend.models.settlement import Settlement
from backend.models.expense import Expense
from backend.services.decision_service import DecisionEngineService
from backend.api.schemas import DecisionRequest
from backend.core.constants import DecisionVerdict

engine_test = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture
def setup_merchants():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()
    ref_date = date(2026, 9, 2)
    start_date = ref_date - timedelta(days=60)

    try:
        # Merchant 1: Mature merchant with 60 days history
        m_mature = Merchant(
            merchant_id="mature_m",
            business_name="Mature Corp",
            business_type="D2C",
            created_at=start_date,
            starting_balance=500000.0,
            minimum_operating_cash=150000.0,
            settlement_cycle="T+2",
        )
        db.add(m_mature)

        # Populate 60 days of steady settlements (₹20,000/day) and expenses (₹10,000/day)
        for i in range(60):
            curr = start_date + timedelta(days=i)
            s = Settlement(
                settlement_id=f"s_{i}",
                merchant_id="mature_m",
                source_transaction_date=curr - timedelta(days=2),
                settlement_date=curr,
                gross_amount=20500.0,
                fees=400.0,
                taxes=100.0,
                adjustments=0.0,
                net_amount=20000.0,
                status="SETTLED",
            )
            e = Expense(
                expense_id=f"e_{i}",
                merchant_id="mature_m",
                date=curr,
                category="OPERATIONS",
                amount=10000.0,
                priority="HIGH",
            )
            db.add_all([s, e])

        # Add mandatory obligation of ₹2,50,000 due in 5 days
        ob = Obligation(
            obligation_id="ob_heavy",
            merchant_id="mature_m",
            due_date=ref_date + timedelta(days=5),
            amount=250000.0,
            category="SUPPLIER",
            priority="MANDATORY",
            status="UPCOMING",
        )
        db.add(ob)

        # Merchant 2: Brand new onboarding merchant (9 days history)
        m_new = Merchant(
            merchant_id="new_m",
            business_name="Fresh Store",
            business_type="RETAIL",
            created_at=ref_date - timedelta(days=9),
            starting_balance=100000.0,
            minimum_operating_cash=50000.0,
            settlement_cycle="T+2",
        )
        db.add(m_new)

        for i in range(9):
            curr = ref_date - timedelta(days=9 - i)
            s = Settlement(
                settlement_id=f"sn_{i}",
                merchant_id="new_m",
                source_transaction_date=curr - timedelta(days=2),
                settlement_date=curr,
                gross_amount=5000.0,
                fees=100.0,
                taxes=20.0,
                adjustments=0.0,
                net_amount=4880.0,
                status="SETTLED",
            )
            db.add(s)

        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine_test)


def test_deterministic_high_risk_decision(setup_merchants):
    """
    Given: Current Cash ~₹11L, but mandatory obligation = ₹2.5L, buffer is high.
    Proposed huge expense = ₹10,00,000.
    Expected: HIGH_RISK due to severe buffer breach / deficit.
    """
    db = setup_merchants
    req = DecisionRequest(amount=1000000.0, category="EXPANSION")
    res = DecisionEngineService.evaluate_commitment(db, "mature_m", req, as_of_date=date(2026, 9, 2))

    assert res["decision"] == DecisionVerdict.HIGH_RISK
    assert res["buffer_breach_amount"] > 0
    assert len(res["evidence"]) > 0
    assert len(res["safer_alternatives"]) > 0


def test_deterministic_safe_decision(setup_merchants):
    """
    Given: Small routine expense of ₹15,000 with large buffer surplus.
    Expected: SAFE.
    """
    db = setup_merchants
    req = DecisionRequest(amount=15000.0, category="SUPPLIER")
    res = DecisionEngineService.evaluate_commitment(db, "mature_m", req, as_of_date=date(2026, 9, 2))

    assert res["decision"] == DecisionVerdict.SAFE
    assert res["buffer_breach_amount"] == 0.0


def test_abstention_on_insufficient_history(setup_merchants):
    """
    Given: Merchant with only 9 days history (< 14 days minimum threshold).
    Expected: Abstention rule triggers INSUFFICIENT_CONFIDENCE.
    """
    db = setup_merchants
    req = DecisionRequest(amount=25000.0, category="MARKETING")
    res = DecisionEngineService.evaluate_commitment(db, "new_m", req, as_of_date=date(2026, 9, 2))

    assert res["decision"] == DecisionVerdict.INSUFFICIENT_CONFIDENCE
    assert res["abstention_reason"] is not None
    assert "minimum" in res["abstention_reason"].lower() or "insufficient" in res["abstention_reason"].lower()
