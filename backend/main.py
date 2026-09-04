

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.core.logging import logger
from backend.core.exceptions import CashFlowException
from backend.models.database import Base, engine, SessionLocal
from backend.models.merchant import Merchant
from backend.api.health import router as health_router
from backend.api.merchants import router as merchants_router
from backend.api.cashflow import router as cashflow_router
from backend.api.forecasts import router as forecasts_router
from backend.api.anomalies import router as anomalies_router
from backend.api.scenarios import router as scenarios_router
from backend.api.decisions import router as decisions_router
from backend.api.transactions import router as transactions_router

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    description=(
        "Fintech Decision Support System for Merchants evaluating proposed financial commitments "
        "under uncertain future cash-flow conditions (Forecast -> Diagnose -> Simulate -> Decide -> Explain)."
    ),
    version="1.2.0",
)

# Configure CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Exception handler for domain errors
@app.exception_handler(CashFlowException)
async def cashflow_exception_handler(request: Request, exc: CashFlowException):
    logger.error(f"Domain Exception: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=400,
        content={"error": exc.__class__.__name__, "message": exc.message, "details": exc.details},
    )


# Include API Routers under /api/v1
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(merchants_router, prefix=settings.API_V1_STR)
app.include_router(cashflow_router, prefix=settings.API_V1_STR)
app.include_router(forecasts_router, prefix=settings.API_V1_STR)
app.include_router(anomalies_router, prefix=settings.API_V1_STR)
app.include_router(scenarios_router, prefix=settings.API_V1_STR)
app.include_router(decisions_router, prefix=settings.API_V1_STR)
app.include_router(transactions_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup():
    logger.info("Starting Merchant Cash-Flow Decision Intelligence System...")
    # Ensure database schema is created
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized.")

    # Auto-seed if database is empty
    db = SessionLocal()
    try:
        count = db.query(Merchant).count()
        if count == 0:
            logger.info("Database is empty. Running initial synthetic dataset seed...")
            from scripts.seed_database import seed_database
            seed_database()
        else:
            logger.info(f"Database contains {count} merchants.")
    except Exception as e:
        logger.warning(f"Startup database check: {e}")
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "Merchant Cash-Flow Decision Intelligence API is running.",
        "docs": f"{settings.API_V1_STR}/docs",
        "demo_merchant": "merch_urbancart",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
