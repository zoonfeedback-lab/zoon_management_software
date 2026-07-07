"""
Resource Utilization Forecasting Model

Forecasts team capacity over a given period and identifies:
  - Overloaded employees (utilization > 85%)
  - Underutilized employees (utilization < 40%)
  - Capacity gap for upcoming projects
  - Hiring signal if gap is significant

Utilization is modelled as:
  current_tasks / MAX_CAPACITY × 100

where MAX_CAPACITY = 5 concurrent tasks (configurable baseline).
Upcoming project load is distributed across available employees by skill match.
"""

from typing import List
from ..schemas import (
    ResourceUtilizationInput, ResourceUtilizationResult,
    EmployeeCapacityForecast, EmployeeUtilization, UpcomingProject
)

_MAX_CAPACITY = 5      # tasks per employee considered 100% utilization
_OVERLOAD_THRESHOLD = 85.0
_UNDERUTIL_THRESHOLD = 40.0
_OPTIMAL_MIN = 40.0
_OPTIMAL_MAX = 85.0


def _utilization_pct(current_tasks: int) -> float:
    return round(min(current_tasks / _MAX_CAPACITY * 100, 120), 2)


def _utilization_status(pct: float) -> str:
    if pct > _OVERLOAD_THRESHOLD:
        return "OVERLOADED"
    if pct < _UNDERUTIL_THRESHOLD:
        return "UNDERUTILIZED"
    return "OPTIMAL"


def _skill_match(required: List[str], employee_skills: List[str]) -> float:
    if not required:
        return 1.0
    req = {s.lower() for s in required}
    emp = {s.lower() for s in employee_skills}
    return len(req & emp) / len(req)


def forecast_resource_utilization(data: ResourceUtilizationInput) -> ResourceUtilizationResult:
    employees = data.employees
    upcoming = data.upcoming_projects
    insights = []
    recommendations = []

    if not employees:
        return ResourceUtilizationResult(
            forecast_period_days=data.forecast_days,
            team_avg_utilization_pct=0,
            overloaded_employees=[],
            underutilized_employees=[],
            optimal_employees=[],
            capacity_gap=0,
            hiring_signal=False,
            employee_forecasts=[],
            insights=["No employees provided"],
            recommendations=["Add employee records to enable resource forecasting"],
        )

    # ── Current utilization ───────────────────────────────────────────────────
    current_util = {e.user_id: _utilization_pct(e.current_tasks) for e in employees}

    # ── Distribute upcoming project load ──────────────────────────────────────
    # Tasks from upcoming projects are allocated proportionally to available employees
    additional_tasks: dict[str, float] = {e.user_id: 0.0 for e in employees}
    total_unmatched_tasks = 0.0

    for proj in upcoming:
        # Filter available employees with skill match
        candidates = [
            e for e in employees
            if e.availability_status == "AVAILABLE" and
               current_util[e.user_id] < _OVERLOAD_THRESHOLD
        ]
        if not candidates:
            total_unmatched_tasks += proj.estimated_tasks
            continue

        # Score by skill match × available capacity
        scores = []
        for e in candidates:
            match = _skill_match(proj.required_skills, e.skills)
            capacity_left = max(_MAX_CAPACITY - e.current_tasks, 0)
            scores.append((e.user_id, match * capacity_left))

        total_score = sum(s for _, s in scores)
        if total_score == 0:
            total_unmatched_tasks += proj.estimated_tasks
            continue

        for uid, score in scores:
            share = (score / total_score) * proj.estimated_tasks
            additional_tasks[uid] = additional_tasks.get(uid, 0) + share

    # ── Forecast utilization ──────────────────────────────────────────────────
    forecasts: List[EmployeeCapacityForecast] = []
    overloaded, underutilized, optimal = [], [], []

    for e in employees:
        curr_pct = current_util[e.user_id]
        forecast_tasks = e.current_tasks + additional_tasks.get(e.user_id, 0)
        forecast_pct = round(min(forecast_tasks / _MAX_CAPACITY * 100, 120), 2)
        status = _utilization_status(forecast_pct)
        available_capacity = max(round(_MAX_CAPACITY - forecast_tasks, 1), 0)
        recommended = max(round(available_capacity), 0)

        if status == "OVERLOADED":
            overloaded.append(e.user_id)
        elif status == "UNDERUTILIZED":
            underutilized.append(e.user_id)
        else:
            optimal.append(e.user_id)

        forecasts.append(EmployeeCapacityForecast(
            user_id=e.user_id,
            current_utilization_pct=curr_pct,
            forecast_utilization_pct=forecast_pct,
            available_capacity=available_capacity,
            utilization_status=status,
            recommended_tasks=recommended,
        ))

    n = len(employees)
    avg_util = round(sum(f.forecast_utilization_pct for f in forecasts) / n, 2)

    # ── Capacity gap ──────────────────────────────────────────────────────────
    total_upcoming_tasks = sum(p.estimated_tasks for p in upcoming)
    total_capacity = sum(max(_MAX_CAPACITY - e.current_tasks, 0) for e in employees)
    capacity_gap = max(total_upcoming_tasks - total_capacity, 0.0)
    hiring_signal = capacity_gap > _MAX_CAPACITY * 2  # more than 2 FTE worth of gap

    # ── Insights ──────────────────────────────────────────────────────────────
    insights.append(f"Team of {n} — forecast average utilization: {avg_util:.0f}% over next {data.forecast_days} days")

    if overloaded:
        insights.append(f"{len(overloaded)} employee(s) forecasted to be overloaded — risk of burnout and quality issues")
        recommendations.append(f"Redistribute tasks from {len(overloaded)} overloaded employee(s) to underutilized teammates")

    if underutilized:
        insights.append(f"{len(underutilized)} employee(s) will be underutilized — untapped capacity available")
        recommendations.append(f"Assign additional tasks to {len(underutilized)} underutilized employee(s) to improve throughput")

    if capacity_gap > 0:
        insights.append(f"Capacity gap of {capacity_gap:.1f} task-slots for upcoming projects — demand exceeds supply")
        if hiring_signal:
            recommendations.append("Consider hiring or contracting additional resource — capacity gap exceeds 2 FTE equivalent")
        else:
            recommendations.append("Reprioritise or stagger upcoming project start dates to manage capacity gap")

    if total_unmatched_tasks > 0:
        insights.append(f"{total_unmatched_tasks:.0f} upcoming task(s) could not be matched to available skilled employees")
        recommendations.append("Review skill gaps — upcoming projects require skills not available in current team")

    on_leave = [e.user_id for e in employees if e.availability_status == "ON_LEAVE"]
    if on_leave:
        insights.append(f"{len(on_leave)} employee(s) on leave during forecast period — plan coverage")

    if not recommendations:
        recommendations = ["Team capacity is well-balanced — maintain current allocation strategy"]

    return ResourceUtilizationResult(
        forecast_period_days=data.forecast_days,
        team_avg_utilization_pct=avg_util,
        overloaded_employees=overloaded,
        underutilized_employees=underutilized,
        optimal_employees=optimal,
        capacity_gap=round(capacity_gap, 2),
        hiring_signal=hiring_signal,
        employee_forecasts=forecasts,
        insights=insights,
        recommendations=recommendations,
    )
