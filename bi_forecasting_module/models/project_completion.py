"""
Project Completion Prediction Model

Forecasts when a project will complete and whether it will finish on time,
using task velocity (tasks/day) as the primary signal.

Approach:
  1. Calculate current completion % from task counts
  2. Derive velocity = completed_tasks / days_since_start
  3. Project remaining tasks at current velocity → predicted days to completion
  4. Compare against deadline to determine on-time status
  5. Apply risk penalty factors (overdue tasks, revision churn, team gaps)

Confidence degrades with:
  - Very low velocity (too few data points)
  - High overdue ratio (unstable progress)
  - No deadline set (can't assess on-time)
  - Large number of pending blockers
"""

import math
from typing import Optional
from ..schemas import ProjectCompletionInput, ProjectCompletionResult, ProjectStatus


def predict_project_completion(data: ProjectCompletionInput) -> ProjectCompletionResult:
    risk_flags = []

    # ── Completion percentage ─────────────────────────────────────────────────
    if data.total_tasks > 0:
        completion_pct = round(data.completed_tasks / data.total_tasks * 100, 2)
    else:
        completion_pct = 0.0
        risk_flags.append("No tasks defined — unable to measure progress")

    remaining_tasks = data.total_tasks - data.completed_tasks

    # ── Velocity (tasks per day) ──────────────────────────────────────────────
    if data.days_since_start > 0 and data.completed_tasks > 0:
        velocity = round(data.completed_tasks / data.days_since_start, 3)
    else:
        velocity = 0.0
        if data.days_since_start > 3:
            risk_flags.append("No tasks completed yet — zero velocity detected")

    # ── Predicted days to completion ──────────────────────────────────────────
    if velocity > 0 and remaining_tasks > 0:
        predicted_completion_days = math.ceil(remaining_tasks / velocity)
    elif remaining_tasks == 0:
        predicted_completion_days = 0
    else:
        predicted_completion_days = None
        risk_flags.append("Cannot forecast completion — no velocity data")

    # ── Schedule variance ─────────────────────────────────────────────────────
    schedule_variance = None
    predicted_on_time = True

    if data.days_until_deadline is not None and predicted_completion_days is not None:
        schedule_variance = data.days_until_deadline - predicted_completion_days
        predicted_on_time = schedule_variance >= 0
        if schedule_variance < 0:
            risk_flags.append(f"Project is forecasted to be {abs(schedule_variance)} day(s) late")
        elif schedule_variance < 3:
            risk_flags.append("On track but very tight — less than 3 days buffer")
    elif data.days_until_deadline is not None and data.days_until_deadline < 0:
        predicted_on_time = False
        risk_flags.append("Deadline has already passed")

    # ── Risk factors ──────────────────────────────────────────────────────────
    if data.total_tasks > 0:
        overdue_ratio = data.overdue_tasks / data.total_tasks
        if overdue_ratio > 0.3:
            risk_flags.append(f"High overdue task ratio ({overdue_ratio:.0%}) — velocity may be overstated")
        elif overdue_ratio > 0.15:
            risk_flags.append(f"Elevated overdue ratio ({overdue_ratio:.0%}) — monitor closely")

    if data.open_revision_requests > 3:
        risk_flags.append(f"{data.open_revision_requests} open revision requests — rework adding hidden delay")

    if data.pending_approvals > 2:
        risk_flags.append(f"{data.pending_approvals} pending client approvals blocking progress")

    if data.team_size == 0:
        risk_flags.append("No team members assigned")
    elif data.team_size == 1 and (data.total_tasks or 0) > 10:
        risk_flags.append("Single-person team for a large task volume — key-person risk")

    if data.avg_team_performance_score is not None and data.avg_team_performance_score < 50:
        risk_flags.append("Team average performance below 50 — delivery quality at risk")

    if data.status == ProjectStatus.DRAFT:
        risk_flags.append("Project is still in DRAFT status — has it officially started?")

    # ── Confidence score ──────────────────────────────────────────────────────
    confidence = 0.85
    if velocity == 0:
        confidence -= 0.4
    if data.total_tasks < 5:
        confidence -= 0.15
    if data.overdue_tasks / max(data.total_tasks, 1) > 0.3:
        confidence -= 0.15
    if data.days_until_deadline is None:
        confidence -= 0.1
    if len(risk_flags) > 4:
        confidence -= 0.1
    confidence = round(max(min(confidence, 1.0), 0.1), 2)

    summary = _summary(completion_pct, predicted_on_time, predicted_completion_days,
                       schedule_variance, data.project_name)

    return ProjectCompletionResult(
        project_id=data.project_id,
        project_name=data.project_name,
        completion_percentage=completion_pct,
        predicted_completion_days=predicted_completion_days,
        predicted_on_time=predicted_on_time,
        confidence=confidence,
        schedule_variance_days=schedule_variance,
        velocity=velocity,
        risk_flags=risk_flags if risk_flags else ["No significant delivery risks detected"],
        forecast_summary=summary,
    )


def _summary(pct: float, on_time: bool, days: Optional[int],
             variance: Optional[int], name: str) -> str:
    status = "on track" if on_time else "at risk of delay"
    if days == 0:
        return f"{name} is complete ({pct:.0f}% done)."
    if days is None:
        return f"{name} is {pct:.0f}% complete. Completion date cannot be forecasted — no task velocity data available."
    ahead = f"{variance} day(s) ahead of schedule" if variance and variance > 0 else \
            f"{abs(variance)} day(s) behind schedule" if variance and variance < 0 else "right on schedule"
    return (f"{name} is {pct:.0f}% complete and {status}. "
            f"At current velocity, completion is forecast in {days} day(s) — {ahead}.")
