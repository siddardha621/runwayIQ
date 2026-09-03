class CashFlowException(Exception):
    """Base exception for Cash Flow Decision Intelligence."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class MerchantNotFoundError(CashFlowException):
    """Raised when the requested merchant is not found."""
    pass


class InsufficientDataError(CashFlowException):
    """Raised when merchant historical data is insufficient for forecasting or decisioning."""
    pass


class LedgerIntegrityError(CashFlowException):
    """Raised when cash ledger calculations detect negative anomalies or invariant violations."""
    pass


class ModelInferenceError(CashFlowException):
    """Raised when an ML model fails during inference."""
    pass


class ScenarioParameterError(CashFlowException):
    """Raised when scenario parameters are invalid or out of bounds."""
    pass
