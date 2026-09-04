import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "model_version" in data


def test_list_merchants_endpoint():
    response = client.get("/api/v1/merchants")
    assert response.status_code == 200
    merchants = response.json()
    assert len(merchants) >= 10
    merchant_ids = [m["merchant_id"] for m in merchants]
    assert "merch_urbancart" in merchant_ids
    assert "merch_newonboard" in merchant_ids


def test_merchant_summary_endpoint():
    response = client.get("/api/v1/merchants/merch_urbancart/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["merchant_id"] == "merch_urbancart"
    assert data["current_cash"] > 0
    assert data["minimum_operating_cash"] > 0
    assert data["data_quality_score"] > 0
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]


def test_merchant_cashflow_endpoint():
    response = client.get("/api/v1/merchants/merch_urbancart/cashflow")
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) >= 100
    assert data["current_balance"] > 0


def test_merchant_forecast_endpoint():
    response = client.get("/api/v1/merchants/merch_urbancart/forecast?horizon_days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["horizon_days"] == 30
    assert len(data["points"]) == 30
    assert data["confidence"] > 0.60


def test_evaluate_decision_caution_for_urbancart():
    # Evaluating ₹2,00,000 inventory outlay for UrbanCart should trigger CAUTION due to upcoming supplier bill
    payload = {
        "amount": 200000.0,
        "category": "INVENTORY",
        "commitment_date": "2026-09-03"
    }
    response = client.post("/api/v1/merchants/merch_urbancart/decision", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] in ["CAUTION", "HIGH_RISK"]
    assert len(data["evidence"]) >= 3
    assert len(data["safer_alternatives"]) >= 1


def test_evaluate_decision_abstention_for_new_merchant():
    # New onboarding merchant with only 9 days history must trigger abstention
    payload = {
        "amount": 30000.0,
        "category": "INVENTORY",
    }
    response = client.post("/api/v1/merchants/merch_newonboard/decision", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "INSUFFICIENT_CONFIDENCE"
    assert data["abstention_reason"] is not None


def test_scenario_simulation_endpoint():
    payload = {
        "revenue_change_pct": -15.0,
        "refund_change_pct": 20.0,
        "settlement_delay_days": 2,
    }
    response = client.post("/api/v1/merchants/merch_urbancart/scenario", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["delta_min_cash"] < 0
    assert len(data["trajectory"]) == 30


def test_copilot_chat_intent_endpoint():
    payload = {"question": "Can I spend ₹2,00,000 tomorrow?"}
    response = client.post("/api/v1/merchants/merch_urbancart/copilot", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["intent_detected"] == "EVALUATE_COMMITMENT"
    assert "Verdict" in data["response_text"]
    assert len(data["grounded_evidence"]) > 0


def test_models_evaluation_endpoint():
    response = client.get("/api/v1/models/evaluation")
    assert response.status_code == 200
    data = response.json()
    assert "benchmarks" in data
    assert len(data["benchmarks"]) == 4


def test_upload_merchant_statement_csv():
    csv_content = b"Date,Description,Amount,Type\n2026-08-25,Test Inflow,50000.0,INFLOW\n2026-08-26,Test Outflow,15000.0,OUTFLOW\n"
    response = client.post(
        "/api/v1/merchants/merch_urbancart/upload-statement",
        files={"file": ("statement.csv", csv_content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["rows_processed"] == 2
    assert data["inflows_added"] == 1
    assert data["outflows_added"] == 1


def test_upload_statement_with_balance_sync():
    csv_with_balance = (
        b"Date,Description,Credit,Debit,Balance\n"
        b"2026-08-28,Opening Balance,0.0,0.0,850000.00\n"
        b"2026-08-29,Vendor Payout,0.0,20000.00,830000.00\n"
        b"2026-08-30,Client Settlement,120000.00,0.0,950000.00\n"
    )
    response = client.post(
        "/api/v1/merchants/merch_urbancart/upload-statement",
        files={"file": ("hdfc_statement.csv", csv_with_balance, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["closing_balance_extracted"] == 950000.0
    assert data["new_cash"] == 950000.0


def test_upload_excel_statement():
    import io
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Statement"
    ws.append(["Date", "Description", "Credit", "Debit", "Balance"])
    ws.append(["2026-08-25", "Client Payout", 75000.0, 0.0, 875000.0])
    ws.append(["2026-08-26", "Office Supplies", 0.0, 5000.0, 870000.0])

    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    response = client.post(
        "/api/v1/merchants/merch_urbancart/upload-statement",
        files={"file": ("statement.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["rows_processed"] == 2
    assert data["inflows_added"] == 1
    assert data["outflows_added"] == 1
    assert data["closing_balance_extracted"] == 870000.0

