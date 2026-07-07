"""
Smart Task Assignment Model

Scores each candidate employee for a given task across four dimensions:
  1. Skill match  — does the person have the required skills?
  2. Availability — is the person free to take on work?
  3. Workload     — how many active tasks do they already have?
  4. Performance  — historical quality/delivery track record

Returns a ranked list of candidates with the top recommendation.
"""

from __future__ import annotations
from typing import List
from ..schemas import (
    TaskAssignmentInput,
    TaskAssignmentResult,
    CandidateScore,
    CandidateEmployee,
    TaskRequirement,
    AvailabilityStatus,
)

_PRIORITY_URGENCY = {"LOW": 0.8, "MEDIUM": 1.0, "HIGH": 1.2, "CRITICAL": 1.5}
_AVAILABILITY_SCORE = {
    AvailabilityStatus.AVAILABLE: 100,
    AvailabilityStatus.BUSY: 40,
    AvailabilityStatus.ON_LEAVE: 0,
}
_MAX_REASONABLE_LOAD = 5  # tasks before workload score drops sharply


def _skill_match(required: List[str], candidate_skills: List[str]) -> float:
    if not required:
        return 100.0
    required_lower = {s.lower() for s in required}
    candidate_lower = {s.lower() for s in candidate_skills}
    matched = required_lower & candidate_lower
    return round(len(matched) / len(required_lower) * 100, 2)


def _workload_score(current_tasks: int) -> float:
    if current_tasks == 0:
        return 100.0
    if current_tasks >= _MAX_REASONABLE_LOAD:
        return max(0.0, 100 - (current_tasks - _MAX_REASONABLE_LOAD + 1) * 20)
    return round(100 - (current_tasks / _MAX_REASONABLE_LOAD) * 60, 2)


def _score_candidate(
    candidate: CandidateEmployee,
    task: TaskRequirement,
) -> CandidateScore:
    reasons: List[str] = []

    # Skill match (40%)
    skill_pct = _skill_match(task.required_skills, candidate.skills)
    skill_contrib = skill_pct * 0.40
    if skill_pct == 100:
        reasons.append("All required skills present")
    elif skill_pct >= 50:
        reasons.append(f"Partial skill match ({skill_pct:.0f}% of required skills)")
    else:
        reasons.append(f"Low skill match ({skill_pct:.0f}%) — may need upskilling")

    # Availability (25%)
    avail_raw = _AVAILABILITY_SCORE.get(candidate.availability_status, 0)
    avail_contrib = avail_raw * 0.25
    if candidate.availability_status == AvailabilityStatus.AVAILABLE:
        reasons.append("Fully available")
    elif candidate.availability_status == AvailabilityStatus.BUSY:
        reasons.append("Currently busy — limited bandwidth")
    else:
        reasons.append("On leave — not recommended unless critical")

    # Workload (20%)
    wl_score = _workload_score(candidate.current_task_load)
    wl_contrib = wl_score * 0.20
    if candidate.current_task_load == 0:
        reasons.append("No current task load — ideal capacity")
    elif candidate.current_task_load >= _MAX_REASONABLE_LOAD:
        reasons.append(f"Heavy workload ({candidate.current_task_load} active tasks)")

    # Performance history (15%)
    perf_raw = candidate.performance_score if candidate.performance_score is not None else 60.0
    perf_contrib = perf_raw * 0.15

    # Urgency modifier — upweight availability and performance for urgent tasks
    urgency = _PRIORITY_URGENCY.get(task.priority.upper(), 1.0)
    if urgency > 1.0:
        avail_contrib *= urgency
        perf_contrib *= urgency

    total = round(min(skill_contrib + avail_contrib + wl_contrib + perf_contrib, 100), 2)

    return CandidateScore(
        user_id=candidate.user_id,
        match_score=total,
        skill_match_pct=skill_pct,
        availability_score=float(avail_raw),
        workload_score=wl_score,
        performance_score=perf_raw,
        reasons=reasons,
    )


def assign_task(data: TaskAssignmentInput) -> TaskAssignmentResult:
    if not data.candidates:
        raise ValueError("No candidate employees provided")

    scored = [_score_candidate(c, data.task) for c in data.candidates]
    scored.sort(key=lambda s: s.match_score, reverse=True)

    best = scored[0]
    confidence = round(best.match_score / 100, 3)

    reasoning = (
        f"Recommended {best.user_id} with a match score of {best.match_score}/100. "
        f"Skill match: {best.skill_match_pct:.0f}%, "
        f"Availability: {best.availability_score:.0f}/100, "
        f"Workload capacity: {best.workload_score:.0f}/100, "
        f"Performance track record: {best.performance_score:.0f}/100."
    )

    return TaskAssignmentResult(
        task_id=data.task.task_id,
        recommended_user_id=best.user_id,
        confidence=confidence,
        all_candidates=scored,
        reasoning=reasoning,
    )
