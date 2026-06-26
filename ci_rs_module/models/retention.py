"""
Retention Recommendations Engine

Synthesizes health score, churn risk, and engagement score into a prioritized
action plan for account managers. Actions are categorized and prioritized:

  Priority:  IMMEDIATE / SHORT_TERM / LONG_TERM
  Category:  COMMUNICATION / SERVICE / COMMERCIAL / RELATIONSHIP

The engine works in tiers — URGENT clients get immediate crisis actions,
WATCH clients get proactive relationship actions, SAFE clients get growth actions.
"""

from ..schemas import RetentionInput, RetentionResult, RetentionAction


def _overall_risk_tier(health: float, churn: float) -> str:
    if churn >= 70 or health < 35:
        return "URGENT"
    elif churn >= 45 or health < 55:
        return "AT_RISK"
    elif churn >= 25 or health < 70:
        return "WATCH"
    return "SAFE"


def _next_touchpoint(tier: str) -> int:
    return {"URGENT": 1, "AT_RISK": 7, "WATCH": 14, "SAFE": 30}.get(tier, 14)


def generate_retention_recommendations(data: RetentionInput) -> RetentionResult:
    tier = _overall_risk_tier(data.health_score, data.churn_risk_score)
    actions: list[RetentionAction] = []

    # ── URGENT tier ──────────────────────────────────────────────────────────
    if tier == "URGENT":
        actions.append(RetentionAction(
            priority="IMMEDIATE",
            category="COMMUNICATION",
            action="Schedule an emergency executive call within 24 hours to understand client concerns",
            expected_impact="Opens dialogue before the client disengages completely",
        ))
        if data.open_support_requests > 0:
            actions.append(RetentionAction(
                priority="IMMEDIATE",
                category="SERVICE",
                action=f"Resolve all {data.open_support_requests} open support request(s) within 48 hours — assign dedicated support resource",
                expected_impact="Demonstrates responsiveness and commitment to service quality",
            ))
        if data.avg_feedback_rating is not None and data.avg_feedback_rating < 3.0:
            actions.append(RetentionAction(
                priority="IMMEDIATE",
                category="RELATIONSHIP",
                action="Conduct a structured satisfaction recovery session — present a formal improvement plan",
                expected_impact="Converts dissatisfied client into a recovering relationship",
            ))
        if data.pending_approvals > 2:
            actions.append(RetentionAction(
                priority="IMMEDIATE",
                category="SERVICE",
                action=f"Follow up on {data.pending_approvals} pending approval(s) — simplify the approval process if needed",
                expected_impact="Removes client-side bottlenecks and shows responsiveness",
            ))
        actions.append(RetentionAction(
            priority="SHORT_TERM",
            category="COMMERCIAL",
            action="Review contract terms and explore whether scope adjustments could improve satisfaction",
            expected_impact="Aligns commercial expectations with client needs",
        ))

    # ── AT_RISK tier ─────────────────────────────────────────────────────────
    elif tier == "AT_RISK":
        actions.append(RetentionAction(
            priority="IMMEDIATE",
            category="COMMUNICATION",
            action="Schedule a proactive check-in call this week — use it to surface concerns before they escalate",
            expected_impact="Early intervention prevents at-risk clients from reaching churn threshold",
        ))
        if data.open_revision_requests > 2:
            actions.append(RetentionAction(
                priority="IMMEDIATE",
                category="SERVICE",
                action=f"Prioritize closing {data.open_revision_requests} open revision request(s) — assign senior team member",
                expected_impact="Resolving rework quickly restores delivery confidence",
            ))
        if data.engagement_score < 50:
            actions.append(RetentionAction(
                priority="SHORT_TERM",
                category="RELATIONSHIP",
                action="Invite client to a quarterly business review (QBR) — present project progress and roadmap",
                expected_impact="Re-engages client in the value being delivered",
            ))
        if data.months_since_last_project is not None and data.months_since_last_project > 3:
            actions.append(RetentionAction(
                priority="SHORT_TERM",
                category="COMMERCIAL",
                action="Propose a new project or service offering aligned to client's business goals",
                expected_impact="Reignites commercial relationship and reduces dormancy risk",
            ))
        actions.append(RetentionAction(
            priority="LONG_TERM",
            category="RELATIONSHIP",
            action="Assign a dedicated account manager as the single point of contact for this client",
            expected_impact="Improves relationship depth and reduces churn likelihood",
        ))

    # ── WATCH tier ───────────────────────────────────────────────────────────
    elif tier == "WATCH":
        actions.append(RetentionAction(
            priority="SHORT_TERM",
            category="COMMUNICATION",
            action="Schedule a bi-weekly check-in to stay ahead of any emerging concerns",
            expected_impact="Proactive communication prevents minor issues from becoming blockers",
        ))
        if data.avg_feedback_rating is not None and data.avg_feedback_rating < 4.0:
            actions.append(RetentionAction(
                priority="SHORT_TERM",
                category="SERVICE",
                action="Send a short structured survey to identify specific areas of improvement",
                expected_impact="Turns vague dissatisfaction into actionable feedback",
            ))
        if data.open_support_requests > 0:
            actions.append(RetentionAction(
                priority="SHORT_TERM",
                category="SERVICE",
                action=f"Resolve {data.open_support_requests} open support request(s) and follow up to confirm satisfaction",
                expected_impact="Closes open loops and builds trust",
            ))
        actions.append(RetentionAction(
            priority="LONG_TERM",
            category="COMMERCIAL",
            action="Explore upsell or cross-sell opportunities that add value to the client's current work",
            expected_impact="Deepens commercial relationship and increases switching cost",
        ))

    # ── SAFE tier ────────────────────────────────────────────────────────────
    else:
        actions.append(RetentionAction(
            priority="LONG_TERM",
            category="RELATIONSHIP",
            action="Invite client to join a client advisory panel or case study — recognize them as a valued partner",
            expected_impact="Converts a satisfied client into a brand advocate",
        ))
        if data.would_recommend_ratio >= 0.8:
            actions.append(RetentionAction(
                priority="LONG_TERM",
                category="COMMERCIAL",
                action="Request a referral or testimonial — this client is likely to recommend Zoon to peers",
                expected_impact="Generates new business pipeline from existing client goodwill",
            ))
        actions.append(RetentionAction(
            priority="LONG_TERM",
            category="COMMUNICATION",
            action="Schedule a monthly strategic alignment session to stay connected with evolving business needs",
            expected_impact="Maintains relationship depth and surfaces new opportunities",
        ))
        actions.append(RetentionAction(
            priority="LONG_TERM",
            category="COMMERCIAL",
            action="Present a roadmap of upcoming Zoon capabilities and explore how they fit the client's future plans",
            expected_impact="Positions Zoon as a long-term strategic partner, not just a vendor",
        ))

    key_message = _key_message(tier, data)

    return RetentionResult(
        client_id=data.client_id,
        company_name=data.company_name,
        overall_risk_tier=tier,
        recommended_actions=actions,
        key_message=key_message,
        next_touchpoint_days=_next_touchpoint(tier),
    )


def _key_message(tier: str, data: RetentionInput) -> str:
    if tier == "URGENT":
        return (
            f"{data.company_name} requires immediate intervention. "
            f"Health score {data.health_score:.0f}/100 and churn risk {data.churn_risk_score:.0f}/100 "
            f"indicate a high probability of losing this client. Act within 24 hours."
        )
    elif tier == "AT_RISK":
        return (
            f"{data.company_name} is showing early warning signs. "
            f"Proactive outreach this week can prevent escalation to critical status."
        )
    elif tier == "WATCH":
        return (
            f"{data.company_name} is stable but has room for improvement. "
            f"Regular communication and resolving open items will strengthen the relationship."
        )
    else:
        return (
            f"{data.company_name} is a healthy, engaged client. "
            f"Focus on deepening the relationship and exploring growth opportunities."
        )
