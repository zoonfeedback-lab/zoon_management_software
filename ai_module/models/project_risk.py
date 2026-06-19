"""
Project Risk Prediction Model

Computes a composite risk score (0–100) and on-time completion probability
for a project using schedule, task, team, and client signals.

Risk dimensions:
  - Schedule pressure   (how tight is the deadline vs. completion rate?)
  - Task health         (overdue ratio, completion %)
  - Team adequacy       (size, performance, PM presence)
  - Client signals      (feedback, pending approvals, support requests)
  - Revision load       (open revision requests proxy for rework churn)
"""

from ..schemas import ProjectRiskInput, ProjectRiskResult
import math


_RISK_LEVELS = [
    (75, "CRITICAL"),
    (55, "HIGH"),
    (35, "MEDIUM"),
]


def _risk_level(score: float) -> str:
    for threshold, level in _RISK_LEVELS:
        if score >= threshold:
            return level
    return "LOW"


def _completion_probability(risk_score: float) -> float:
    """Sigmoid-like mapping: risk 0→prob 0.95, risk 100→prob 0.05."""
    return round(1 / (1 + math.exp(0.08 * (risk_score - 50))), 3)


def predict_project_risk(data: ProjectRiskInput) -> ProjectRiskResult:
    score = 0.0
    risk_factors = []
    recommendations = []

    # ── 1. Schedule pressure (weight up to 30) ───────────────────────────────
    if data.days_until_deadline is not None:
        task_completion_rate = (
            data.completed_tasks / data.total_tasks if data.total_tasks > 0 else 0
        )
        remaining_pct = 1 - task_completion_rate

        if data.days_until_deadline <= 0:
            score += 30
            risk_factors.append("Deadline has passed — project is overdue")
            recommendations.append("Negotiate deadline extension or scope reduction immediately")
        elif data.days_until_deadline < 7 and remaining_pct > 0.3:
            score += 28
            risk_factors.append(
                f"Less than 7 days until deadline with {remaining_pct:.0%} tasks remaining"
            )
            recommendations.append("Escalate to management; consider scope reduction or resource surge")
        elif data.days_until_deadline < 14 and remaining_pct > 0.5:
            score += 20
            risk_factors.append("Tight deadline with more than half of tasks incomplete")
            recommendations.append("Add resources or cut scope to hit the deadline")
        elif data.days_until_deadline < 30 and remaining_pct > 0.7:
            score += 12
            risk_factors.append("Moderate schedule pressure — progress is behind pace")

    # ── 2. Task health (weight up to 25) ─────────────────────────────────────
    if data.total_tasks > 0:
        overdue_ratio = data.overdue_tasks / data.total_tasks
        if overdue_ratio > 0.4:
            score += 25
            risk_factors.append(f"Critical overdue task ratio ({overdue_ratio:.0%})")
            recommendations.append("Triage overdue tasks: cancel, reassign, or fast-track each one")
        elif overdue_ratio > 0.2:
            score += 15
            risk_factors.append(f"Elevated overdue task ratio ({overdue_ratio:.0%})")
            recommendations.append("Review task assignments and unblock bottlenecks")
        elif overdue_ratio > 0.1:
            score += 7

    # ── 3. Team adequacy (weight up to 20) ───────────────────────────────────
    if not data.has_project_manager:
        score += 15
        risk_factors.append("No project manager assigned")
        recommendations.append("Assign a project manager immediately to coordinate delivery")

    if data.team_size == 0:
        score += 20
        risk_factors.append("No team members assigned to the project")
        recommendations.append("Assign at least one team member before proceeding")
    elif data.team_size < 2 and (data.total_tasks or 0) > 5:
        score += 8
        risk_factors.append("Understaffed for task volume — single point of failure risk")
        recommendations.append("Consider adding a second team member to reduce key-person risk")

    if data.team_avg_performance_score is not None and data.team_avg_performance_score < 50:
        score += 10
        risk_factors.append("Team average performance score is below 50 — quality risk")
        recommendations.append("Pair low performers with senior members or provide targeted support")

    # ── 4. Client signals (weight up to 15) ──────────────────────────────────
    if data.pending_approvals > 2:
        score += 10
        risk_factors.append(f"{data.pending_approvals} pending client approvals blocking progress")
        recommendations.append("Chase outstanding client approvals to unblock team")
    elif data.pending_approvals > 0:
        score += 4

    if data.open_support_requests > 3:
        score += 8
        risk_factors.append(f"{data.open_support_requests} unresolved client support requests")
        recommendations.append("Prioritize resolving support requests to maintain client trust")

    if data.client_feedback_avg_rating is not None and data.client_feedback_avg_rating < 3.0:
        score += 10
        risk_factors.append("Poor client feedback score — relationship at risk")
        recommendations.append("Schedule a client alignment call to address satisfaction issues")

    # ── 5. Revision churn (weight up to 10) ──────────────────────────────────
    if data.open_revision_requests > 5:
        score += 10
        risk_factors.append(f"High revision churn ({data.open_revision_requests} open requests)")
        recommendations.append("Hold a quality review session to identify root causes of rework")
    elif data.open_revision_requests > 2:
        score += 5

    score = round(min(max(score, 0), 100), 2)

    if not risk_factors:
        risk_factors = ["No significant risk signals detected"]
    if not recommendations:
        recommendations = ["Maintain current delivery pace and monitor weekly"]

    return ProjectRiskResult(
        project_id=data.project_id,
        risk_score=score,
        risk_level=_risk_level(score),
        risk_factors=risk_factors,
        recommendations=recommendations,
        completion_probability=_completion_probability(score),
    )
