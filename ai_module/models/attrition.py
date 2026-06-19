"""
Attrition Risk Prediction Model

Estimates the likelihood that an employee is disengaged or at risk of leaving
(or becoming a performance liability). Uses behavioral signals available in the
Prisma schema. Replace with a trained logistic regression / gradient boosting
model once longitudinal HR data is available.

Risk factors are drawn from industry research (Gallup, SHRM):
  - Short tenure + high overdue rate → classic early disengagement
  - Low client feedback → quality/motivation issues
  - High revision rejection → recurring quality problems
  - On leave with no active tasks → possible disengagement
"""

from ..schemas import AttritionInput, AttritionResult


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


def predict_attrition(data: AttritionInput) -> AttritionResult:
    score = 0.0
    risk_factors = []
    retention_actions = []

    # ── 1. Tenure (short tenure = higher risk) ───────────────────────────────
    if data.months_at_company < 3:
        score += 20
        risk_factors.append("Very short tenure (<3 months) — high early-exit window")
        retention_actions.append("Assign a dedicated onboarding mentor for the first 90 days")
    elif data.months_at_company < 6:
        score += 10
        risk_factors.append("Early tenure (<6 months) — still in adjustment phase")
    elif data.months_at_company > 24:
        score -= 5  # long-tenured employees are less likely to leave

    # ── 2. Overdue task ratio (proxy for disengagement or overwhelm) ─────────
    if data.tasks_overdue_ratio > 0.4:
        score += 25
        risk_factors.append(f"High overdue task ratio ({data.tasks_overdue_ratio:.0%}) — possible burnout or disengagement")
        retention_actions.append("Review task workload and remove blockers; check in 1-on-1")
    elif data.tasks_overdue_ratio > 0.2:
        score += 12
        risk_factors.append("Elevated overdue task ratio — workload may be unsustainable")
        retention_actions.append("Prioritize and redistribute tasks to reduce backlog")

    # ── 3. Revision rejection ratio ──────────────────────────────────────────
    if data.revision_rejection_ratio > 0.5:
        score += 20
        risk_factors.append("More than half of revisions rejected — recurring quality issues")
        retention_actions.append("Pair with a senior team member for code/work review sessions")
    elif data.revision_rejection_ratio > 0.3:
        score += 10
        risk_factors.append("Above-average revision rejection rate")

    # ── 4. Client satisfaction ────────────────────────────────────────────────
    if data.client_feedback_avg_rating is not None:
        if data.client_feedback_avg_rating < 2.5:
            score += 20
            risk_factors.append("Very low client feedback score — significant satisfaction problem")
            retention_actions.append("Investigate root cause of poor client feedback; provide coaching")
        elif data.client_feedback_avg_rating < 3.5:
            score += 8
            risk_factors.append("Below-average client satisfaction")

    # ── 5. Project isolation (no project breadth) ────────────────────────────
    if data.projects_contributed == 0:
        score += 15
        risk_factors.append("Not contributing to any projects — risk of feeling underutilized")
        retention_actions.append("Assign to at least one active project immediately")
    elif data.projects_contributed == 1 and data.months_at_company > 6:
        score += 5
        risk_factors.append("Limited project exposure for tenure length")

    # ── 6. Completion speed ───────────────────────────────────────────────────
    if data.avg_task_completion_days is not None and data.avg_task_completion_days > 14:
        score += 10
        risk_factors.append("Slow average task completion — possible capability or motivation gap")
        retention_actions.append("Break down tasks into smaller milestones; review complexity fit")

    # ── 7. Leave + no active tasks ────────────────────────────────────────────
    if data.is_on_leave and not data.has_active_tasks:
        score += 10
        risk_factors.append("Currently on leave with no active tasks — re-engagement risk on return")
        retention_actions.append("Plan a structured return-to-work with a clear first week of tasks")

    score = round(min(max(score, 0), 100), 2)

    if not risk_factors:
        risk_factors = ["No significant attrition signals detected"]
    if not retention_actions:
        retention_actions = ["Maintain current engagement; continue regular check-ins"]

    return AttritionResult(
        user_id=data.user_id,
        attrition_risk_score=score,
        risk_level=_risk_level(score),
        risk_factors=risk_factors,
        retention_actions=retention_actions,
    )
