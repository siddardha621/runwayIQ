from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Merchant Cash-Flow Decision Intelligence"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        return v

    # Database
    DATABASE_URL: str = "sqlite:///./cashflow.db"

    # Risk and Decision Parameters
    DEFAULT_LOOKAHEAD_DAYS: int = 30
    MIN_HISTORY_DAYS_FOR_DECISION: int = 14
    UNCERTAINTY_COVERAGE: float = 0.85
    CONFIDENCE_THRESHOLD_CAUTION: float = 0.60
    CONFIDENCE_THRESHOLD_SAFE: float = 0.75
    ASYMMETRIC_LOSS_PENALTY: float = 10.0  # False-safe penalty vs False-risk penalty

    # Model Version
    MODEL_VERSION: str = "v1.2.0-hybrid"

    # Grounded LLM Provider (Fallback deterministic templates used if 'none' or unconfigured)
    LLM_PROVIDER: str = "none"  # "gemini", "openai", or "none"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""


settings = Settings()
