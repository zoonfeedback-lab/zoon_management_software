"""
Department Performance Analysis Model

Scores each department across four dimensions and produces a ranked leaderboard:

  1. Efficiency       (30%) — task completion rate + speed
  2. Quality          (25%) — revision rate (lower = better), overdue ratio
  3. Client Impact    (25%) — avg client rating, active project ratio
  4. Team Health      (20%) — performance score, attrition risk count

Grade thresholds: A (85+), B (70+), C (55+), D (40+), F (<40)
"""

from typing import List
from ..schemas import (
    DepartmentPerformanceInput, DepartmentPerformanceResult,
    DepartmentSnapshot, DepartmentRanking
)

_GRADE_THRESHOLDS = [(85, "A"), (70, "B"), (55, "C"), (40, "D")]


def _grade(score: float) -> str:
    for t, g in _GRADE_THRESHOLDS:
        if score >= t:
            return g
    return "F"


def _score_department(dept: DepartmentSnapshot) -> DepartmentRanking:
    strengths = []
    improvements = []

    # ── 1. Efficiency (30) ────────────────────────────────────────────────────
    efficiency = 0.0
    if dept.total_tasks_assigned > 0:
        completion_rate = dept.tasks_completed / dept.total_tasks_assigned
        efficiency += completion_rate * 20
        if completion_rate >= 0.85:
            strengths.append(f"High task completion rate ({completion_rate:.0%})")
        elif completion_rate < 0.6:
            improvements.append(f"Low task completion rate ({completion_rate:.0%}) — review workload and blockers")
    else:
        completion_rate = 0.0
        efficiency += 10

    # Speed bonus
    if dept.avg_task_completion_days is not None:
        if dept.avg_task_completion_days <= 3:
            efficiency += 10
            strengths.append(f"Fast task turnaround ({dept.avg_task_completion_days:.1f} days avg)")
        elif dept.avg_task_completion_days <= 7:
            efficiency += 6
        elif dept.avg_task_completion_days > 14:
            efficiency += 1
            improvements.append(f"Slow task completion ({dept.avg_task_completion_days:.1f} days avg)")
        else:
            efficiency += 4
    else:
        efficiency += 5

    # ── 2. Quality (25) ───────────────────────────────────────────────────────
    quality = 0.0
    if dept.total_tasks_assigned > 0:
        overdue_ratio = dept.tasks_overdue / dept.total_tasks_assigned
        quality += (1 - overdue_ratio) * 15
        if overdue_ratio == 0:
            strengths.append("Zero overdue tasks — excellent deadline adherence")
        elif overdue_ratio > 0.3:
            improvements.append(f"High overdue ratio ({overdue_ratio:.0%}) — time management needs attention")

    if dept.total_projects > 0:
        revision_rate = dept.total_revision_requests / dept.total_projects
        if revision_rate == 0:
            quality += 10
            strengths.append("No revision requests — first-time quality delivery")
        elif revision_rate <= 1:
            quality += 7
        elif revision_rate <= 3:
            quality += 4
        else:
            quality += 1
            improvements.append(f"High revision rate ({revision_rate:.1f} per project) — quality review process needed")
    else:
        quality += 5

    # ── 3. Client Impact (25) ─────────────────────────────────────────────────
    client_impact = 0.0
    if dept.avg_client_rating is not None:
        client_impact += ((dept.avg_client_rating - 1) / 4) * 15
        if dept.avg_client_rating >= 4.0:
            strengths.append(f"Strong client satisfaction ({dept.avg_client_rating:.1f}/5)")
        elif dept.avg_client_rating < 3.0:
            improvements.append(f"Low client rating ({dept.avg_client_rating:.1f}/5) — client experience needs improvement")
    else:
        client_impact += 7.5

    if dept.total_projects > 0:
        active_ratio = dept.active_projects / dept.total_projects
        client_impact += active_ratio * 10
        if active_ratio >= 0.5:
            strengths.append(f"High active project ratio ({active_ratio:.0%}) — department is in demand")
    else:
        client_impact += 5
        improvements.append("No projects assigned — department may be underutilised")

    # ── 4. Team Health (20) ───────────────────────────────────────────────────
    team_health = 0.0
    if dept.avg_performance_score is not None:
        team_health += (dept.avg_performance_score / 100) * 14
        if dept.avg_performance_score >= 75:
            strengths.append(f"High average performance score ({dept.avg_performance_score:.0f}/100)")
        elif dept.avg_performance_score < 50:
            improvements.append(f"Below-average performance score ({dept.avg_performance_score:.0f}/100) — team needs support")
    else:
        team_health += 7

    if dept.headcount > 0:
        attrition_ratio = dept.attrition_risk_count / dept.headcount
        team_health += (1 - attrition_ratio) * 6
        if attrition_ratio > 0.3:
            improvements.append(f"High attrition risk ratio ({attrition_ratio:.0%}) — retention intervention needed")
        elif attrition_ratio == 0:
            strengths.append("No employees flagged at attrition risk")
    else:
        team_health += 3

    total = round(min(efficiency + quality + client_impact + team_health, 100), 2)

    return DepartmentRanking(
        department=dept.department,
        composite_score=total,
        rank=0,  # assigned after sorting
        grade=_grade(total),
        task_completion_rate=round(completion_rate, 3),
        efficiency_score=round(efficiency, 2),
        quality_score=round(quality, 2),
        client_impact_score=round(client_impact, 2),
        strengths=strengths or ["Meeting baseline expectations"],
        improvement_areas=improvements or ["No significant improvement areas identified"],
    )


