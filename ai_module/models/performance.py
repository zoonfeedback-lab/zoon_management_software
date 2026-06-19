"""
Performance Prediction Model

Scores employee performance (0–100) using a weighted heuristic model built
around the existing Prisma schema data points. Designed to be replaced with a
trained scikit-learn model once sufficient historical data is collected.

Weights are grounded in management research on software team performance:
  - Task completion reliability carries the most signal
  - Revision rejection rate is a proxy for quality
  - Client satisfaction is a lagging indicator
"""

from ..schemas import PerformanceInput, PerformanceResult
from typing import Tuple


_EXPERIENCE_BONUS = {"JUNIOR": 0, "MID": 3, "SENIOR": 5}

_GRADE_THRESHOLDS = [
    (85, "A"),
    (70, "B"),
    (55, "C"),
    (40, "D"),
]


def _grade(score: float) -> str:
    for threshold, grade in _GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "F"


def predict_performance(data: PerformanceInput) -> PerformanceResult:
    score = 0.0
    strengths = []
    improvements = []

    # ── 1. Task completion rate (weight 35) ─────────────────────────────────
    if data.total_tasks_assigned > 0:
        completion_rate = data.tasks_completed / data.total_tasks_assigned
        task_score = completion_rate * 35
        score += task_score
        if completion_rate >= 0.85:
            strengths.append("Consistently completes assigned tasks")
        elif completion_rate < 0.6:
            improvements.append("Low task completion rate — review workload or blockers")
    else:
        score += 17.5  # neutral for new employees

    # ── 2. Overdue penalty (weight 20) ───────────────────────────────────────
    if data.total_tasks_assigned > 0:
        overdue_rate = data.tasks_overdue / data.total_tasks_assigned
        overdue_score = (1 - overdue_rate) * 20
        score += max(overdue_score, 0)
        if overdue_rate == 0:
            strengths.append("No overdue tasks — strong deadline adherence")
        elif overdue_rate > 0.3:
            improvements.append("High overdue rate — time management needs attention")
    else:
        score += 10

    # ── 3. Revision quality (weight 20) ──────────────────────────────────────
    total_revisions = data.revisions_approved + data.revisions_rejected
    if total_revisions > 0:
        approval_rate = data.revisions_approved / total_revisions
        revision_score = approval_rate * 20
        score += revision_score
        if approval_rate >= 0.8:
            strengths.append("High revision approval rate — quality work output")
        elif approval_rate < 0.5:
            improvements.append("Revision rejection rate is high — focus on quality before submission")
    elif data.revision_requests_received == 0:
        score += 15  # no revisions needed is a good sign

    # ── 4. Client satisfaction (weight 15) ───────────────────────────────────
    if data.client_feedback_avg_rating is not None:
        satisfaction_score = ((data.client_feedback_avg_rating - 1) / 4) * 15
        score += satisfaction_score
        if data.client_feedback_avg_rating >= 4.0:
            strengths.append("Strong client satisfaction ratings")
        elif data.client_feedback_avg_rating < 3.0:
            improvements.append("Client satisfaction is below expectations")
    else:
        score += 7.5  # neutral

    # ── 5. Project breadth (weight 5) ────────────────────────────────────────
    breadth_score = min(data.projects_contributed, 5) * 1.0
    score += breadth_score
    if data.projects_contributed >= 3:
        strengths.append("Contributes across multiple projects")

    # ── 6. Experience level bonus (weight 5) ─────────────────────────────────
    exp = (data.experience_level or "").upper()
    score += _EXPERIENCE_BONUS.get(exp, 0)

    # ── 7. Availability factor ────────────────────────────────────────────────
    if data.availability_status.value == "ON_LEAVE":
        score *= 0.9  # slight dampening — not a penalty, just context

    score = round(min(max(score, 0), 100), 2)

    recommendation = _build_recommendation(score, data)

    return PerformanceResult(
        user_id=data.user_id,
        performance_score=score,
        grade=_grade(score),
        strengths=strengths or ["Meeting baseline expectations"],
        areas_for_improvement=improvements or ["Continue current performance trajectory"],
        recommendation=recommendation,
    )


def _build_recommendation(score: float, data: PerformanceInput) -> str:
    if score >= 85:
        return "Exceptional performer. Consider for senior responsibilities or mentorship roles."
    elif score >= 70:
        return "Strong performer. Provide growth opportunities and stretch assignments."
    elif score >= 55:
        return "Adequate performer. Create a targeted development plan to address gaps."
    elif score >= 40:
        return "Below expectations. Schedule a performance review and provide close mentorship."
    else:
        return "Critical underperformance. Immediate intervention required — review workload, support needs, and fit."
