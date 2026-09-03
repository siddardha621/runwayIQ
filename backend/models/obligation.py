import datetime
from sqlalchemy import Column, String, Float, Date, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Obligation(Base):
    __tablename__ = "obligations"

    obligation_id = Column(String(50), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    due_date = Column(Date, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)  # SUPPLIER, TAX, LOAN, PAYROLL, RENT, INVENTORY
    priority = Column(String(20), nullable=False, default="MANDATORY")  # MANDATORY, HIGH, MEDIUM, DISCRETIONARY
    recurring = Column(Boolean, default=False)
    status = Column(String(20), default="UPCOMING")  # UPCOMING, PAID, CANCELLED

    merchant = relationship("Merchant", back_populates="obligations")

    __table_args__ = (
        Index("ix_obligations_merchant_due_date", "merchant_id", "due_date"),
    )
