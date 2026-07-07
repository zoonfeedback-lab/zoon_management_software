"""
Zoon Business Intelligence & Forecasting Module API
FastAPI microservice — consumed by the NestJS backend via HTTP.

Base URL: http://localhost:8002
Auth:     X-API-Key header matching BI_FORECASTING_API_KEY env var.
Docs:     http://localhost:8002/docs
"""

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
import os

from .schemas import (
    ProjectCompletionInput, ProjectCompletionResult,
    RevenueForecastInput, RevenueForecastResult,
    ResourceUtilizationInput, ResourceUtilizationResult,
    DepartmentPerformanceInput, DepartmentPerformanceResult,
)
from .models import (
    predict_project_completion,
    forecast_revenue,
    forecast_resource_utilization,
    analyse_department_performance,
)

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Zoon Business Intelligence & Forecasting Module",
    description=(
        "AI microservice for project completion prediction, revenue forecasting, "
        "resource utilization forecasting, and department performance analysis."
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

_API_KEY = os.getenv("BI_FORECASTING_API_KEY", "dev-secret-change-in-prod")
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
        "service": "Zoon Business Intelligence & Forecasting Module",
        "version": "1.0.0",
    }


# ─── Project Completion Prediction ───────────────────────────────────────────

@app.post(
    "/bi/project-completion",
    response_model=ProjectCompletionResult,
    tags=["Project Forecasting"],
    summary="Predict project completion date and on-time status",
)
def project_completion(
    body: ProjectCompletionInput,
    _: str = Depends(require_api_key),
):
    """
    Uses task velocity (tasks completed per day) to forecast the remaining
    time to project completion. Returns completion %, predicted days,
    schedule variance, confidence score, and delivery risk flags.
    """
    return predict_project_completion(body)


# ─── Revenue Forecasting ──────────────────────────────────────────────────────

@app.post(
    "/bi/revenue-forecast",
    response_model=RevenueForecastResult,
    tags=["Revenue Forecasting"],
    summary="Forecast monthly revenue for the next N months",
)
def revenue_forecast(
    body: RevenueForecastInput,
    _: str = Depends(require_api_key),
):
    """
    Uses historical monthly activity data and a weighted moving average with
    trend adjustment to forecast revenue. Returns per-month predictions with
    confidence bounds, trend classification (GROWING/STABLE/DECLINING),
    key revenue drivers, and risks.
    """
    return forecast_revenue(body)


# ─── Resource Utilization Forecasting ────────────────────────────────────────

@app.post(
    "/bi/resource-utilization",
    response_model=ResourceUtilizationResult,
    tags=["Resource Forecasting"],
    summary="Forecast team resource utilization and capacity gaps",
)
def resource_utilization(
    body: ResourceUtilizationInput,
    _: str = Depends(require_api_key),
):
    """
    Forecasts each employee's utilization over a given period, accounting for
    current task load and upcoming project demands. Identifies overloaded,
    underutilized, and optimally-loaded employees. Flags capacity gaps and
    hiring signals.
    """
    return forecast_resource_utilization(body)


# ─── Department Performance Analysis ─────────────────────────────────────────

@app.post(
    "/bi/department-performance",
    response_model=DepartmentPerformanceResult,
    tags=["Department Analytics"],
    summary="Rank and analyse department performance",
)
def department_performance(
    body: DepartmentPerformanceInput,
    _: str = Depends(require_api_key),
):
    """
    Scores each department across efficiency, quality, client impact, and
    team health. Returns a ranked leaderboard with grades, dimension scores,
    strengths, improvement areas, and organisation-level strategic insights.
    """
    return analyse_department_performance(body)
