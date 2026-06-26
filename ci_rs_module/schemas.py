"""
Pydantic schemas for the Client Intelligence & Retention System (CI&RS).

All input fields map directly to data available in the Prisma schema.
All scores are 0–100 for consistency with the Workforce Intelligence Module.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class SupportRequestStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


# ─── Client Health Score ─────────────────────────────────────────────────────

class ClientFeedback(BaseModel):
    rating: int = Field(ge=1, le=5)
    would_recommend: bool
    communication: Optional[str] = None
    quality: Optional[str] = None
    value: Optional[str] = None


class ClientHealthInput(BaseModel):
    client_id: str
    company_name: str
    total_projects: int = Field(ge=0)
    active_projects: int = Field(ge=0)
    completed_projects: int = Field(ge=0)
    total_feedbacks: int = Field(ge=0)
    avg_feedback_rating: Optional[float] = Field(None, ge=1, le=5)
    would_recommend_count: int = Field(ge=0, default=0)
    open_support_requests: int = Field(ge=0, default=0)
    resolved_support_requests: int = Field(ge=0, default=0)
    rejected_support_requests: int = Field(ge=0, default=0)
    open_revision_requests: int = Field(ge=0, default=0)
    pending_approvals: int = Field(ge=0, default=0)
    unread_notifications: int = Field(ge=0, default=0)
    months_as_client: int = Field(ge=0)
    is_active: bool = True


class ClientHealthResult(BaseModel):
    client_id: str
    company_name: str
    health_score: float = Field(description="0–100 composite health score")
    health_tier: str = Field(description="EXCELLENT / GOOD / FAIR / AT_RISK / CRITICAL")
    dimension_scores: dict = Field(description="Breakdown by dimension")
    strengths: List[str]
    concerns: List[str]
    summary: str


# ─── Churn Prediction ────────────────────────────────────────────────────────

class ChurnInput(BaseModel):
    client_id: str
    company_name: str
    months_as_client: int = Field(ge=0)
    avg_feedback_rating: Optional[float] = Field(None, ge=1, le=5)
    would_recommend_ratio: float = Field(ge=0, le=1, default=1.0)
    total_projects: int = Field(ge=0)
    active_projects: int = Field(ge=0)
    support_request_resolution_rate: float = Field(ge=0, le=1, default=1.0)
    rejected_support_requests: int = Field(ge=0, default=0)
    open_revision_requests: int = Field(ge=0, default=0)
    pending_approvals: int = Field(ge=0, default=0)
    months_since_last_project: Optional[int] = Field(None, ge=0)
    unread_notifications_ratio: float = Field(ge=0, le=1, default=0.0,
        description="unread / total notifications — proxy for disengagement")
    is_active: bool = True


class ChurnResult(BaseModel):
    client_id: str
    company_name: str
    churn_risk_score: float = Field(description="0–100, higher = more likely to churn")
    churn_risk_level: str = Field(description="LOW / MEDIUM / HIGH / CRITICAL")
    churn_probability: float = Field(description="0–1 estimated churn probability")
    risk_drivers: List[str]
    protective_factors: List[str]


# ─── Usage Analytics ─────────────────────────────────────────────────────────

class ClientUsageInput(BaseModel):
    client_id: str
    company_name: str
    total_projects: int = Field(ge=0)
    active_projects: int = Field(ge=0)
    completed_projects: int = Field(ge=0)
    draft_projects: int = Field(ge=0, default=0)
    total_tasks_across_projects: int = Field(ge=0, default=0)
    completed_tasks: int = Field(ge=0, default=0)
    total_feedbacks_submitted: int = Field(ge=0, default=0)
    total_support_requests: int = Field(ge=0, default=0)
    total_revision_requests: int = Field(ge=0, default=0)
    total_approvals_given: int = Field(ge=0, default=0)
    months_as_client: int = Field(ge=0)
    avg_feedback_rating: Optional[float] = Field(None, ge=1, le=5)


class UsageAnalyticsResult(BaseModel):
    client_id: str
    company_name: str
    engagement_score: float = Field(description="0–100 overall engagement level")
    engagement_tier: str = Field(description="HIGHLY_ENGAGED / ENGAGED / MODERATE / LOW / DORMANT")
    project_utilization_rate: float = Field(description="active / total projects")
    task_completion_rate: float = Field(description="completed / total tasks")
    feedback_participation_rate: float = Field(description="feedbacks / projects")
    support_intensity: float = Field(description="support requests per project")
    revision_intensity: float = Field(description="revision requests per project")
    monthly_project_rate: float = Field(description="avg projects initiated per month")
    insights: List[str]


# ─── Retention Recommendations ───────────────────────────────────────────────

class RetentionInput(BaseModel):
    client_id: str
    company_name: str
    health_score: float = Field(ge=0, le=100)
    churn_risk_score: float = Field(ge=0, le=100)
    engagement_score: float = Field(ge=0, le=100)
    avg_feedback_rating: Optional[float] = Field(None, ge=1, le=5)
    open_support_requests: int = Field(ge=0, default=0)
    open_revision_requests: int = Field(ge=0, default=0)
    pending_approvals: int = Field(ge=0, default=0)
    months_as_client: int = Field(ge=0)
    active_projects: int = Field(ge=0)
    months_since_last_project: Optional[int] = Field(None, ge=0)
    would_recommend_ratio: float = Field(ge=0, le=1, default=1.0)


class RetentionAction(BaseModel):
    priority: str = Field(description="IMMEDIATE / SHORT_TERM / LONG_TERM")
    category: str = Field(description="COMMUNICATION / SERVICE / COMMERCIAL / RELATIONSHIP")
    action: str
    expected_impact: str


class RetentionResult(BaseModel):
    client_id: str
    company_name: str
    overall_risk_tier: str = Field(description="SAFE / WATCH / AT_RISK / URGENT")
    recommended_actions: List[RetentionAction]
    key_message: str
    next_touchpoint_days: int = Field(description="Recommended days until next proactive client contact")


# ─── Portfolio Analytics (fleet-level) ───────────────────────────────────────

class PortfolioAnalyticsInput(BaseModel):
    clients: List[ClientHealthInput]


class PortfolioAnalyticsResult(BaseModel):
    total_clients: int
    active_clients: int
    avg_health_score: float
    healthy_clients: List[str] = Field(description="client_ids with health >= 70")
    at_risk_clients: List[str] = Field(description="client_ids with health < 50")
    portfolio_health_score: float = Field(description="0–100 overall portfolio health")
    insights: List[str]
    action_items: List[str]
