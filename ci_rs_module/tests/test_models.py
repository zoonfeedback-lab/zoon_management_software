"""Unit tests for all CI&RS models."""

import pytest
from ..schemas import (
    ClientHealthInput,
    ChurnInput,
    ClientUsageInput,
    RetentionInput,
    PortfolioAnalyticsInput,
)
from ..models import (
    score_client_health,
    predict_churn,
    generate_usage_analytics,
    generate_retention_recommendations,
    generate_portfolio_analytics,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _health(**kw):
    defaults = dict(
        client_id="c1", company_name="Acme Corp",
        total_projects=5, active_projects=3, completed_projects=2,
        total_feedbacks=3, avg_feedback_rating=4.2, would_recommend_count=3,
        open_support_requests=1, resolved_support_requests=4, rejected_support_requests=0,
        open_revision_requests=1, pending_approvals=0,
        unread_notifications=2, months_as_client=14, is_active=True,
    )
    defaults.update(kw)
    return ClientHealthInput(**defaults)


def _churn(**kw):
    defaults = dict(
        client_id="c1", company_name="Acme Corp",
        months_as_client=14, avg_feedback_rating=4.0,
        would_recommend_ratio=0.8, total_projects=5, active_projects=2,
        support_request_resolution_rate=0.85, rejected_support_requests=0,
        open_revision_requests=1, pending_approvals=0,
        months_since_last_project=1, unread_notifications_ratio=0.1, is_active=True,
    )
    defaults.update(kw)
    return ChurnInput(**defaults)


def _usage(**kw):
    defaults = dict(
        client_id="c1", company_name="Acme Corp",
        total_projects=5, active_projects=3, completed_projects=2, draft_projects=0,
        total_tasks_across_projects=40, completed_tasks=32,
        total_feedbacks_submitted=4, total_support_requests=3,
        total_revision_requests=2, total_approvals_given=2,
        months_as_client=14, avg_feedback_rating=4.2,
    )
    defaults.update(kw)
    return ClientUsageInput(**defaults)


def _retention(**kw):
    defaults = dict(
        client_id="c1", company_name="Acme Corp",
        health_score=72.0, churn_risk_score=22.0, engagement_score=68.0,
        avg_feedback_rating=4.2, open_support_requests=1,
        open_revision_requests=1, pending_approvals=0,
        months_as_client=14, active_projects=2,
        months_since_last_project=1, would_recommend_ratio=0.8,
    )
    defaults.update(kw)
    return RetentionInput(**defaults)


# ─── Health Score Tests ────────────────────────────────────────────────────────

def test_health_score_bounded():
    result = score_client_health(_health())
    assert 0 <= result.health_score <= 100


def test_health_score_excellent():
    result = score_client_health(_health(
        avg_feedback_rating=5.0, would_recommend_count=5, total_feedbacks=5,
        open_support_requests=0, resolved_support_requests=8,
        pending_approvals=0, unread_notifications=0,
        active_projects=5, completed_projects=5, months_as_client=30,
    ))
    assert result.health_score >= 70
    assert result.health_tier in ("EXCELLENT", "GOOD")


def test_health_score_critical():
    result = score_client_health(_health(
        avg_feedback_rating=1.5, would_recommend_count=0, total_feedbacks=5,
        open_support_requests=8, resolved_support_requests=1, rejected_support_requests=5,
        pending_approvals=5, unread_notifications=20,
        active_projects=0, completed_projects=0, months_as_client=1, is_active=False,
    ))
    assert result.health_score < 50
    assert result.health_tier in ("AT_RISK", "CRITICAL", "FAIR")


def test_health_score_has_dimensions():
    result = score_client_health(_health())
    assert "satisfaction" in result.dimension_scores
    assert "engagement" in result.dimension_scores
    assert "support_health" in result.dimension_scores
    assert "project_health" in result.dimension_scores
    assert "tenure" in result.dimension_scores


def test_health_score_no_projects():
    result = score_client_health(_health(total_projects=0, active_projects=0, completed_projects=0))
    assert 0 <= result.health_score <= 100


# ─── Churn Prediction Tests ────────────────────────────────────────────────────

def test_churn_score_bounded():
    result = predict_churn(_churn())
    assert 0 <= result.churn_risk_score <= 100
    assert 0 <= result.churn_probability <= 1


def test_churn_low_risk():
    result = predict_churn(_churn(
        avg_feedback_rating=4.8, would_recommend_ratio=0.95,
        active_projects=3, months_since_last_project=0,
        support_request_resolution_rate=0.95, months_as_client=30,
        unread_notifications_ratio=0.05,
    ))
    assert result.churn_risk_level in ("LOW", "MEDIUM")


def test_churn_critical():
    result = predict_churn(_churn(
        avg_feedback_rating=1.5, would_recommend_ratio=0.1,
        active_projects=0, months_since_last_project=9,
        support_request_resolution_rate=0.2, rejected_support_requests=5,
        months_as_client=1, unread_notifications_ratio=0.9, is_active=False,
    ))
    assert result.churn_risk_score >= 55
    assert result.churn_risk_level in ("HIGH", "CRITICAL")


def test_churn_has_drivers_and_factors():
    result = predict_churn(_churn())
    assert len(result.risk_drivers) > 0
    assert len(result.protective_factors) > 0


# ─── Usage Analytics Tests ─────────────────────────────────────────────────────

def test_usage_score_bounded():
    result = generate_usage_analytics(_usage())
    assert 0 <= result.engagement_score <= 100


def test_usage_highly_engaged():
    result = generate_usage_analytics(_usage(
        total_projects=10, active_projects=10, completed_tasks=95,
        total_tasks_across_projects=100, total_feedbacks_submitted=10,
        total_support_requests=2, months_as_client=12,
    ))
    assert result.engagement_tier in ("HIGHLY_ENGAGED", "ENGAGED")


def test_usage_dormant():
    result = generate_usage_analytics(_usage(
        total_projects=1, active_projects=0, completed_tasks=0,
        total_tasks_across_projects=5, total_feedbacks_submitted=0,
        total_support_requests=0, months_as_client=24,
    ))
    assert result.engagement_tier in ("DORMANT", "LOW", "MODERATE")


def test_usage_rates_bounded():
    result = generate_usage_analytics(_usage())
    assert 0 <= result.project_utilization_rate <= 1
    assert 0 <= result.task_completion_rate <= 1
    assert result.support_intensity >= 0


# ─── Retention Tests ──────────────────────────────────────────────────────────

def test_retention_safe_client():
    result = generate_retention_recommendations(_retention())
    assert result.overall_risk_tier == "SAFE"
    assert len(result.recommended_actions) > 0
    assert result.next_touchpoint_days == 30


def test_retention_urgent_client():
    result = generate_retention_recommendations(_retention(
        health_score=25.0, churn_risk_score=80.0, engagement_score=20.0,
        avg_feedback_rating=1.5, open_support_requests=8, pending_approvals=5,
    ))
    assert result.overall_risk_tier == "URGENT"
    assert result.next_touchpoint_days == 1
    assert any(a.priority == "IMMEDIATE" for a in result.recommended_actions)


def test_retention_at_risk():
    result = generate_retention_recommendations(_retention(
        health_score=45.0, churn_risk_score=55.0, engagement_score=40.0,
    ))
    assert result.overall_risk_tier in ("AT_RISK", "URGENT")


def test_retention_has_key_message():
    result = generate_retention_recommendations(_retention())
    assert len(result.key_message) > 10


# ─── Portfolio Analytics Tests ─────────────────────────────────────────────────

def test_portfolio_empty():
    result = generate_portfolio_analytics(PortfolioAnalyticsInput(clients=[]))
    assert result.total_clients == 0
    assert result.portfolio_health_score == 0


def test_portfolio_mixed():
    clients = [
        _health(client_id="c1", avg_feedback_rating=4.8, months_as_client=24),
        _health(client_id="c2", avg_feedback_rating=1.5, open_support_requests=8,
                rejected_support_requests=5, is_active=False),
        _health(client_id="c3", avg_feedback_rating=3.5, months_as_client=6),
    ]
    result = generate_portfolio_analytics(PortfolioAnalyticsInput(clients=clients))
    assert result.total_clients == 3
    assert 0 <= result.portfolio_health_score <= 100
    assert isinstance(result.insights, list)
    assert len(result.insights) > 0


def test_portfolio_all_healthy():
    clients = [_health(client_id=f"c{i}", avg_feedback_rating=4.5, months_as_client=18) for i in range(4)]
    result = generate_portfolio_analytics(PortfolioAnalyticsInput(clients=clients))
    assert result.avg_health_score >= 60
    assert len(result.at_risk_clients) == 0