def analyse_department_performance(data: DepartmentPerformanceInput) -> DepartmentPerformanceResult:
    departments = data.departments

    if not departments:
        return DepartmentPerformanceResult(
            period_label=data.period_label,
            rankings=[],
            top_department="N/A",
            lowest_department="N/A",
            organisation_avg_score=0,
            organisation_task_completion_rate=0,
            cross_department_insights=["No department data provided"],
            strategic_recommendations=["Add department data to enable performance analysis"],
        )

    rankings = [_score_department(d) for d in departments]
    rankings.sort(key=lambda r: r.composite_score, reverse=True)
    for i, r in enumerate(rankings):
        r.rank = i + 1

    org_avg = round(sum(r.composite_score for r in rankings) / len(rankings), 2)
    total_assigned = sum(d.total_tasks_assigned for d in departments)
    total_completed = sum(d.tasks_completed for d in departments)
    org_completion = round(total_completed / total_assigned, 3) if total_assigned > 0 else 0.0

    insights = []
    recommendations = []

    insights.append(f"Organisation average performance score: {org_avg}/100 for {data.period_label}")
    insights.append(f"Top department: {rankings[0].department} ({rankings[0].composite_score}/100 — Grade {rankings[0].grade})")

    if len(rankings) > 1:
        lowest = rankings[-1]
        insights.append(f"Lowest performing department: {lowest.department} ({lowest.composite_score}/100 — Grade {lowest.grade})")
        if lowest.composite_score < 50:
            recommendations.append(f"Prioritise performance review for {lowest.department} — score below 50 indicates systemic issues")

    score_spread = rankings[0].composite_score - rankings[-1].composite_score
    if score_spread > 30 and len(rankings) > 1:
        insights.append(f"High performance disparity ({score_spread:.0f} points between top and bottom) — investigate root causes")
        recommendations.append("Facilitate cross-department knowledge sharing between top and bottom performers")

    underperformers = [r for r in rankings if r.composite_score < 55]
    if underperformers:
        recommendations.append(f"Create improvement plans for {len(underperformers)} department(s) scoring below 55")

    if org_completion < 0.7:
        insights.append(f"Organisation-wide task completion rate is {org_completion:.0%} — below the 70% target")
        recommendations.append("Review organisation-wide task management practices and remove cross-department blockers")
    elif org_completion >= 0.9:
        insights.append(f"Excellent organisation-wide task completion rate of {org_completion:.0%}")

    high_attrition_depts = [d.department for d in departments
                             if d.headcount > 0 and d.attrition_risk_count / d.headcount > 0.25]
    if high_attrition_depts:
        insights.append(f"High attrition risk in: {', '.join(high_attrition_depts)}")
        recommendations.append(f"Initiate retention programmes in high-risk departments: {', '.join(high_attrition_depts)}")

    if not recommendations:
        recommendations = ["Maintain current performance trajectory — no urgent structural changes needed"]

    return DepartmentPerformanceResult(
        period_label=data.period_label,
        rankings=rankings,
        top_department=rankings[0].department,
        lowest_department=rankings[-1].department,
        organisation_avg_score=org_avg,
        organisation_task_completion_rate=org_completion,
        cross_department_insights=insights,
        strategic_recommendations=recommendations,
    )
