from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class AvailabilityStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    ON_LEAVE = "ON_LEAVE"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class ProjectStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


# ─── Performance Prediction ──────────────────────────────────────────────────

class PerformanceInput(BaseModel):
    user_id: str
    total_tasks_assigned: int = Field(ge=0)
    tasks_completed: int = Field(ge=0)
    tasks_in_progress: int = Field(ge=0)
    tasks_overdue: int = Field(ge=0)
    revision_requests_received: int = Field(ge=0)
    revisions_approved: int = Field(ge=0)
    revisions_rejected: int = Field(ge=0)
    avg_task_completion_days: Optional[float] = None
    client_feedback_avg_rating: Optional[float] = Field(None, ge=1, le=5)
    projects_contributed: int = Field(ge=0)
    availability_status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
    experience_level: Optional[str] = None  # JUNIOR, MID, SENIOR


class PerformanceResult(BaseModel):
    user_id: str
    performance_score: float = Field(description="0–100 composite score")
    grade: str = Field(description="A / B / C / D / F")
    strengths: List[str]
    areas_for_improvement: List[str]
    recommendation: str


# ─── Attrition Prediction ────────────────────────────────────────────────────

class AttritionInput(BaseModel):
    user_id: str
    months_at_company: int = Field(ge=0)
    tasks_overdue_ratio: float = Field(ge=0, le=1, description="overdue / total assigned")
    revision_rejection_ratio: float = Field(ge=0, le=1)
    avg_task_completion_days: Optional[float] = None
    projects_contributed: int = Field(ge=0)
    is_on_leave: bool = False
    client_feedback_avg_rating: Optional[float] = Field(None, ge=1, le=5)
    experience_level: Optional[str] = None
    has_active_tasks: bool = True


class AttritionResult(BaseModel):
    user_id: str
    attrition_risk_score: float = Field(description="0–100, higher = more likely to leave/underperform")
    risk_level: str = Field(description="LOW / MEDIUM / HIGH / CRITICAL")
    risk_factors: List[str]
    retention_actions: List[str]


# ─── Smart Task Assignment ────────────────────────────────────────────────────

class TaskRequirement(BaseModel):
    task_id: str
    required_skills: List[str]
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    estimated_days: Optional[int] = None
    project_deadline_days: Optional[int] = None


class CandidateEmployee(BaseModel):
    user_id: str
    skills: List[str]
    availability_status: AvailabilityStatus
    current_task_load: int = Field(ge=0, description="Number of active tasks")
    performance_score: Optional[float] = Field(None, ge=0, le=100)
    experience_level: Optional[str] = None
    avg_task_completion_days: Optional[float] = None


class TaskAssignmentInput(BaseModel):
    task: TaskRequirement
    candidates: List[CandidateEmployee]


class CandidateScore(BaseModel):
    user_id: str
    match_score: float = Field(description="0–100")
    skill_match_pct: float
    availability_score: float
    workload_score: float
    performance_score: float
    reasons: List[str]


class TaskAssignmentResult(BaseModel):
    task_id: str
    recommended_user_id: str
    confidence: float = Field(description="0–1")
    all_candidates: List[CandidateScore]
    reasoning: str


# ─── Project Risk Prediction ─────────────────────────────────────────────────

class ProjectRiskInput(BaseModel):
    project_id: str
    status: ProjectStatus
    days_until_deadline: Optional[int] = None
    total_tasks: int = Field(ge=0)
    completed_tasks: int = Field(ge=0)
    overdue_tasks: int = Field(ge=0)
    team_size: int = Field(ge=0)
    open_revision_requests: int = Field(ge=0)
    open_support_requests: int = Field(ge=0)
    pending_approvals: int = Field(ge=0)
    client_feedback_avg_rating: Optional[float] = Field(None, ge=1, le=5)
    team_avg_performance_score: Optional[float] = Field(None, ge=0, le=100)
    has_project_manager: bool = True


class ProjectRiskResult(BaseModel):
    project_id: str
    risk_score: float = Field(description="0–100")
    risk_level: str = Field(description="LOW / MEDIUM / HIGH / CRITICAL")
    risk_factors: List[str]
    recommendations: List[str]
    completion_probability: float = Field(description="0–1 estimated on-time completion chance")


# ─── Workforce Analytics ─────────────────────────────────────────────────────

class WorkforceAnalyticsInput(BaseModel):
    employees: List[PerformanceInput]
    projects: Optional[List[ProjectRiskInput]] = None


class DepartmentInsight(BaseModel):
    label: str
    value: float
    unit: str


class WorkforceAnalyticsResult(BaseModel):
    total_employees: int
    avg_performance_score: float
    top_performers: List[str]
    at_risk_employees: List[str]
    overall_task_completion_rate: float
    avg_client_satisfaction: Optional[float]
    workforce_health_score: float = Field(description="0–100 overall team health")
    insights: List[str]
    action_items: List[str]
