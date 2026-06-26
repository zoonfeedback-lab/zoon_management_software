"""
Zoon Client Intelligence & Retention System (CI&RS) API
FastAPI microservice — consumed by the NestJS backend via HTTP.

Base URL: http://localhost:8001
Auth:     X-API-Key header matching CI_RS_API_KEY env var.
Docs:     http://localhost:8001/docs
"""

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
import os

from .schemas import (
    ClientHealthInput, ClientHealthResult,
    ChurnInput, ChurnResult,
    ClientUsageInput, UsageAnalyticsResult,
    RetentionInput, RetentionResult,
    PortfolioAnalyticsInput, PortfolioAnalyticsResult,
)
from .models import (
    score_client_health,
    predict_churn,
    generate_usage_analytics,
    generate_retention_recommendations,
    generate_portfolio_analytics,
)

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Zoon Client Intelligence & Retention System",
    description=(
        "AI microservice for client health scoring, churn prediction, "
        "usage analytics, retention recommendations, and portfolio analytics."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth ─────────────────────────────────────────────────────────────────────

_API_KEY = os.getenv("CI_RS_API_KEY", "dev-secret-change-in-prod")
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: str = Security(_api_key_header)):
    if api_key != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "service": "Zoon Client Intelligence & Retention System",
        "version": "1.0.0",
    }


# ─── Client Health Score ──────────────────────────────────────────────────────

@app.post(
    "/ci-rs/health-score",
    response_model=ClientHealthResult,
    tags=["Client Health"],
    summary="Score a client's overall health",
)
def client_health_score(
    body: ClientHealthInput,
    _: str = Depends(require_api_key),
):
    """
    Returns a 0–100 composite health score across five dimensions:
    satisfaction, engagement, support health, project health, and tenure.
    Includes strengths, concerns, and a plain-language summary.
    """
    return score_client_health(body)


# ─── Churn Prediction ─────────────────────────────────────────────────────────

@app.post(
    "/ci-rs/churn-prediction",
    response_model=ChurnResult,
    tags=["Churn Prediction"],
    summary="Predict client churn risk",
)
def client_churn_prediction(
    body: ChurnInput,
    _: str = Depends(require_api_key),
):
    """
    Returns a churn risk score (0–100), risk level (LOW/MEDIUM/HIGH/CRITICAL),
    estimated churn probability (0–1), risk drivers, and protective factors.
    """
    return predict_churn(body)


# ─── Usage Analytics ──────────────────────────────────────────────────────────

@app.post(
    "/ci-rs/usage-analytics",
    response_model=UsageAnalyticsResult,
    tags=["Usage Analytics"],
    summary="Analyse client usage and engagement patterns",
)
def client_usage_analytics(
    body: ClientUsageInput,
    _: str = Depends(require_api_key),
):
    """
    Returns an engagement score and tier, plus granular metrics:
    project utilization, task completion rate, feedback participation,
    support intensity, revision intensity, and monthly project rate.
    """
    return generate_usage_analytics(body)


# ─── Retention Recommendations ────────────────────────────────────────────────

@app.post(
    "/ci-rs/retention-recommendations",
    response_model=RetentionResult,
    tags=["Retention"],
    summary="Generate prioritised retention actions for a client",
)
def retention_recommendations(
    body: RetentionInput,
    _: str = Depends(require_api_key),
):
    """
    Synthesises health score, churn risk, and engagement into a prioritised
    action plan (IMMEDIATE / SHORT_TERM / LONG_TERM) across four categories:
    COMMUNICATION, SERVICE, COMMERCIAL, RELATIONSHIP.
    Also returns the recommended days until next proactive client contact.
    """
    return generate_retention_recommendations(body)


# ─── Portfolio Analytics ──────────────────────────────────────────────────────

@app.post(
    "/ci-rs/portfolio-analytics",
    response_model=PortfolioAnalyticsResult,
    tags=["Portfolio Analytics"],
    summary="Fleet-level analytics across all clients",
)
def portfolio_analytics(
    body: PortfolioAnalyticsInput,
    _: str = Depends(require_api_key),
):
    """
    Accepts a list of client health inputs and returns aggregated portfolio
    metrics: average health score, healthy vs. at-risk client lists,
    overall portfolio health score, insights, and prioritised action items.
    """
    return generate_portfolio_analytics(body)
