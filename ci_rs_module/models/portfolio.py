"""
Portfolio Analytics

Fleet-level view across all clients. Surfaces aggregate health,
top and at-risk accounts, and management-level action items.
"""

from typing import List
from ..schemas import ClientHealthInput, PortfolioAnalyticsInput, PortfolioAnalyticsResult
from .health_score import score_client_health


def generate_portfolio_analytics(data: PortfolioAnalyticsInput) -> PortfolioAnalyticsResult:
    clients = data.clients
    n = len(clients)

    if n == 0:
        return PortfolioAnalyticsResult(
            total_clients=0,
            active_clients=0,
            avg_health_score=0,
            healthy_clients=[],
            at_risk_clients=[],
            portfolio_health_score=0,
            insights=["No client data provided"],
            action_items=["Add client records to enable portfolio analytics"],
        )

    results = [score_client_health(c) for c in clients]
    score_map = {r.client_id: r.health_score for r in results}

    active_clients = sum(1 for c in clients if c.is_active)
    avg_health = round(sum(score_map.values()) / n, 2)

    healthy = [r.client_id for r in results if r.health_score >= 70]
    at_risk = [r.client_id for r in results if r.health_score < 50]
    critical = [r.client_id for r in results if r.health_score < 35]

    # Portfolio health = weighted avg, penalised by critical count
    portfolio_health = avg_health - (len(critical) / n) * 15
    portfolio_health = round(min(max(portfolio_health, 0), 100), 2)

    insights: List[str] = []
    action_items: List[str] = []

    insights.append(f"Portfolio of {n} clients with an average health score of {avg_health}/100")

    if healthy:
        insights.append(f"{len(healthy)} client(s) in good/excellent health — potential advocates and upsell targets")
    if at_risk:
        insights.append(f"{len(at_risk)} client(s) with health below 50 — require active retention effort")
        action_items.append(f"Initiate retention outreach for {len(at_risk)} at-risk client(s) within 7 days")
    if critical:
        insights.append(f"{len(critical)} client(s) in critical condition — immediate escalation required")
        action_items.append(f"Escalate {len(critical)} critical client(s) to senior account management immediately")

    inactive = n - active_clients
    if inactive > 0:
        insights.append(f"{inactive} client(s) marked inactive — review for reactivation potential")
        action_items.append(f"Review {inactive} inactive client account(s) for reactivation campaigns")

    if portfolio_health >= 75:
        insights.append("Overall portfolio health is strong — focus on growth and advocacy programs")
    elif portfolio_health < 50:
        insights.append("Portfolio health is below acceptable threshold — leadership review recommended")
        action_items.append("Schedule a portfolio health review with account management leadership")

    if not action_items:
        action_items = ["No urgent actions — continue proactive relationship management for all clients"]

    return PortfolioAnalyticsResult(
        total_clients=n,
        active_clients=active_clients,
        avg_health_score=avg_health,
        healthy_clients=healthy,
        at_risk_clients=at_risk,
        portfolio_health_score=portfolio_health,
        insights=insights,
        action_items=action_items,
    )
