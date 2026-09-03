import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(50), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(30), default="UPI")  # UPI, CARD, NETBANKING, WALLET
    status = Column(String(30), nullable=False, default="SUCCESS")  # SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED
    customer_segment = Column(String(30), default="RETAIL")
    geography = Column(String(30), default="DOMESTIC")
    order_value = Column(Float, nullable=False)

    merchant = relationship("Merchant", back_populates="transactions")
    refunds = relationship("Refund", back_populates="transaction", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_transactions_merchant_timestamp", "merchant_id", "timestamp"),
    )
