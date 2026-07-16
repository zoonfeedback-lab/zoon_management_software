# AI Document Intelligence Module — Integration Guide

## Overview

Standalone Python/FastAPI microservice running on port **8003**.
Provides four document intelligence endpoints for the NestJS backend.

## Quick Start

```bash
cd doc_intelligence_module
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn doc_intelligence_module.main:app --reload --port 8003
```

Swagger docs: **http://localhost:8003/docs**

## Auth

All `/doc/*` endpoints require:
```
X-API-Key: <value of DOC_INTELLIGENCE_API_KEY>
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/doc/classify` | Detect document type, language, flags |
| POST | `/doc/extract` | Extract entities, dates, amounts, clauses |
| POST | `/doc/summarize` | Executive summary, topics, sentiment, urgency |
| POST | `/doc/search` | NL search across a document corpus |

## Document Types Supported

`INVOICE` · `CONTRACT` · `REPORT` · `PROPOSAL` · `RESUME` · `EMAIL` · `MEETING_NOTES` · `POLICY` · `TECHNICAL_SPEC` · `GENERAL`

## NestJS Integration

```typescript
// src/document-intelligence/doc-intelligence.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DocumentIntelligenceService {
  private readonly baseUrl = process.env.DOC_MODULE_URL ?? 'http://localhost:8003';
  private readonly apiKey = process.env.DOC_INTELLIGENCE_API_KEY ?? 'dev-secret-change-in-prod';

  constructor(private readonly http: HttpService) {}

  private headers() { return { 'X-API-Key': this.apiKey }; }

  async classifyDocument(text: string, filename?: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/doc/classify`, { text, filename }, { headers: this.headers() })
    );
    return data;
  }

  async extractInformation(text: string, documentType?: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/doc/extract`, { text, document_type: documentType }, { headers: this.headers() })
    );
    return data;
  }

  async summarizeDocument(text: string, summaryLength: 'short' | 'medium' | 'long' = 'medium') {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/doc/summarize`, { text, summary_length: summaryLength }, { headers: this.headers() })
    );
    return data;
  }

  async searchDocuments(query: string, documents: object[], topK = 5) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/doc/search`, { query, documents, top_k: topK }, { headers: this.headers() })
    );
    return data;
  }
}
```

Add to `.env`:
```
DOC_MODULE_URL=http://localhost:8003
DOC_INTELLIGENCE_API_KEY=<shared secret>
```

## Typical Workflow

```
Upload file → Extract text (Prisma/S3/blob) → POST /doc/classify
                                             → POST /doc/extract
                                             → POST /doc/summarize
                                             → Store in DB
                                             → Index for POST /doc/search
```

## Data Mapping (Prisma → Doc Module)

### /doc/classify

| Field | Source |
|-------|--------|
| `text` | Extracted text from uploaded document (PDF parser / DOCX reader) |
| `filename` | `documents.filename` in Prisma |

### /doc/extract

| Field | Source |
|-------|--------|
| `text` | Extracted document text |
| `document_type` | Output of `/doc/classify` → `document_type` |

### /doc/summarize

| Field | Source |
|-------|--------|
| `text` | Extracted document text |
| `summary_length` | User preference or default `"medium"` |

### /doc/search

| Field | Source |
|-------|--------|
| `query` | User's natural language search input |
| `documents` | Array of `{ id, title, text, type }` from `documents` table |
| `top_k` | Configurable (default 5) |
| `filter_type` | Optional document type filter from UI |

## Port Reference

| Module | Port |
|--------|------|
| Workforce Intelligence | 8000 |
| Client Intelligence & Retention (CI&RS) | 8001 |
| Business Intelligence & Forecasting | 8002 |
| AI Document Intelligence | 8003 |

## Running Tests

```bash
source venv/bin/activate
python -m pytest doc_intelligence_module/tests/ -v
```
