import datetime
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.models.database import Base


class Forecast(Base):
    __tablename__ = "forecasts"

    forecast_id = Column(String(50), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False, index=True)  # Generation date
    horizon_date = Column(Date, nullable=False, index=True)   # Future target date
    predicted_inflow = Column(Float, nullable=False)
    predicted_outflow = Column(Float, nullable=False)
    predicted_balance = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)
    upper_bound = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)

    merchant = relationship("Merchant", back_populates="forecasts")

    __table_args__ = (
        Index("ix_forecasts_merchant_horizon", "merchant_id", "horizon_date"),
    )
