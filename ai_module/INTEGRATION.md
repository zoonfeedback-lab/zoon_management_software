# Workforce Intelligence Module — Integration Guide

## Overview

This is a Python/FastAPI microservice. The NestJS backend calls it over HTTP.
It runs independently on port **8000** (configurable).

## Quick Start

```bash
cd ai_module
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit AI_MODULE_API_KEY
uvicorn ai_module.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

## Auth

All `/intelligence/*` endpoints require:
```
X-API-Key: <value of AI_MODULE_API_KEY>
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/intelligence/performance-prediction` | Employee performance score (0–100) |
| POST | `/intelligence/attrition-prediction` | Attrition risk score + retention actions |
| POST | `/intelligence/smart-task-assignment` | Best employee for a task |
| POST | `/intelligence/project-risk` | Project delivery risk + completion probability |
| POST | `/intelligence/analytics/workforce` | Fleet-level workforce insights |

## NestJS Integration Pattern

Create an `IntelligenceService` in NestJS that wraps HTTP calls:

```typescript
// src/intelligence/intelligence.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IntelligenceService {
  private readonly baseUrl = process.env.AI_MODULE_URL ?? 'http://localhost:8000';
  private readonly apiKey = process.env.AI_MODULE_API_KEY ?? 'dev-secret-change-in-prod';

  constructor(private readonly http: HttpService) {}

  private headers() {
    return { 'X-API-Key': this.apiKey };
  }

  async predictPerformance(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/intelligence/performance-prediction`, payload, {
        headers: this.headers(),
      }),
    );
    return data;
  }

  async predictAttrition(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/intelligence/attrition-prediction`, payload, {
        headers: this.headers(),
      }),
    );
    return data;
  }

  async smartTaskAssignment(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/intelligence/smart-task-assignment`, payload, {
        headers: this.headers(),
      }),
    );
    return data;
  }

  async predictProjectRisk(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/intelligence/project-risk`, payload, {
        headers: this.headers(),
      }),
    );
    return data;
  }

  async workforceAnalytics(payload: object) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/intelligence/analytics/workforce`, payload, {
        headers: this.headers(),
      }),
    );
    return data;
  }
}
```

Add to `.env`:
```
AI_MODULE_URL=http://localhost:8000
AI_MODULE_API_KEY=<shared secret>
```

## Data Mapping (Prisma → AI Module)

The payload fields map directly to existing Prisma schema data:

| AI Module field | Prisma source |
|-----------------|---------------|
| `total_tasks_assigned` | `COUNT(tasks WHERE assignedToId = userId)` |
| `tasks_completed` | `COUNT(tasks WHERE status = DONE)` |
| `tasks_overdue` | `COUNT(tasks WHERE dueDate < NOW() AND status != DONE)` |
| `revisions_approved` | `COUNT(taskRevisions WHERE status = APPROVED AND createdById = userId)` |
| `revision_requests_received` | `COUNT(taskRevisions WHERE task.assignedToId = userId)` |
| `client_feedback_avg_rating` | `AVG(clientFeedbacks.rating) for user's projects` |
| `projects_contributed` | `COUNT(DISTINCT projectMembers WHERE userId)` |
| `availability_status` | `users.availabilityStatus` |
| `experience_level` | `users.experienceLevel` |
| `skills` | `users.skills` |

## Running Tests

```bash
python -m pytest ai_module/tests/ -v
```

## Architecture Notes

- Models are currently **heuristic/rule-based** — calibrated against management research.
- Swap in scikit-learn models by replacing the logic inside each `models/*.py` file; the API contracts (schemas) remain unchanged.
- All scores are 0–100 for consistency; percentages are 0–1 floats.
