"""
Pydantic schemas for the Business Intelligence & Forecasting Module (BI&F).

All inputs map to data available in the existing Prisma schema.
Forecasts are returned with confidence intervals where applicable.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


# ─── Project Completion Prediction ───────────────────────────────────────────

class ProjectCompletionInput(BaseModel):
    project_id: str
    project_name: str
    status: ProjectStatus
    total_tasks: int = Field(ge=0)
    completed_tasks: int = Field(ge=0)
    in_progress_tasks: int = Field(ge=0)
    overdue_tasks: int = Field(ge=0)
    days_since_start: int = Field(ge=0)
    planned_duration_days: Optional[int] = Field(None, ge=1)
    days_until_deadline: Optional[int] = None
    team_size: int = Field(ge=0)
    open_revision_requests: int = Field(ge=0, default=0)
    open_support_requests: int = Field(ge=0, default=0)
    pending_approvals: int = Field(ge=0, default=0)
    avg_team_performance_score: Optional[float] = Field(None, ge=0, le=100)
    client_feedback_rating: Optional[float] = Field(None, ge=1, le=5)


class ProjectCompletionResult(BaseModel):
    project_id: str
    project_name: str
    completion_percentage: float = Field(description="Current % complete based on tasks")
    predicted_completion_days: Optional[int] = Field(description="Days from today to predicted completion")
    predicted_on_time: bool
    confidence: float = Field(description="0–1 forecast confidence")
    schedule_variance_days: Optional[int] = Field(description="Positive = ahead, negative = behind")
    velocity: float = Field(description="Tasks completed per day (current rate)")
    risk_flags: List[str]
    forecast_summary: str


# ─── Revenue Forecasting ──────────────────────────────────────────────────────

class MonthlyRevenue(BaseModel):
    month: str = Field(description="e.g. '2026-01'")
    project_count: int = Field(ge=0)
    completed_projects: int = Field(ge=0)
    active_projects: int = Field(ge=0)
    avg_client_rating: Optional[float] = Field(None, ge=1, le=5)
    new_clients: int = Field(ge=0, default=0)
    churned_clients: int = Field(ge=0, default=0)
    revision_requests: int = Field(ge=0, default=0)
    support_requests: int = Field(ge=0, default=0)
    revenue: Optional[float] = Field(None, ge=0, description="Actual revenue if known")


class RevenueForecastInput(BaseModel):
    historical_months: List[MonthlyRevenue] = Field(min_length=1)
    forecast_months: int = Field(default=3, ge=1, le=12)
    avg_revenue_per_project: float = Field(ge=0, description="Average revenue per completed project")


class MonthlyForecast(BaseModel):
    month: str
    predicted_revenue: float
    lower_bound: float
    upper_bound: float
    predicted_projects: int
    growth_rate: float


class RevenueForecastResult(BaseModel):
    forecast: List[MonthlyForecast]
    total_forecast_revenue: float
    avg_monthly_growth_rate: float
    trend: str = Field(description="GROWING / STABLE / DECLINING")
    key_drivers: List[str]
    risks: List[str]


# ─── Resource Utilization Forecasting ────────────────────────────────────────

class EmployeeUtilization(BaseModel):
    user_id: str
    department: Optional[str] = None
    experience_level: Optional[str] = None
    current_tasks: int = Field(ge=0)
    completed_tasks_last_30d: int = Field(ge=0)
    availability_status: str = Field(default="AVAILABLE")
    skills: List[str] = Field(default=[])
    avg_task_completion_days: Optional[float] = Field(None, ge=0)
    performance_score: Optional[float] = Field(None, ge=0, le=100)


class UpcomingProject(BaseModel):
    project_id: str
    project_name: str
    required_skills: List[str]
    estimated_tasks: int = Field(ge=0)
    start_in_days: int = Field(ge=0)
    duration_days: int = Field(ge=1)
    priority: str = Field(default="MEDIUM")


class ResourceUtilizationInput(BaseModel):
    employees: List[EmployeeUtilization]
    upcoming_projects: List[UpcomingProject] = Field(default=[])
    forecast_days: int = Field(default=30, ge=7, le=90)


class EmployeeCapacityForecast(BaseModel):
    user_id: str
    current_utilization_pct: float = Field(description="0–100% current load")
    forecast_utilization_pct: float = Field(description="0–100% projected load")
    available_capacity: float = Field(description="Estimated free task slots")
    utilization_status: str = Field(description="UNDERUTILIZED / OPTIMAL / OVERLOADED")
    recommended_tasks: int


class ResourceUtilizationResult(BaseModel):
    forecast_period_days: int
    team_avg_utilization_pct: float
    overloaded_employees: List[str]
    underutilized_employees: List[str]
    optimal_employees: List[str]
    capacity_gap: float = Field(description="Estimated shortfall in task capacity for upcoming projects")
    hiring_signal: bool = Field(description="True if capacity gap suggests need for additional resource")
    employee_forecasts: List[EmployeeCapacityForecast]
    insights: List[str]
    recommendations: List[str]


# ─── Department Performance Analysis ─────────────────────────────────────────

class DepartmentSnapshot(BaseModel):
    department: str
    headcount: int = Field(ge=0)
    avg_performance_score: Optional[float] = Field(None, ge=0, le=100)
    total_tasks_assigned: int = Field(ge=0)
    tasks_completed: int = Field(ge=0)
    tasks_overdue: int = Field(ge=0)
    total_projects: int = Field(ge=0)
    active_projects: int = Field(ge=0)
    avg_client_rating: Optional[float] = Field(None, ge=1, le=5)
    total_revision_requests: int = Field(ge=0, default=0)
    avg_task_completion_days: Optional[float] = Field(None, ge=0)
    attrition_risk_count: int = Field(ge=0, default=0)


class DepartmentPerformanceInput(BaseModel):
    departments: List[DepartmentSnapshot]
    period_label: str = Field(default="Current Period", description="e.g. 'Q2 2026'")


class DepartmentRanking(BaseModel):
    department: str
    composite_score: float = Field(description="0–100 overall performance score")
    rank: int
    grade: str
    task_completion_rate: float
    efficiency_score: float
    quality_score: float
    client_impact_score: float
    strengths: List[str]
    improvement_areas: List[str]


class DepartmentPerformanceResult(BaseModel):
    period_label: str
    rankings: List[DepartmentRanking]
    top_department: str
    lowest_department: str
    organisation_avg_score: float
    organisation_task_completion_rate: float
    cross_department_insights: List[str]
    strategic_recommendations: List[str]
