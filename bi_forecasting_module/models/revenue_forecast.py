"""
Revenue Forecasting Model

Uses historical monthly activity data to forecast future revenue using a
weighted moving average with trend adjustment.

Method:
  1. Derive implied revenue from completed projects × avg_revenue_per_project
     (uses actual revenue if provided)
  2. Calculate month-over-month growth rates
  3. Apply weighted moving average (recent months weighted higher)
  4. Project forward N months with ±15% confidence interval
  5. Adjust for client churn/growth signals and quality trends

Trend classification:
  GROWING  → avg growth rate > +3%
  STABLE   → avg growth rate between -3% and +3%
  DECLINING → avg growth rate < -3%
"""

from typing import List
from ..schemas import (
    RevenueForecastInput, RevenueForecastResult,
    MonthlyRevenue, MonthlyForecast
)
from datetime import datetime, timedelta
import statistics


def _next_month(month_str: str, offset: int) -> str:
    year, month = int(month_str[:4]), int(month_str[5:7])
    month += offset
    while month > 12:
        month -= 12
        year += 1
    return f"{year}-{month:02d}"


def _implied_revenue(m: MonthlyRevenue, avg_per_project: float) -> float:
    if m.revenue is not None:
        return m.revenue
    return m.completed_projects * avg_per_project


def forecast_revenue(data: RevenueForecastInput) -> RevenueForecastResult:
    history = data.historical_months
    avg_rpp = data.avg_revenue_per_project
    key_drivers = []
    risks = []

    # ── Build revenue series ──────────────────────────────────────────────────
    revenues = [_implied_revenue(m, avg_rpp) for m in history]
    project_counts = [m.completed_projects for m in history]

    # ── Growth rates ──────────────────────────────────────────────────────────
    growth_rates = []
    for i in range(1, len(revenues)):
        if revenues[i - 1] > 0:
            rate = (revenues[i] - revenues[i - 1]) / revenues[i - 1]
            growth_rates.append(rate)
        else:
            growth_rates.append(0.0)

    # Weighted moving average — recent months carry more weight
    n = len(revenues)
    weights = list(range(1, n + 1))
    weighted_revenue = sum(r * w for r, w in zip(revenues, weights)) / sum(weights)

    if growth_rates:
        # Weight recent growth rates more
        gw = list(range(1, len(growth_rates) + 1))
        avg_growth = sum(g * w for g, w in zip(growth_rates, gw)) / sum(gw)
    else:
        avg_growth = 0.0

    # ── Trend signals from history ────────────────────────────────────────────
    total_new = sum(m.new_clients for m in history)
    total_churned = sum(m.churned_clients for m in history)
    avg_rating = None
    rated = [m.avg_client_rating for m in history if m.avg_client_rating is not None]
    if rated:
        avg_rating = statistics.mean(rated)

    if total_new > total_churned:
        key_drivers.append(f"Net positive client growth (+{total_new - total_churned} clients) supporting revenue expansion")
    elif total_churned > total_new:
        risks.append(f"Net client churn ({total_churned - total_new} more lost than gained) — revenue headwind")

    if avg_rating is not None and avg_rating >= 4.0:
        key_drivers.append(f"Strong average client satisfaction ({avg_rating:.1f}/5) reduces churn risk")
    elif avg_rating is not None and avg_rating < 3.0:
        risks.append(f"Low client satisfaction ({avg_rating:.1f}/5) — retention and renewal risk")

    total_revisions = sum(m.revision_requests for m in history)
    if total_revisions > len(history) * 3:
        risks.append("High revision request volume — indicates delivery quality issues affecting client satisfaction")

    if avg_growth > 0.05:
        key_drivers.append(f"Strong momentum — average monthly growth rate of {avg_growth:.1%}")
    elif avg_growth < -0.05:
        risks.append(f"Declining trend — average monthly contraction of {abs(avg_growth):.1%}")

    # ── Trend classification ──────────────────────────────────────────────────
    if avg_growth > 0.03:
        trend = "GROWING"
    elif avg_growth < -0.03:
        trend = "DECLINING"
    else:
        trend = "STABLE"

    # ── Generate forecast ─────────────────────────────────────────────────────
    last_month = history[-1].month
    last_revenue = revenues[-1]
    last_projects = project_counts[-1]

    forecast: List[MonthlyForecast] = []
    cumulative = 0.0

    for i in range(1, data.forecast_months + 1):
        month = _next_month(last_month, i)
        # Apply damped growth (growth dampens slightly each month into the future)
        damped_growth = avg_growth * (0.9 ** (i - 1))
        predicted = last_revenue * ((1 + damped_growth) ** i)
        lower = predicted * 0.85
        upper = predicted * 1.15
        predicted_proj = max(round(last_projects * ((1 + damped_growth) ** i)), 0)
        cumulative += predicted

        forecast.append(MonthlyForecast(
            month=month,
            predicted_revenue=round(predicted, 2),
            lower_bound=round(lower, 2),
            upper_bound=round(upper, 2),
            predicted_projects=predicted_proj,
            growth_rate=round(damped_growth, 4),
        ))

    if not key_drivers:
        key_drivers = ["Stable project throughput maintaining revenue baseline"]
    if not risks:
        risks = ["No significant revenue risks identified in historical data"]

    return RevenueForecastResult(
        forecast=forecast,
        total_forecast_revenue=round(cumulative, 2),
        avg_monthly_growth_rate=round(avg_growth, 4),
        trend=trend,
        key_drivers=key_drivers,
        risks=risks,
    )
