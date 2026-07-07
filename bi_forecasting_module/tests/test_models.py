"""Unit tests for all BI & Forecasting models."""

import pytest
from ..schemas import (
    ProjectCompletionInput, ProjectStatus,
    RevenueForecastInput, MonthlyRevenue,
    ResourceUtilizationInput, EmployeeUtilization, UpcomingProject,
    DepartmentPerformanceInput, DepartmentSnapshot,
)
from ..models import (
    predict_project_completion,
    forecast_revenue,
    forecast_resource_utilization,
    analyse_department_performance,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _proj(**kw):
    defaults = dict(
        project_id="p1", project_name="Alpha Project",
        status=ProjectStatus.ACTIVE,
        total_tasks=20, completed_tasks=12, in_progress_tasks=3,
        overdue_tasks=2, days_since_start=30, planned_duration_days=50,
        days_until_deadline=20, team_size=3,
        open_revision_requests=1, open_support_requests=0,
        pending_approvals=0, avg_team_performance_score=72.0,
        client_feedback_rating=4.1,
    )
    defaults.update(kw)
    return ProjectCompletionInput(**defaults)


def _monthly(month, completed, new_clients=1, churned=0, rating=4.0, revenue=None):
    return MonthlyRevenue(
        month=month, project_count=completed + 1,
        completed_projects=completed, active_projects=1,
        avg_client_rating=rating, new_clients=new_clients,
        churned_clients=churned, revision_requests=1,
        support_requests=0, revenue=revenue,
    )


def _emp(uid, tasks=2, skills=None, status="AVAILABLE", perf=75.0):
    return EmployeeUtilization(
        user_id=uid, current_tasks=tasks,
        completed_tasks_last_30d=10,
        availability_status=status,
        skills=skills or ["Python", "FastAPI"],
        avg_task_completion_days=3.0,
        performance_score=perf,
    )


def _dept(**kw):
    defaults = dict(
        department="Engineering",
        headcount=5, avg_performance_score=72.0,
        total_tasks_assigned=40, tasks_completed=34,
        tasks_overdue=3, total_projects=6, active_projects=3,
        avg_client_rating=4.1, total_revision_requests=4,
        avg_task_completion_days=5.0, attrition_risk_count=1,
    )
    defaults.update(kw)
    return DepartmentSnapshot(**defaults)


# ─── Project Completion ────────────────────────────────────────────────────────

def test_completion_pct_correct():
    result = predict_project_completion(_proj())
    assert result.completion_percentage == 60.0


def test_completion_on_time():
    result = predict_project_completion(_proj(
        completed_tasks=18, days_since_start=40, days_until_deadline=10
    ))
    assert 0 <= result.completion_percentage <= 100
    assert result.confidence > 0


def test_completion_no_velocity():
    result = predict_project_completion(_proj(completed_tasks=0, days_since_start=5))
    assert result.velocity == 0.0
    assert result.predicted_completion_days is None


def test_completion_already_done():
    result = predict_project_completion(_proj(completed_tasks=20))
    assert result.completion_percentage == 100.0
    assert result.predicted_completion_days == 0


def test_completion_confidence_bounded():
    result = predict_project_completion(_proj())
    assert 0 <= result.confidence <= 1


def test_completion_late_project():
    result = predict_project_completion(_proj(
        completed_tasks=5, days_since_start=40, days_until_deadline=3
    ))
    assert not result.predicted_on_time or result.schedule_variance_days is not None


def test_completion_risk_flags_present():
    result = predict_project_completion(_proj(overdue_tasks=10))
    assert len(result.risk_flags) > 0


# ─── Revenue Forecast ─────────────────────────────────────────────────────────

def _rev_input(months=3, forecast=3, avg_rpp=10000.0):
    history = [_monthly(f"2026-0{i+1}", completed=i+2) for i in range(months)]
    return RevenueForecastInput(
        historical_months=history,
        forecast_months=forecast,
        avg_revenue_per_project=avg_rpp,
    )


def test_revenue_forecast_count():
    result = forecast_revenue(_rev_input(months=4, forecast=3))
    assert len(result.forecast) == 3


def test_revenue_forecast_months_correct():
    result = forecast_revenue(_rev_input(months=3, forecast=2))
    months = [f.month for f in result.forecast]
    assert months == ["2026-04", "2026-05"]


def test_revenue_growing_trend():
    history = [_monthly(f"2026-0{i+1}", completed=i+3, revenue=(i+3)*10000) for i in range(4)]
    result = forecast_revenue(RevenueForecastInput(
        historical_months=history, forecast_months=3, avg_revenue_per_project=10000
    ))
    assert result.trend in ("GROWING", "STABLE")


def test_revenue_declining_trend():
    history = [_monthly(f"2026-0{i+1}", completed=5-i, revenue=(5-i)*10000, churned=2) for i in range(4)]
    result = forecast_revenue(RevenueForecastInput(
        historical_months=history, forecast_months=2, avg_revenue_per_project=10000
    ))
    assert result.trend in ("DECLINING", "STABLE")


def test_revenue_total_positive():
    result = forecast_revenue(_rev_input())
    assert result.total_forecast_revenue > 0


def test_revenue_bounds():
    result = forecast_revenue(_rev_input())
    for f in result.forecast:
        assert f.lower_bound <= f.predicted_revenue <= f.upper_bound


def test_revenue_single_month_history():
    result = forecast_revenue(_rev_input(months=1, forecast=2))
    assert len(result.forecast) == 2


# ─── Resource Utilization ─────────────────────────────────────────────────────

def test_resource_empty_team():
    result = forecast_resource_utilization(ResourceUtilizationInput(employees=[]))
    assert result.team_avg_utilization_pct == 0
    assert result.hiring_signal is False


def test_resource_overloaded_detection():
    result = forecast_resource_utilization(ResourceUtilizationInput(
        employees=[_emp("alice", tasks=5), _emp("bob", tasks=5)],
    ))
    assert "alice" in result.overloaded_employees or "bob" in result.overloaded_employees


def test_resource_underutilized_detection():
    result = forecast_resource_utilization(ResourceUtilizationInput(
        employees=[_emp("alice", tasks=0), _emp("bob", tasks=0)],
    ))
    assert "alice" in result.underutilized_employees


def test_resource_capacity_gap():
    result = forecast_resource_utilization(ResourceUtilizationInput(
        employees=[_emp("alice", tasks=4)],
        upcoming_projects=[
            UpcomingProject(project_id="p1", project_name="Big Project",
                            required_skills=["Python"], estimated_tasks=20,
                            start_in_days=5, duration_days=30, priority="HIGH")
        ],
    ))
    assert result.capacity_gap >= 0


def test_resource_forecasts_per_employee():
    employees = [_emp(f"e{i}") for i in range(3)]
    result = forecast_resource_utilization(ResourceUtilizationInput(employees=employees))
    assert len(result.employee_forecasts) == 3


def test_resource_utilization_bounded():
    employees = [_emp("alice", tasks=3)]
    result = forecast_resource_utilization(ResourceUtilizationInput(employees=employees))
    for f in result.employee_forecasts:
        assert f.current_utilization_pct >= 0
        assert f.forecast_utilization_pct >= 0


# ─── Department Performance ────────────────────────────────────────────────────

def test_dept_empty():
    result = analyse_department_performance(DepartmentPerformanceInput(departments=[]))
    assert result.organisation_avg_score == 0
    assert result.top_department == "N/A"


def test_dept_ranking_order():
    depts = [
        _dept(department="Engineering", avg_performance_score=85, tasks_completed=38),
        _dept(department="Design", avg_performance_score=55, tasks_completed=20, tasks_overdue=10),
    ]
    result = analyse_department_performance(DepartmentPerformanceInput(departments=depts))
    assert result.rankings[0].department == "Engineering"
    assert result.top_department == "Engineering"


def test_dept_scores_bounded():
    result = analyse_department_performance(DepartmentPerformanceInput(departments=[_dept()]))
    for r in result.rankings:
        assert 0 <= r.composite_score <= 100


def test_dept_grades_valid():
    result = analyse_department_performance(DepartmentPerformanceInput(departments=[_dept()]))
    for r in result.rankings:
        assert r.grade in ("A", "B", "C", "D", "F")


def test_dept_ranks_sequential():
    depts = [_dept(department=f"Dept{i}") for i in range(4)]
    result = analyse_department_performance(DepartmentPerformanceInput(departments=depts))
    ranks = [r.rank for r in result.rankings]
    assert ranks == list(range(1, 5))


def test_dept_completion_rate():
    dept = _dept(total_tasks_assigned=50, tasks_completed=45)
    result = analyse_department_performance(DepartmentPerformanceInput(departments=[dept]))
    assert result.organisation_task_completion_rate == pytest.approx(0.9)
