"""
Workforce Analytics

Aggregates individual performance scores into fleet-level insights.
Surfaces actionable signals for management dashboards.
"""

from typing import List, Optional
from ..schemas import (
    WorkforceAnalyticsInput,
    WorkforceAnalyticsResult,
    PerformanceInput,
)
from .performance import predict_performance


def _safe_avg(values: List[float]) -> Optional[float]:
    return round(sum(values) / len(values), 2) if values else None


def generate_workforce_analytics(data: WorkforceAnalyticsInput) -> WorkforceAnalyticsResult:
    employees = data.employees
    n = len(employees)

    if n == 0:
        return WorkforceAnalyticsResult(
            total_employees=0,
            avg_performance_score=0,
            top_performers=[],
            at_risk_employees=[],
            overall_task_completion_rate=0,
            avg_client_satisfaction=None,
            workforce_health_score=0,
            insights=["No employee data provided"],
            action_items=["Add employee records to enable analytics"],
        )

    # Run performance model for each employee
    results = [predict_performance(e) for e in employees]
    score_map = {r.user_id: r.performance_score for r in results}

    avg_perf = round(sum(score_map.values()) / n, 2)

    top_performers = [
        r.user_id for r in sorted(results, key=lambda x: x.performance_score, reverse=True)
        if r.performance_score >= 80
    ][:5]

    at_risk = [
        r.user_id for r in results if r.performance_score < 50
    ]

    # Task completion rate across all employees
    total_assigned = sum(e.total_tasks_assigned for e in employees)
    total_completed = sum(e.tasks_completed for e in employees)
    completion_rate = round(total_completed / total_assigned, 3) if total_assigned > 0 else 0.0

    # Client satisfaction
    ratings = [e.client_feedback_avg_rating for e in employees if e.client_feedback_avg_rating is not None]
    avg_satisfaction = _safe_avg(ratings)

    # Workforce health score: blend of perf, completion, and satisfaction
    health = avg_perf * 0.5
    health += completion_rate * 100 * 0.3
    if avg_satisfaction is not None:
        health += ((avg_satisfaction - 1) / 4) * 100 * 0.2
    else:
        health += avg_perf * 0.2  # fallback to perf if no client data
    workforce_health = round(min(max(health, 0), 100), 2)

    # Generate narrative insights
    insights: List[str] = []
    action_items: List[str] = []

    insights.append(f"Team of {n} employees with an average performance score of {avg_perf}/100")

    if top_performers:
        insights.append(f"{len(top_performers)} top performer(s) scoring 80+ — consider for leadership or mentorship roles")
    else:
        insights.append("No employees currently scoring 80+ — identify and develop high-potential talent")
        action_items.append("Create a performance improvement pathway to develop top performers")

    if at_risk:
        insights.append(f"{len(at_risk)} employee(s) scoring below 50 — immediate attention required")
        action_items.append(f"Schedule 1-on-1 reviews with {len(at_risk)} at-risk employee(s)")

    if completion_rate < 0.7:
        insights.append(f"Team task completion rate is {completion_rate:.0%} — below the 70% target")
        action_items.append("Review task pipeline for blockers; redistribute overdue work")
    elif completion_rate >= 0.9:
        insights.append(f"Excellent task completion rate of {completion_rate:.0%}")

    if avg_satisfaction is not None:
        if avg_satisfaction < 3.0:
            insights.append(f"Client satisfaction average is {avg_satisfaction:.1f}/5 — critical concern")
            action_items.append("Conduct client satisfaction review across all active projects")
        elif avg_satisfaction >= 4.0:
            insights.append(f"Strong client satisfaction at {avg_satisfaction:.1f}/5")

    overdue_heavy = [e for e in employees if e.tasks_overdue > 3]
    if overdue_heavy:
        action_items.append(
            f"{len(overdue_heavy)} employee(s) have 3+ overdue tasks — triage and reassign as needed"
        )

    on_leave = [e for e in employees if e.availability_status.value == "ON_LEAVE"]
    if on_leave:
        insights.append(f"{len(on_leave)} team member(s) currently on leave — plan coverage")

    if workforce_health >= 75:
        insights.append("Overall workforce health is strong")
    elif workforce_health < 50:
        insights.append("Workforce health is below acceptable threshold — leadership action required")
        action_items.append("Initiate a team health review and develop a 30-day improvement plan")

    return WorkforceAnalyticsResult(
        total_employees=n,
        avg_performance_score=avg_perf,
        top_performers=top_performers,
        at_risk_employees=at_risk,
        overall_task_completion_rate=completion_rate,
        avg_client_satisfaction=avg_satisfaction,
        workforce_health_score=workforce_health,
        insights=insights,
        action_items=action_items if action_items else ["No urgent actions required — continue monitoring"],
    )
