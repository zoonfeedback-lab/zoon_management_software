# Business Intelligence & Forecasting Module — Integration Guide

## Overview

Standalone Python/FastAPI microservice running on port **8002**.
Provides four BI/forecasting endpoints for the NestJS backend.

## Quick Start

```bash
cd bi_forecasting_module
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn bi_forecasting_module.main:app --reload --port 8002
```

Swagger docs: **http://localhost:8002/docs**

## Auth

All `/bi/*` endpoints require:
```
X-API-Key: <value of BI_FORECASTING_API_KEY>
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/bi/project-completion` | Completion % + predicted finish date + risk flags |
| POST | `/bi/revenue-forecast` | Monthly revenue forecast with trend analysis |
| POST | `/bi/resource-utilization` | Team capacity forecast + hiring signal |
| POST | `/bi/department-performance` | Department ranking + scorecard + strategic insights |

## NestJS Integration

```typescript
// src/business-intelligence/bi.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BusinessIntelligenceService {
  private readonly baseUrl = process.env.BI_MODULE_URL ?? 'http://localhost:8002';
  private readonly apiKey = process.env.BI_FORECASTING_API_KEY ?? 'dev-secret-change-in-prod';

  constructor(private readonly http: HttpService) {}

  private headers() { return { 'X-API-Key': this.apiKey }; }

  async projectCompletion(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/bi/project-completion`, payload, { headers: this.headers() })
    );
    return data;
  }

  async revenueForecast(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/bi/revenue-forecast`, payload, { headers: this.headers() })
    );
    return data;
  }

  async resourceUtilization(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/bi/resource-utilization`, payload, { headers: this.headers() })
    );
    return data;
  }

  async departmentPerformance(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/bi/department-performance`, payload, { headers: this.headers() })
    );
    return data;
  }
}
```

Add to `.env`:
```
BI_MODULE_URL=http://localhost:8002
BI_FORECASTING_API_KEY=<shared secret>
```

## Data Mapping (Prisma → BI Module)

### Project Completion

| BI field | Prisma source |
|---|---|
| `total_tasks` | `COUNT(tasks WHERE projectId)` |
| `completed_tasks` | `COUNT(tasks WHERE projectId AND status = DONE)` |
| `in_progress_tasks` | `COUNT(tasks WHERE projectId AND status = IN_PROGRESS)` |
| `overdue_tasks` | `COUNT(tasks WHERE projectId AND dueDate < NOW() AND status != DONE)` |
| `days_since_start` | `DATEDIFF(NOW(), projects.startDate)` |
| `planned_duration_days` | `DATEDIFF(projects.deadline, projects.startDate)` |
| `days_until_deadline` | `DATEDIFF(projects.deadline, NOW())` |
| `team_size` | `COUNT(projectMembers WHERE projectId)` |
| `open_revision_requests` | `COUNT(revisionRequests WHERE projectId AND status = PENDING)` |
| `pending_approvals` | `COUNT(projectApprovals WHERE projectId AND status = PENDING)` |

### Revenue Forecast

| BI field | Prisma source |
|---|---|
| `month` | Group by `YYYY-MM` from `projects.createdAt` |
| `completed_projects` | `COUNT(projects WHERE status = COMPLETED GROUP BY month)` |
| `active_projects` | `COUNT(projects WHERE status = ACTIVE GROUP BY month)` |
| `avg_client_rating` | `AVG(clientFeedbacks.rating GROUP BY month)` |
| `new_clients` | `COUNT(clients WHERE createdAt in month)` |
| `revision_requests` | `COUNT(revisionRequests GROUP BY month)` |

### Resource Utilization

| BI field | Prisma source |
|---|---|
| `current_tasks` | `COUNT(tasks WHERE assignedToId AND status != DONE)` |
| `completed_tasks_last_30d` | `COUNT(tasks WHERE assignedToId AND status = DONE AND updatedAt > 30 days ago)` |
| `availability_status` | `users.availabilityStatus` |
| `skills` | `users.skills` |
| `performance_score` | Output from Workforce Intelligence Module |

### Department Performance

| BI field | Prisma source |
|---|---|
| `headcount` | `COUNT(users WHERE department)` |
| `total_tasks_assigned` | `COUNT(tasks WHERE assignedTo.department)` |
| `tasks_completed` | `COUNT(tasks WHERE status = DONE AND assignedTo.department)` |
| `tasks_overdue` | `COUNT(tasks WHERE dueDate < NOW() AND status != DONE AND assignedTo.department)` |
| `avg_client_rating` | `AVG(clientFeedbacks.rating) for projects involving department` |
| `total_revision_requests` | `COUNT(taskRevisions WHERE task.assignedTo.department)` |
| `attrition_risk_count` | Output from Workforce Intelligence Module attrition endpoint |

## Port Reference

| Module | Port |
|---|---|
| Workforce Intelligence | 8000 |
| Client Intelligence & Retention (CI&RS) | 8001 |
| Business Intelligence & Forecasting | 8002 |

## Running Tests

```bash
source venv/bin/activate
python -m pytest bi_forecasting_module/tests/ -v
```
