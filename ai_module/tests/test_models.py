"""Unit tests for all four intelligence models."""

import pytest
from ..schemas import (
    PerformanceInput,
    AttritionInput,
    TaskAssignmentInput,
    TaskRequirement,
    CandidateEmployee,
    ProjectRiskInput,
    WorkforceAnalyticsInput,
    AvailabilityStatus,
    ProjectStatus,
)
from ..models import (
    predict_performance,
    predict_attrition,
    assign_task,
    predict_project_risk,
    generate_workforce_analytics,
)


# ─── Performance ──────────────────────────────────────────────────────────────

def _perf(**kwargs):
    defaults = dict(
        user_id="u1",
        total_tasks_assigned=10,
        tasks_completed=8,
        tasks_in_progress=1,
        tasks_overdue=1,
        revision_requests_received=3,
        revisions_approved=2,
        revisions_rejected=1,
        client_feedback_avg_rating=4.0,
        projects_contributed=2,
    )
    defaults.update(kwargs)
    return PerformanceInput(**defaults)


def test_performance_high_performer():
    result = predict_performance(_perf(
        tasks_completed=10, tasks_overdue=0,
        revisions_approved=5, revisions_rejected=0,
        client_feedback_avg_rating=5.0, projects_contributed=5,
    ))
    assert result.performance_score >= 85
    assert result.grade == "A"


def test_performance_low_performer():
    result = predict_performance(_perf(
        tasks_completed=3, tasks_overdue=6,
        revisions_approved=0, revisions_rejected=5,
        client_feedback_avg_rating=1.5, projects_contributed=0,
    ))
    assert result.performance_score < 50
    assert result.grade in ("D", "F")


def test_performance_score_bounded():
    result = predict_performance(_perf())
    assert 0 <= result.performance_score <= 100


def test_performance_no_tasks():
    result = predict_performance(_perf(total_tasks_assigned=0, tasks_completed=0, tasks_overdue=0))
    assert 0 <= result.performance_score <= 100


# ─── Attrition ────────────────────────────────────────────────────────────────

def _attr(**kwargs):
    defaults = dict(
        user_id="u2",
        months_at_company=12,
        tasks_overdue_ratio=0.1,
        revision_rejection_ratio=0.2,
        projects_contributed=2,
        client_feedback_avg_rating=3.8,
    )
    defaults.update(kwargs)
    return AttritionInput(**defaults)


def test_attrition_low_risk():
    result = predict_attrition(_attr(
        months_at_company=18,
        tasks_overdue_ratio=0.05,
        revision_rejection_ratio=0.1,
        client_feedback_avg_rating=4.5,
        projects_contributed=3,
    ))
    assert result.risk_level in ("LOW", "MEDIUM")


def test_attrition_critical_risk():
    result = predict_attrition(_attr(
        months_at_company=1,
        tasks_overdue_ratio=0.6,
        revision_rejection_ratio=0.7,
        client_feedback_avg_rating=1.5,
        projects_contributed=0,
    ))
    assert result.attrition_risk_score >= 55
    assert result.risk_level in ("HIGH", "CRITICAL")


def test_attrition_score_bounded():
    result = predict_attrition(_attr())
    assert 0 <= result.attrition_risk_score <= 100


# ─── Task Assignment ──────────────────────────────────────────────────────────

def _candidates():
    return [
        CandidateEmployee(
            user_id="alice",
            skills=["Python", "FastAPI", "PostgreSQL"],
            availability_status=AvailabilityStatus.AVAILABLE,
            current_task_load=1,
            performance_score=85,
        ),
        CandidateEmployee(
            user_id="bob",
            skills=["JavaScript", "React"],
            availability_status=AvailabilityStatus.BUSY,
            current_task_load=4,
            performance_score=70,
        ),
    ]


def test_task_assignment_skill_match():
    result = assign_task(TaskAssignmentInput(
        task=TaskRequirement(
            task_id="t1",
            required_skills=["Python", "FastAPI"],
            priority="HIGH",
        ),
        candidates=_candidates(),
    ))
    assert result.recommended_user_id == "alice"
    assert result.confidence > 0.5


def test_task_assignment_no_candidates():
    with pytest.raises(ValueError):
        assign_task(TaskAssignmentInput(
            task=TaskRequirement(task_id="t1", required_skills=["Python"], priority="LOW"),
            candidates=[],
        ))


def test_task_assignment_all_scored():
    result = assign_task(TaskAssignmentInput(
        task=TaskRequirement(task_id="t2", required_skills=[], priority="MEDIUM"),
        candidates=_candidates(),
    ))
    assert len(result.all_candidates) == 2


# ─── Project Risk ─────────────────────────────────────────────────────────────

def _proj(**kwargs):
    defaults = dict(
        project_id="p1",
        status=ProjectStatus.ACTIVE,
        days_until_deadline=30,
        total_tasks=20,
        completed_tasks=15,
        overdue_tasks=2,
        team_size=3,
        open_revision_requests=1,
        open_support_requests=0,
        pending_approvals=0,
        client_feedback_avg_rating=4.0,
        team_avg_performance_score=75.0,
        has_project_manager=True,
    )
    defaults.update(kwargs)
    return ProjectRiskInput(**defaults)


def test_project_risk_low():
    result = predict_project_risk(_proj())
    assert result.risk_level in ("LOW", "MEDIUM")
    assert result.completion_probability > 0.5


def test_project_risk_critical():
    result = predict_project_risk(_proj(
        days_until_deadline=2,
        completed_tasks=5,
        overdue_tasks=10,
        has_project_manager=False,
        team_size=0,
        open_revision_requests=8,
        client_feedback_avg_rating=1.5,
    ))
    assert result.risk_score >= 55
    assert result.risk_level in ("HIGH", "CRITICAL")
    assert result.completion_probability < 0.5


def test_project_risk_overdue_deadline():
    result = predict_project_risk(_proj(days_until_deadline=0))
    assert result.risk_score >= 30


def test_project_risk_bounded():
    result = predict_project_risk(_proj())
    assert 0 <= result.risk_score <= 100
    assert 0 <= result.completion_probability <= 1


# ─── Workforce Analytics ──────────────────────────────────────────────────────

def test_analytics_empty():
    result = generate_workforce_analytics(WorkforceAnalyticsInput(employees=[]))
    assert result.total_employees == 0
    assert result.workforce_health_score == 0


def test_analytics_team():
    employees = [_perf(user_id=f"u{i}") for i in range(5)]
    result = generate_workforce_analytics(WorkforceAnalyticsInput(employees=employees))
    assert result.total_employees == 5
    assert 0 <= result.workforce_health_score <= 100
    assert isinstance(result.insights, list)
    assert len(result.insights) > 0
