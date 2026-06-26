# Client Intelligence & Retention System (CI&RS) — Integration Guide

## Overview

Standalone Python/FastAPI microservice running on port **8001**.
The NestJS backend calls it over HTTP — no changes to the existing Prisma schema required.

## Quick Start

```bash
cd ci_rs_module
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # edit CI_RS_API_KEY
uvicorn ci_rs_module.main:app --reload --port 8001
```

Interactive docs: **http://localhost:8001/docs**

## Auth

All `/ci-rs/*` endpoints require:
```
X-API-Key: <value of CI_RS_API_KEY>
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (no auth) |
| POST | `/ci-rs/health-score` | Client health score (0–100) + tier + strengths/concerns |
| POST | `/ci-rs/churn-prediction` | Churn risk score + probability + risk drivers |
| POST | `/ci-rs/usage-analytics` | Engagement score + utilization metrics |
| POST | `/ci-rs/retention-recommendations` | Prioritised retention action plan |
| POST | `/ci-rs/portfolio-analytics` | Fleet-level view across all clients |

## NestJS Integration Pattern

```typescript
// src/client-intelligence/client-intelligence.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ClientIntelligenceService {
  private readonly baseUrl = process.env.CI_RS_URL ?? 'http://localhost:8001';
  private readonly apiKey = process.env.CI_RS_API_KEY ?? 'dev-secret-change-in-prod';

  constructor(private readonly http: HttpService) {}

  private headers() {
    return { 'X-API-Key': this.apiKey };
  }

  async getHealthScore(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/ci-rs/health-score`, payload, { headers: this.headers() }),
    );
    return data;
  }

  async predictChurn(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/ci-rs/churn-prediction`, payload, { headers: this.headers() }),
    );
    return data;
  }

  async getUsageAnalytics(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/ci-rs/usage-analytics`, payload, { headers: this.headers() }),
    );
    return data;
  }

  async getRetentionRecommendations(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/ci-rs/retention-recommendations`, payload, { headers: this.headers() }),
    );
    return data;
  }

  async getPortfolioAnalytics(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/ci-rs/portfolio-analytics`, payload, { headers: this.headers() }),
    );
    return data;
  }
}
```

Add to `.env`:
```
CI_RS_URL=http://localhost:8001
CI_RS_API_KEY=<shared secret>
```

## Data Mapping (Prisma → CI&RS)

### Health Score & Churn Endpoints

| CI&RS field | Prisma query |
|---|---|
| `total_projects` | `COUNT(projects WHERE clientId)` |
| `active_projects` | `COUNT(projects WHERE clientId AND status = ACTIVE)` |
| `completed_projects` | `COUNT(projects WHERE clientId AND status = COMPLETED)` |
| `avg_feedback_rating` | `AVG(clientFeedbacks.rating WHERE clientId)` |
| `would_recommend_count` | `COUNT(clientFeedbacks WHERE wouldRecommend = true AND clientId)` |
| `total_feedbacks` | `COUNT(clientFeedbacks WHERE clientId)` |
| `open_support_requests` | `COUNT(supportRequests WHERE clientId AND status = PENDING OR IN_PROGRESS)` |
| `resolved_support_requests` | `COUNT(supportRequests WHERE clientId AND status = RESOLVED)` |
| `rejected_support_requests` | `COUNT(supportRequests WHERE clientId AND status = REJECTED)` |
| `open_revision_requests` | `COUNT(revisionRequests WHERE clientId AND status = PENDING)` |
| `pending_approvals` | `COUNT(projectApprovals WHERE clientId AND status = PENDING)` |
| `unread_notifications` | `COUNT(clientNotifications WHERE clientId AND isRead = false)` |
| `months_as_client` | `DATEDIFF(NOW(), clients.createdAt) / 30` |
| `is_active` | `clients.isActive` |

### Usage Analytics Additional Fields

| CI&RS field | Prisma query |
|---|---|
| `total_tasks_across_projects` | `COUNT(tasks WHERE projectId IN client's projects)` |
| `completed_tasks` | `COUNT(tasks WHERE status = DONE AND projectId IN client's projects)` |
| `total_feedbacks_submitted` | Same as `total_feedbacks` above |
| `total_revision_requests` | `COUNT(revisionRequests WHERE clientId)` |
| `total_approvals_given` | `COUNT(projectApprovals WHERE clientId AND status = APPROVED)` |

### Retention Endpoint

Pass the output scores from health-score, churn-prediction, and usage-analytics endpoints directly —
no additional Prisma queries needed.

## Running Tests

```bash
source venv/bin/activate
python -m pytest ci_rs_module/tests/ -v
```

## Architecture Notes

- All models are **heuristic/rule-based** — calibrated using CRM and client success research.
- Swap in trained ML models (e.g. gradient boosting for churn) by replacing logic in `models/*.py`.
- The service runs on port **8001** to avoid conflict with the Workforce Intelligence Module (port 8000).
- All scores are 0–100. Churn probability is additionally expressed as 0–1 float.
