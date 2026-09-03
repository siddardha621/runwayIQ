from enum import Enum


class DecisionVerdict(str, Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    HIGH_RISK = "HIGH_RISK"
    INSUFFICIENT_CONFIDENCE = "INSUFFICIENT_CONFIDENCE"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TransactionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


class SettlementStatus(str, Enum):
    PENDING = "PENDING"
    SETTLED = "SETTLED"
    DELAYED = "DELAYED"


class ExpenseCategory(str, Enum):
    PAYROLL = "PAYROLL"
    INVENTORY = "INVENTORY"
    MARKETING = "MARKETING"
    RENT = "RENT"
    UTILITIES = "UTILITIES"
    SUPPLIER = "SUPPLIER"
    TAX = "TAX"
    OTHER = "OTHER"


class ObligationPriority(str, Enum):
    MANDATORY = "MANDATORY"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    DISCRETIONARY = "DISCRETIONARY"


class ObligationStatus(str, Enum):
    UPCOMING = "UPCOMING"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class MerchantArchetype(str, Enum):
    URBANCART = "URBANCART"  # Primary demo persona
    SEASONAL_FEST = "SEASONAL_FEST"
    HYPER_GROWTH = "HYPER_GROWTH"
    HIGH_REFUND = "HIGH_REFUND"
    SUBSCRIPTION_SAAS = "SUBSCRIPTION_SAAS"
    WEEKEND_CAFE = "WEEKEND_CAFE"
    LOW_MARGIN = "LOW_MARGIN"
    DECLINING_RETAIL = "DECLINING_RETAIL"
    VOLATILE_TRADE = "VOLATILE_TRADE"
    NEW_MERCHANT = "NEW_MERCHANT"  # Only 9 days history, triggers abstention
