import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Merchant(Base):
    __tablename__ = "merchants"

    merchant_id = Column(String(50), primary_key=True, index=True)
    business_name = Column(String(100), nullable=False)
    business_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    starting_balance = Column(Float, nullable=False, default=0.0)
    minimum_operating_cash = Column(Float, nullable=False, default=100000.0)
    settlement_cycle = Column(String(20), default="T+2")  # e.g., T+2 days
    currency = Column(String(10), default="INR")

    # Relationships
    transactions = relationship("Transaction", back_populates="merchant", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="merchant", cascade="all, delete-orphan")
    refunds = relationship("Refund", back_populates="merchant", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="merchant", cascade="all, delete-orphan")
    obligations = relationship("Obligation", back_populates="merchant", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="merchant", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="merchant", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="merchant", cascade="all, delete-orphan")
