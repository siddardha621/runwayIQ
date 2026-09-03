import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Refund(Base):
    __tablename__ = "refunds"

    refund_id = Column(String(50), primary_key=True, index=True)
    transaction_id = Column(String(50), ForeignKey("transactions.transaction_id"), nullable=False, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    reason = Column(String(100), default="CUSTOMER_RETURN")

    merchant = relationship("Merchant", back_populates="refunds")
    transaction = relationship("Transaction", back_populates="refunds")

    __table_args__ = (
        Index("ix_refunds_merchant_timestamp", "merchant_id", "timestamp"),
    )
