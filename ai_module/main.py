"""
Zoon Workforce Intelligence API
FastAPI microservice — consumed by the NestJS backend via HTTP.

Base URL: http://localhost:8000
All endpoints accept/return JSON.
Auth: Pass X-API-Key header matching the AI_MODULE_API_KEY env var.
"""

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
import os

from .schemas import (
    PerformanceInput,
    PerformanceResult,
    AttritionInput,
    AttritionResult,
    TaskAssignmentInput,
    TaskAssignmentResult,
    ProjectRiskInput,
    ProjectRiskResult,
    WorkforceAnalyticsInput,
    WorkforceAnalyticsResult,
)
from .models import (
    predict_performance,
    predict_attrition,
    assign_task,
    predict_project_risk,
    generate_workforce_analytics,
)

# ─── App setup ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Zoon Workforce Intelligence API",
    description="AI/ML microservice for performance prediction, attrition risk, smart task assignment, project risk, and workforce analytics.",
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

# ─── API Key auth ─────────────────────────────────────────────────────────────

_API_KEY = os.getenv("AI_MODULE_API_KEY", "dev-secret-change-in-prod")
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: str = Security(_api_key_header)):
    if api_key != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "Zoon Workforce Intelligence API", "version": "1.0.0"}


# ─── Performance Prediction ───────────────────────────────────────────────────

@app.post(
    "/intelligence/performance-prediction",
    response_model=PerformanceResult,
    tags=["Performance"],
    summary="Predict employee performance score",
)
def performance_prediction(
    body: PerformanceInput,
    _: str = Depends(require_api_key),
):
    """
    Returns a 0–100 performance score, grade (A–F), strengths, and
    improvement areas based on task completion, revision quality,
    client satisfaction, and project breadth signals.
    """
    return predict_performance(body)


# ─── Attrition Prediction ─────────────────────────────────────────────────────

@app.post(
    "/intelligence/attrition-prediction",
    response_model=AttritionResult,
    tags=["Attrition"],
    summary="Predict employee attrition / disengagement risk",
)
def attrition_prediction(
    body: AttritionInput,
    _: str = Depends(require_api_key),
):
    """
    Returns a 0–100 attrition risk score, risk level (LOW/MEDIUM/HIGH/CRITICAL),
    contributing risk factors, and recommended retention actions.
    """
    return predict_attrition(body)


# ─── Smart Task Assignment ────────────────────────────────────────────────────

@app.post(
    "/intelligence/smart-task-assignment",
    response_model=TaskAssignmentResult,
    tags=["Task Assignment"],
    summary="Recommend the best employee for a task",
)
def smart_task_assignment(
    body: TaskAssignmentInput,
    _: str = Depends(require_api_key),
):
    """
    Scores each candidate employee across skill match, availability,
    workload capacity, and performance history. Returns a ranked list
    with the top recommendation and confidence score.
    """
    try:
        return assign_task(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ─── Project Risk Prediction ──────────────────────────────────────────────────

@app.post(
    "/intelligence/project-risk",
    response_model=ProjectRiskResult,
    tags=["Project Risk"],
    summary="Predict project delivery risk",
)
def project_risk_prediction(
    body: ProjectRiskInput,
    _: str = Depends(require_api_key),
):
    """
    Returns a risk score (0–100), risk level, specific risk factors,
    actionable recommendations, and estimated on-time completion probability.
    """
    return predict_project_risk(body)


# ─── Workforce Analytics ──────────────────────────────────────────────────────

@app.post(
    "/intelligence/analytics/workforce",
    response_model=WorkforceAnalyticsResult,
    tags=["Analytics"],
    summary="Generate workforce-level analytics and insights",
)
def workforce_analytics(
    body: WorkforceAnalyticsInput,
    _: str = Depends(require_api_key),
):
    """
    Accepts a list of employee performance inputs and returns aggregated
    metrics: avg performance, top performers, at-risk employees, task
    completion rate, client satisfaction, workforce health score, and
    prioritized action items.
    """
    return generate_workforce_analytics(body)
