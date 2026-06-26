"""
Client Health Score Model

Produces a 0–100 composite health score across five dimensions:

  1. Satisfaction    (35%) — feedback ratings + recommendation rate
  2. Engagement      (25%) — project activity, approval participation, notification read rate
  3. Support Health  (20%) — resolution rate, no rejected requests
  4. Project Health  (15%) — ratio of active/completed projects, pending blockers
  5. Tenure          (5%)  — long-term clients are lower churn risk

Tiers: EXCELLENT (80+), GOOD (65–79), FAIR (50–64), AT_RISK (35–49), CRITICAL (<35)
"""

from ..schemas import ClientHealthInput, ClientHealthResult

_TIERS = [(80, "EXCELLENT"), (65, "GOOD"), (50, "FAIR"), (35, "AT_RISK")]


def _tier(score: float) -> str:
    for threshold, label in _TIERS:
        if score >= threshold:
            return label
    return "CRITICAL"


def score_client_health(data: ClientHealthInput) -> ClientHealthResult:
    strengths = []
    concerns = []
    dimensions = {}

    # ── 1. Satisfaction (35) ────────────────────────────────────────────────
    sat = 0.0
    if data.avg_feedback_rating is not None:
        sat += ((data.avg_feedback_rating - 1) / 4) * 25
        if data.avg_feedback_rating >= 4.0:
            strengths.append(f"Strong feedback rating ({data.avg_feedback_rating:.1f}/5)")
        elif data.avg_feedback_rating < 3.0:
            concerns.append(f"Low feedback rating ({data.avg_feedback_rating:.1f}/5) — satisfaction at risk")
    else:
        sat += 12.5  # neutral

    if data.total_feedbacks > 0:
        rec_rate = data.would_recommend_count / data.total_feedbacks
        sat += rec_rate * 10
        if rec_rate >= 0.8:
            strengths.append(f"High recommendation rate ({rec_rate:.0%})")
        elif rec_rate < 0.5:
            concerns.append(f"Low recommendation rate ({rec_rate:.0%})")
    else:
        sat += 5

    dimensions["satisfaction"] = round(sat, 2)

    # ── 2. Engagement (25) ──────────────────────────────────────────────────
    eng = 0.0
    if data.total_projects > 0:
        activity_ratio = (data.active_projects + data.completed_projects) / data.total_projects
        eng += activity_ratio * 12
        if data.active_projects > 0:
            strengths.append(f"{data.active_projects} active project(s) — client is engaged")
    else:
        concerns.append("No projects on record — client may be dormant")

    # Approval participation
    if data.pending_approvals == 0 and data.total_projects > 0:
        eng += 7
        strengths.append("No pending approvals — client is responsive")
    elif data.pending_approvals > 3:
        eng += 2
        concerns.append(f"{data.pending_approvals} pending approvals — client is unresponsive")
    else:
        eng += max(7 - data.pending_approvals * 1.5, 0)

    # Notification engagement
    notif_penalty = min(data.unread_notifications * 0.5, 6)
    eng += max(6 - notif_penalty, 0)
    if data.unread_notifications > 5:
        concerns.append(f"{data.unread_notifications} unread notifications — client not checking in")

    dimensions["engagement"] = round(eng, 2)

    # ── 3. Support Health (20) ──────────────────────────────────────────────
    sup = 0.0
    total_support = data.open_support_requests + data.resolved_support_requests + data.rejected_support_requests
    if total_support > 0:
        resolution_rate = data.resolved_support_requests / total_support
        sup += resolution_rate * 12
        if resolution_rate >= 0.8:
            strengths.append("High support request resolution rate")
        elif resolution_rate < 0.5:
            concerns.append("Low support resolution rate — client issues going unresolved")

        if data.rejected_support_requests > 0:
            reject_rate = data.rejected_support_requests / total_support
            sup -= reject_rate * 5
            if data.rejected_support_requests > 2:
                concerns.append(f"{data.rejected_support_requests} rejected support requests — client experience impacted")
    else:
        sup += 10  # no support requests = smooth engagement

    if data.open_support_requests > 3:
        sup -= 4
        concerns.append(f"{data.open_support_requests} open support requests need resolution")
    elif data.open_support_requests == 0:
        sup += 8
    else:
        sup += max(8 - data.open_support_requests * 2, 0)

    if data.open_revision_requests > 4:
        sup -= 3
        concerns.append(f"{data.open_revision_requests} open revision requests — rework churn affecting client")

    dimensions["support_health"] = round(max(sup, 0), 2)

    # ── 4. Project Health (15) ──────────────────────────────────────────────
    proj = 0.0
    if data.total_projects > 0:
        completion_rate = data.completed_projects / data.total_projects
        proj += completion_rate * 10
        if completion_rate >= 0.7:
            strengths.append("Strong project completion rate")
    else:
        proj += 5

    if data.is_active:
        proj += 5
    else:
        concerns.append("Client account is marked inactive")

    dimensions["project_health"] = round(proj, 2)

    # ── 5. Tenure (5) ────────────────────────────────────────────────────────
    tenure_score = min(data.months_as_client / 24 * 5, 5)
    dimensions["tenure"] = round(tenure_score, 2)
    if data.months_as_client >= 12:
        strengths.append(f"Long-term client ({data.months_as_client} months)")

    total = sum(dimensions.values())
    total = round(min(max(total, 0), 100), 2)

    return ClientHealthResult(
        client_id=data.client_id,
        company_name=data.company_name,
        health_score=total,
        health_tier=_tier(total),
        dimension_scores=dimensions,
        strengths=strengths or ["Meeting baseline expectations"],
        concerns=concerns or ["No significant concerns identified"],
        summary=_summary(total, data.company_name),
    )


def _summary(score: float, name: str) -> str:
    if score >= 80:
        return f"{name} is an excellent client — high satisfaction, engaged, and low risk. Focus on deepening the relationship."
    elif score >= 65:
        return f"{name} is in good standing. Minor areas to monitor but overall a healthy engagement."
    elif score >= 50:
        return f"{name} shows fair health. Address open issues proactively to prevent deterioration."
    elif score >= 35:
        return f"{name} is at risk. Immediate attention required to resolve concerns and rebuild trust."
    else:
        return f"{name} is in critical condition. Escalate to account management — churn risk is high."
