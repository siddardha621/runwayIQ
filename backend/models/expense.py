import datetime
from sqlalchemy import Column, String, Float, Date, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    expense_id = Column(String(50), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    category = Column(String(50), nullable=False)  # PAYROLL, INVENTORY, MARKETING, RENT, UTILITIES, SUPPLIER, TAX, OTHER
    amount = Column(Float, nullable=False)
    recurring = Column(Boolean, default=False)
    priority = Column(String(20), default="HIGH")  # MANDATORY, HIGH, MEDIUM, DISCRETIONARY

    merchant = relationship("Merchant", back_populates="expenses")

    __table_args__ = (
        Index("ix_expenses_merchant_date", "merchant_id", "date"),
    )
