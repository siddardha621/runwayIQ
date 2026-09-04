import datetime
import hashlib
from sqlalchemy import Column, String, DateTime, ForeignKey
from backend.models.database import Base


def hash_password(password: str) -> str:
    """Computes SHA-256 hash for password verification."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class UserAuth(Base):
    __tablename__ = "user_auth"

    email = Column(String(150), primary_key=True, index=True)
    merchant_id = Column(String(50), ForeignKey("merchants.merchant_id"), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Merchant Administrator")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def verify_password(self, password: str) -> bool:
        return self.password_hash == hash_password(password)
