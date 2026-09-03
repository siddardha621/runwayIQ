import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.database import Base
from backend.models.merchant import Merchant
from backend.models.settlement import Settlement
from backend.services.scenario_service import ScenarioService
from backend.api.schemas import ScenarioRequest

engine_test = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture
def db_scenario():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()
    ref_date = date(2026, 9, 2)
    start_date = ref_date - timedelta(days=40)

    try:
        m = Merchant(
            merchant_id="scen_m",
            business_name="Scenario Retail",
            business_type="RETAIL",
            created_at=start_date,
            starting_balance=300000.0,
            minimum_operating_cash=100000.0,
            settlement_cycle="T+2",
        )
        db.add(m)

        for i in range(40):
            curr = start_date + timedelta(days=i)
            s = Settlement(
                settlement_id=f"s_scen_{i}",
                merchant_id="scen_m",
                source_transaction_date=curr - timedelta(days=2),
                settlement_date=curr,
                gross_amount=15000.0,
                fees=300.0,
                taxes=50.0,
                adjustments=0.0,
                net_amount=14650.0,
                status="SETTLED",
            )
            db.add(s)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine_test)


def test_scenario_stress_simulation(db_scenario):
    # Simulate 25% revenue drop
    req = ScenarioRequest(revenue_change_pct=-25.0)
    res = ScenarioService.simulate_scenario(db_scenario, "scen_m", req, as_of_date=date(2026, 9, 2))

    assert res["delta_min_cash"] < 0
    assert len(res["trajectory"]) == 30
    assert res["trajectory"][0]["scenario_cash"] <= res["trajectory"][0]["baseline_cash"]
