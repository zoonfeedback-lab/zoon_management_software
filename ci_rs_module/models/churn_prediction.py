"""
Client Churn Prediction Model

Estimates the probability and risk level of a client churning (not renewing,
disengaging, or ending the relationship). Uses behavioral signals from the
Prisma schema.

Risk signals (industry-grounded):
  - Low/declining feedback ratings → satisfaction erosion
  - High unread notification ratio → disengagement / ghosting
  - No active projects + long gap since last project → dormancy
  - High rejected support requests → trust breakdown
  - Low would-recommend ratio → NPS proxy for churn intent
  - Short tenure with poor ratings → failed onboarding

Protective factors reduce the score:
  - Long tenure → switching cost is high
  - High recommendation rate → client is an advocate
  - Active projects → client is invested
"""

import math
from ..schemas import ChurnInput, ChurnResult

_RISK_LEVELS = [(75, "CRITICAL"), (55, "HIGH"), (35, "MEDIUM")]


def _risk_level(score: float) -> str:
    for t, l in _RISK_LEVELS:
        if score >= t:
            return l
    return "LOW"


def _churn_probability(score: float) -> float:
    return round(1 / (1 + math.exp(-0.1 * (score - 50))), 3)


def predict_churn(data: ChurnInput) -> ChurnResult:
    score = 0.0
    risk_drivers = []
    protective_factors = []

    # ── Inactive account ────────────────────────────────────────────────────
    if not data.is_active:
        score += 30
        risk_drivers.append("Client account is inactive")

    # ── Satisfaction signals ─────────────────────────────────────────────────
    if data.avg_feedback_rating is not None:
        if data.avg_feedback_rating < 2.5:
            score += 25
            risk_drivers.append(f"Very low feedback rating ({data.avg_feedback_rating:.1f}/5) — severe dissatisfaction")
        elif data.avg_feedback_rating < 3.5:
            score += 12
            risk_drivers.append(f"Below-average feedback rating ({data.avg_feedback_rating:.1f}/5)")
        elif data.avg_feedback_rating >= 4.5:
            score -= 5
            protective_factors.append(f"Excellent feedback rating ({data.avg_feedback_rating:.1f}/5)")

    # ── Would-recommend ratio ────────────────────────────────────────────────
    if data.would_recommend_ratio < 0.4:
        score += 20
        risk_drivers.append(f"Low recommendation rate ({data.would_recommend_ratio:.0%}) — client unlikely to advocate")
    elif data.would_recommend_ratio < 0.6:
        score += 8
    elif data.would_recommend_ratio >= 0.9:
        score -= 5
        protective_factors.append(f"High recommendation rate ({data.would_recommend_ratio:.0%}) — strong advocate")

    # ── Project activity ─────────────────────────────────────────────────────
    if data.total_projects == 0:
        score += 20
        risk_drivers.append("No projects on record — possible trial or stalled engagement")
    elif data.active_projects == 0 and data.total_projects > 0:
        score += 15
        risk_drivers.append("No active projects — client not currently engaged")
    elif data.active_projects > 0:
        score -= 8
        protective_factors.append(f"{data.active_projects} active project(s) — client is invested")

    # ── Time since last project ──────────────────────────────────────────────
    if data.months_since_last_project is not None:
        if data.months_since_last_project > 6:
            score += 18
            risk_drivers.append(f"No new project in {data.months_since_last_project} months — dormancy signal")
        elif data.months_since_last_project > 3:
            score += 8
            risk_drivers.append(f"{data.months_since_last_project} months since last project activity")

    # ── Support resolution rate ──────────────────────────────────────────────
    if data.support_request_resolution_rate < 0.5:
        score += 15
        risk_drivers.append(f"Low support resolution rate ({data.support_request_resolution_rate:.0%}) — unresolved issues eroding trust")
    elif data.support_request_resolution_rate >= 0.9:
        score -= 4
        protective_factors.append("Excellent support resolution rate")

    if data.rejected_support_requests > 2:
        score += 10
        risk_drivers.append(f"{data.rejected_support_requests} rejected support requests — client trust may be damaged")

    # ── Notification disengagement ───────────────────────────────────────────
    if data.unread_notifications_ratio > 0.6:
        score += 12
        risk_drivers.append(f"High unread notification ratio ({data.unread_notifications_ratio:.0%}) — client is not engaging with updates")
    elif data.unread_notifications_ratio > 0.3:
        score += 5

    # ── Pending blockers ─────────────────────────────────────────────────────
    if data.pending_approvals > 3:
        score += 8
        risk_drivers.append(f"{data.pending_approvals} pending approvals — client responsiveness is low")

    if data.open_revision_requests > 4:
        score += 6
        risk_drivers.append(f"{data.open_revision_requests} open revision requests — delivery quality concerns")

    # ── Tenure protection ────────────────────────────────────────────────────
    if data.months_as_client >= 24:
        score -= 10
        protective_factors.append(f"Long-term client ({data.months_as_client} months) — high switching cost")
    elif data.months_as_client >= 12:
        score -= 5
        protective_factors.append(f"Established client relationship ({data.months_as_client} months)")
    elif data.months_as_client < 3:
        score += 8
        risk_drivers.append("New client (<3 months) — still in onboarding window, higher early-exit risk")

    score = round(min(max(score, 0), 100), 2)

    if not risk_drivers:
        risk_drivers = ["No significant churn signals detected"]
    if not protective_factors:
        protective_factors = ["No strong protective factors identified — focus on building relationship depth"]

    return ChurnResult(
        client_id=data.client_id,
        company_name=data.company_name,
        churn_risk_score=score,
        churn_risk_level=_risk_level(score),
        churn_probability=_churn_probability(score),
        risk_drivers=risk_drivers,
        protective_factors=protective_factors,
    )
