import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id = Column(String(50), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    scenario_parameters = Column(Text, nullable=False)  # JSON serialized parameters
    baseline_min_cash = Column(Float, nullable=False)
    scenario_min_cash = Column(Float, nullable=False)
    buffer = Column(Float, nullable=False)
    risk_level = Column(String(30), nullable=False)  # LOW, MODERATE, HIGH, CRITICAL
    recommendation = Column(Text, nullable=False)

    merchant = relationship("Merchant", back_populates="scenarios")
