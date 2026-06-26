"""
Client Usage Analytics Model

Measures how actively and deeply a client is using Zoon's services.
Engagement dimensions:
  - Project utilization (how many projects are active vs. total)
  - Task delivery (are projects actually progressing?)
  - Feedback participation (does the client give structured feedback?)
  - Support intensity (how often do they raise issues?)
  - Revision intensity (how often do they request changes?)
  - Tenure-adjusted growth rate (projects per month)

Tiers: HIGHLY_ENGAGED (80+), ENGAGED (65–79), MODERATE (45–64), LOW (25–44), DORMANT (<25)
"""

from ..schemas import ClientUsageInput, UsageAnalyticsResult

_TIERS = [(80, "HIGHLY_ENGAGED"), (65, "ENGAGED"), (45, "MODERATE"), (25, "LOW")]


def _tier(score: float) -> str:
    for t, l in _TIERS:
        if score >= t:
            return l
    return "DORMANT"


def _safe_ratio(num: float, den: float, default: float = 0.0) -> float:
    return round(num / den, 3) if den > 0 else default


def generate_usage_analytics(data: ClientUsageInput) -> UsageAnalyticsResult:
    insights = []

    # ── Project utilization ──────────────────────────────────────────────────
    util_rate = _safe_ratio(data.active_projects, data.total_projects)
    util_score = util_rate * 25
    if util_rate == 1.0 and data.total_projects > 0:
        insights.append("All projects are currently active — maximum utilization")
    elif data.total_projects == 0:
        insights.append("No projects on record — client has not started any work")
        util_score = 0

    # ── Task completion rate ─────────────────────────────────────────────────
    task_completion = _safe_ratio(data.completed_tasks, data.total_tasks_across_projects)
    task_score = task_completion * 20
    if task_completion >= 0.85:
        insights.append(f"Excellent task completion rate ({task_completion:.0%}) across all projects")
    elif data.total_tasks_across_projects == 0:
        insights.append("No tasks recorded — projects may not have been broken down yet")

    # ── Feedback participation ────────────────────────────────────────────────
    feedback_rate = _safe_ratio(data.total_feedbacks_submitted, data.total_projects, default=0.0)
    feedback_score = min(feedback_rate, 1.0) * 20
    if feedback_rate >= 0.8:
        insights.append("Client consistently provides feedback — highly participatory")
    elif feedback_rate == 0:
        insights.append("No feedback submitted — client not engaging in quality loops")

    # ── Support intensity (higher is worse for health, but shows engagement) ─
    support_intensity = _safe_ratio(data.total_support_requests, data.total_projects)
    if support_intensity > 3:
        insights.append(f"High support request intensity ({support_intensity:.1f} per project) — client may be experiencing recurring issues")
        support_score = 5
    elif support_intensity > 1:
        insights.append(f"Moderate support intensity ({support_intensity:.1f} per project)")
        support_score = 12
    else:
        insights.append("Low support request rate — smooth service delivery")
        support_score = 18

    # ── Revision intensity ────────────────────────────────────────────────────
    revision_intensity = _safe_ratio(data.total_revision_requests, data.total_projects)
    if revision_intensity > 3:
        insights.append(f"High revision intensity ({revision_intensity:.1f} per project) — delivery quality or scope clarity may need attention")
    elif revision_intensity == 0 and data.total_projects > 0:
        insights.append("Zero revision requests — either perfect first-time delivery or client not engaging in review cycles")

    # ── Monthly project rate ──────────────────────────────────────────────────
    monthly_rate = _safe_ratio(data.total_projects, max(data.months_as_client, 1))
    growth_score = min(monthly_rate * 10, 17)
    if monthly_rate >= 0.5:
        insights.append(f"Strong project growth rate ({monthly_rate:.2f} projects/month)")
    elif monthly_rate < 0.1 and data.months_as_client > 6:
        insights.append("Low project initiation rate for tenure — consider proactive outreach")

    # ── Client satisfaction context ───────────────────────────────────────────
    if data.avg_feedback_rating is not None:
        if data.avg_feedback_rating >= 4.5:
            insights.append(f"Exceptional average feedback rating ({data.avg_feedback_rating:.1f}/5)")
        elif data.avg_feedback_rating < 3.0:
            insights.append(f"Low average feedback rating ({data.avg_feedback_rating:.1f}/5) — satisfaction gap")

    total_score = round(min(util_score + task_score + feedback_score + support_score + growth_score, 100), 2)

    return UsageAnalyticsResult(
        client_id=data.client_id,
        company_name=data.company_name,
        engagement_score=total_score,
        engagement_tier=_tier(total_score),
        project_utilization_rate=util_rate,
        task_completion_rate=task_completion,
        feedback_participation_rate=round(feedback_rate, 3),
        support_intensity=round(support_intensity, 3),
        revision_intensity=round(revision_intensity, 3),
        monthly_project_rate=round(monthly_rate, 3),
        insights=insights or ["Insufficient data to generate usage insights"],
    )
