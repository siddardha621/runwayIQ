import datetime
from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Settlement(Base):
    __tablename__ = "settlements"

    settlement_id = Column(String(50), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    source_transaction_date = Column(Date, nullable=False, index=True)
    settlement_date = Column(Date, nullable=False, index=True)
    gross_amount = Column(Float, nullable=False)
    fees = Column(Float, nullable=False, default=0.0)
    taxes = Column(Float, nullable=False, default=0.0)
    adjustments = Column(Float, nullable=False, default=0.0)
    net_amount = Column(Float, nullable=False)
    status = Column(String(30), default="SETTLED")  # SETTLED, PENDING, DELAYED

    merchant = relationship("Merchant", back_populates="settlements")

    __table_args__ = (
        Index("ix_settlements_merchant_date", "merchant_id", "settlement_date"),
    )
