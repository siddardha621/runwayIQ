from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict
from backend.core.constants import DecisionVerdict, RiskLevel, ObligationPriority, ObligationStatus


# --- Merchant Schemas ---
class MerchantBase(BaseModel):
    merchant_id: str
    business_name: str
    business_type: str
    starting_balance: float
    minimum_operating_cash: float
    settlement_cycle: str = "T+2"
    currency: str = "INR"


class MerchantResponse(MerchantBase):
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Summary Schemas ---
class MerchantSummaryResponse(BaseModel):
    merchant_id: str
    business_name: str
    business_type: str
    current_cash: float
    expected_inflows_30d: float
    expected_outflows_30d: float
    minimum_operating_cash: float
    projected_min_cash: float
    projected_min_cash_date: date
    risk_level: RiskLevel
    forecast_confidence: float
    data_quality_score: float
    active_anomalies_count: int
    pending_obligations_total: float


# --- Cashflow Ledger Schemas ---
class CashflowEntry(BaseModel):
    date: date
    beginning_cash: float
    inflows: float
    outflows: float
    net_flow: float
    ending_cash: float
    settlement_count: int = 0
    refund_amount: float = 0.0
    expense_amount: float = 0.0


class CashflowResponse(BaseModel):
    merchant_id: str
    entries: List[CashflowEntry]
    total_inflows: float
    total_outflows: float
    current_balance: float


# --- Forecast Schemas ---
class ForecastPoint(BaseModel):
    date: date
    predicted_inflow: float
    predicted_outflow: float
    predicted_balance: float
    lower_bound: float
    upper_bound: float
    operating_buffer: float
    is_breached: bool


class ForecastResponse(BaseModel):
    merchant_id: str
    forecast_generated_date: date
    horizon_days: int
    confidence: float
    method: str
    points: List[ForecastPoint]
    projected_min_cash: float
    projected_min_cash_date: date
    buffer_breached: bool
    breach_amount: float


# --- Obligation Schemas ---
class ObligationResponse(BaseModel):
    obligation_id: str
    due_date: date
    amount: float
    category: str
    priority: ObligationPriority
    status: ObligationStatus
    recurring: bool
    risk_contribution_pct: float
    model_config = ConfigDict(from_attributes=True)


# --- Anomaly Schemas ---
class AnomalyItem(BaseModel):
    date: date
    type: str  # REVENUE_DROP, REFUND_SPIKE, EXPENSE_SPIKE, SETTLEMENT_DELAY
    metric_name: str
    observed_value: float
    expected_baseline: float
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    z_score: float
    description: str


class AnomalyResponse(BaseModel):
    merchant_id: str
    anomalies: List[AnomalyItem]
    risk_radar: Dict[str, float]


# --- Scenario Schemas ---
class ScenarioRequest(BaseModel):
    revenue_change_pct: float = Field(0.0, description="Percentage change in revenue e.g. -15.0")
    refund_change_pct: float = Field(0.0, description="Percentage change in refund rate e.g. +20.0")
    settlement_delay_days: int = Field(0, description="Additional settlement lag in days e.g. 2")
    additional_expense: float = Field(0.0, description="One-off expense in INR")
    additional_expense_date: Optional[date] = None
    proposed_commitment: float = Field(0.0, description="Proposed commitment in INR e.g. 200000.0")
    commitment_date: Optional[date] = None


class ScenarioPoint(BaseModel):
    date: date
    baseline_cash: float
    scenario_cash: float
    operating_buffer: float
    is_breached: bool


class ScenarioResponse(BaseModel):
    merchant_id: str
    baseline_min_cash: float
    scenario_min_cash: float
    delta_min_cash: float
    operating_buffer: float
    buffer_breached: bool
    breach_amount: float
    risk_level: RiskLevel
    recommendation: str
    trajectory: List[ScenarioPoint]


# --- Decision Engine Schemas ---
class DecisionRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Proposed commitment amount in INR")
    category: str = Field("INVENTORY", description="Commitment category (INVENTORY, SUPPLIER, MARKETING, etc.)")
    commitment_date: Optional[date] = Field(None, description="Proposed commitment date (defaults to tomorrow)")
    notes: Optional[str] = None


class EvidenceItem(BaseModel):
    metric: str
    value: str
    impact: str
    detail: str


class AlternativeProposal(BaseModel):
    strategy: str
    title: str
    description: str
    adjusted_amount: Optional[float] = None
    adjusted_date: Optional[date] = None
    resulting_min_cash: float


class DecisionResponse(BaseModel):
    decision_id: str
    merchant_id: str
    timestamp: datetime
    requested_action: str
    decision: DecisionVerdict
    confidence: float
    projected_min_cash_without: float
    projected_min_cash_with: float
    minimum_operating_cash: float
    buffer_breach_amount: float
    prediction_interval_lower: float
    prediction_interval_upper: float
    evidence: List[EvidenceItem]
    assumptions: List[str]
    primary_reasons: List[str]
    recommendation: str
    safer_alternatives: List[AlternativeProposal]
    model_version: str
    data_quality_score: float
    abstention_reason: Optional[str] = None


# --- AI Copilot Schemas ---
class CopilotRequest(BaseModel):
    question: str
    context_parameters: Optional[Dict[str, Any]] = None


class CopilotResponse(BaseModel):
    merchant_id: str
    question: str
    intent_detected: str
    response_text: str
    grounded_evidence: List[Dict[str, Any]]
    suggested_followups: List[str]
    confidence: float
    llm_source: str


# --- Data Quality Schemas ---
class DataQualityFactor(BaseModel):
    name: str
    score: float
    weight: float
    status: str
    message: str


class DataQualityResponse(BaseModel):
    merchant_id: str
    overall_score: float
    grade: str
    history_days: int
    factors: List[DataQualityFactor]
    data_gap_warnings: List[str]


# --- Model Evaluation Schemas ---
class ModelEvaluationResponse(BaseModel):
    evaluated_at: datetime
    forecasting_metrics: Dict[str, Any]
    anomaly_metrics: Dict[str, Any]
    decision_metrics: Dict[str, Any]
    baseline_comparison: Dict[str, Any]
