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


def _get_test_merchant():
    from backend.models.database import SessionLocal
    from backend.models.merchant import Merchant
    import datetime
    db = SessionLocal()
    m = db.query(Merchant).filter(Merchant.merchant_id == "merch_test_isolated").first()
    if not m:
        m = Merchant(
            merchant_id="merch_test_isolated",
            business_name="Test Store Isolated",
            business_type="D2C",
            created_at=datetime.datetime(2026, 6, 1),
            starting_balance=500000.0,
            minimum_operating_cash=100000.0,
            settlement_cycle="T+2",
            currency="INR",
        )
        db.add(m)
        db.commit()
    db.close()
    return "merch_test_isolated"


def test_upload_merchant_statement_csv():
    m_id = _get_test_merchant()
    csv_content = b"Date,Description,Amount,Type\n2026-08-25,Test Inflow,50000.0,INFLOW\n2026-08-26,Test Outflow,15000.0,OUTFLOW\n"
    response = client.post(
        f"/api/v1/merchants/{m_id}/upload-statement",
        files={"file": ("statement.csv", csv_content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["rows_processed"] == 2
    assert data["inflows_added"] == 1
    assert data["outflows_added"] == 1


def test_upload_statement_with_balance_sync():
    m_id = _get_test_merchant()
    csv_with_balance = (
        b"Date,Description,Credit,Debit,Balance\n"
        b"2026-08-28,Opening Balance,0.0,0.0,850000.00\n"
        b"2026-08-29,Vendor Payout,0.0,20000.00,830000.00\n"
        b"2026-08-30,Client Settlement,120000.00,0.0,950000.00\n"
    )
    response = client.post(
        f"/api/v1/merchants/{m_id}/upload-statement",
        files={"file": ("hdfc_statement.csv", csv_with_balance, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["closing_balance_extracted"] == 950000.0
    assert data["new_cash"] == 950000.0


def test_upload_excel_statement():
    m_id = _get_test_merchant()
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
        f"/api/v1/merchants/{m_id}/upload-statement",
        files={"file": ("statement.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["rows_processed"] == 2
    assert data["inflows_added"] == 1
    assert data["outflows_added"] == 1
    assert data["closing_balance_extracted"] == 870000.0


def test_upload_statement_with_hdfc_bank_format():
    m_id = _get_test_merchant()
    statement = (
        b"Txn Date,Particulars,Withdrawal Amt.,Deposit Amt.,Closing Balance (INR)\n"
        b"28-Aug-2026,UPI-SETTLEMENT-PAYOUT,0.0,95000.00,980000.00\n"
        b"29-Aug-2026,SUPPLIER RAW MATERIALS,42000.00,0.0,938000.00\n"
    )
    response = client.post(
        f"/api/v1/merchants/{m_id}/upload-statement",
        files={"file": ("hdfc_aug_statement.csv", statement, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["rows_processed"] == 2
    assert data["inflows_added"] == 1
    assert data["outflows_added"] == 1
    assert data["closing_balance_extracted"] == 938000.0
    assert data["new_cash"] == 938000.0
    assert len(data["preview_rows"]) == 2


def test_upload_statement_with_manual_balance_override():
    m_id = _get_test_merchant()
    csv_data = b"Date,Description,Amount,Type\n2026-08-30,Retail Inflow,30000.0,INFLOW\n"
    response = client.post(
        f"/api/v1/merchants/{m_id}/upload-statement",
        files={"file": ("inflow_only.csv", csv_data, "text/csv")},
        data={"closing_balance": "1050000.00"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["closing_balance_extracted"] == 1050000.0
    assert data["new_cash"] == 1050000.0


def test_get_merchant_statement_history():
    m_id = _get_test_merchant()
    response = client.get(f"/api/v1/merchants/{m_id}/statement-history")
    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert "current_balance" in data
    assert "total_credits" in data
    assert "total_debits" in data


def test_login_or_register_new_merchant_with_real_email():
    import uuid
    unique_email = f"fresh_{uuid.uuid4().hex[:6]}@gmail.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123",
        "business_name": "Fresh Organic Store",
        "initial_balance": 2000.0,
    }
    response = client.post("/api/v1/merchants/login-or-register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == unique_email
    assert data["business_name"] == "Fresh Organic Store"
    assert data["is_new"] is True
    assert "merch_" in data["merchant_id"]


def test_login_existing_merchant_and_wrong_password():
    import uuid
    test_email = f"existing_{uuid.uuid4().hex[:6]}@gmail.com"
    # First register
    client.post("/api/v1/merchants/login-or-register", json={"email": test_email, "password": "SecurePassword123"})

    # Attempt login with correct password
    payload = {"email": test_email, "password": "SecurePassword123"}
    resp = client.post("/api/v1/merchants/login-or-register", json=payload)
    assert resp.status_code == 200
    assert resp.json()["is_new"] is False

    # Attempt login with wrong password
    wrong_payload = {"email": test_email, "password": "WrongPassword"}
    wrong_resp = client.post("/api/v1/merchants/login-or-register", json=wrong_payload)
    assert wrong_resp.status_code == 401


def test_reset_password_endpoint():
    import uuid
    test_email = f"reset_{uuid.uuid4().hex[:6]}@gmail.com"
    client.post("/api/v1/merchants/login-or-register", json={"email": test_email, "password": "OldPassword123"})

    reset_payload = {"email": test_email, "new_password": "NewPassword456"}
    reset_resp = client.post("/api/v1/merchants/reset-password", json=reset_payload)
    assert reset_resp.status_code == 200

    # Verify new password works
    login_payload = {"email": test_email, "password": "NewPassword456"}
    login_resp = client.post("/api/v1/merchants/login-or-register", json=login_payload)
    assert login_resp.status_code == 200



def test_upload_phonepe_statement_not_extracting_platform_fee_as_balance():
    m_id = _get_test_merchant()
    # PhonePe text simulation with a ₹2,000 debit and a ₹6.00 platform fee
    phonepe_csv = (
        b"Date,Description,Amount,Type\n"
        b"2026-08-15,Paid to Merchant XYZ (Platform fee Rs 6.00),2000.00,OUTFLOW\n"
        b"2026-08-20,Received from Client ABC,1500.00,INFLOW\n"
    )
    response = client.post(
        f"/api/v1/merchants/{m_id}/upload-statement",
        files={"file": ("PhonePe_Statement_Aug2026.csv", phonepe_csv, "text/csv")},
        data={"closing_balance": "2000.00", "replace_mode": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # Crucial assertion: Closing balance must NOT be set to the ₹6.00 fee!
    assert data["closing_balance_extracted"] != 6.0
    assert data["new_cash"] == 2000.0
    assert data["rows_processed"] == 2
    assert data["inflows_added"] == 1
    assert data["outflows_added"] == 1


def test_create_and_delete_obligation_endpoint():
    m_id = _get_test_merchant()
    # 1. Create a new employee salary obligation
    payload = {
        "category": "PAYROLL",
        "amount": 15000.0,
        "due_date": "2026-09-15",
        "priority": "MANDATORY",
        "recurring": True,
    }
    create_res = client.post(f"/api/v1/merchants/{m_id}/obligations", json=payload)
    assert create_res.status_code == 200
    ob_data = create_res.json()
    assert ob_data["amount"] == 15000.0
    assert ob_data["category"] == "PAYROLL"
    assert ob_data["status"] == "UPCOMING"
    ob_id = ob_data["obligation_id"]

    # 2. Check it appears in merchant's obligations list
    get_res = client.get(f"/api/v1/merchants/{m_id}/obligations")
    assert get_res.status_code == 200
    obs = get_res.json()
    assert any(o["obligation_id"] == ob_id for o in obs)

    # 3. Delete the obligation
    del_res = client.delete(f"/api/v1/merchants/{m_id}/obligations/{ob_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "SUCCESS"


def test_new_merchant_has_starter_obligations():
    import uuid
    test_email = f"merchant_bills_{uuid.uuid4().hex[:6]}@gmail.com"
    reg_resp = client.post("/api/v1/merchants/login-or-register", json={"email": test_email, "password": "Password123"})
    assert reg_resp.status_code == 200
    m_id = reg_resp.json()["merchant_id"]

    # Verify newly registered store has starter scheduled obligations (e.g. TAX)
    obs_resp = client.get(f"/api/v1/merchants/{m_id}/obligations")
    assert obs_resp.status_code == 200
    obs = obs_resp.json()
    assert len(obs) >= 1
    categories = [o["category"] for o in obs]
    assert "TAX" in categories or "UTILITIES" in categories



