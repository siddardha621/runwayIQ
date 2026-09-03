import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Decision(Base):
    __tablename__ = "decisions"

    decision_id = Column(String(50), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    requested_action = Column(Text, nullable=False)  # Commitment description, amount, date
    decision = Column(String(30), nullable=False)    # SAFE, CAUTION, HIGH_RISK, INSUFFICIENT_CONFIDENCE
    confidence = Column(Float, nullable=False)
    evidence = Column(Text, nullable=False)          # JSON string of structured evidence
    assumptions = Column(Text, nullable=False)       # JSON string of assumptions & constraints
    recommendation = Column(Text, nullable=False)
    model_version = Column(String(50), nullable=False)

    merchant = relationship("Merchant", back_populates="decisions")

    __table_args__ = (
        Index("ix_decisions_merchant_timestamp", "merchant_id", "timestamp"),
    )
