from pydantic import BaseModel, Field
from typing import Optional


# ── /doc/classify ────────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Raw document text content")
    filename: Optional[str] = Field(None, description="Original filename (helps heuristics)")

class ClassifyResponse(BaseModel):
    document_type: str
    confidence: float
    sub_type: Optional[str]
    language: str
    estimated_pages: int
    detected_sections: list[str]
    processing_flags: list[str]


# ── /doc/extract ─────────────────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=10)
    document_type: Optional[str] = Field(None, description="If known, speeds up extraction")

class ExtractedEntity(BaseModel):
    value: str
    entity_type: str
    confidence: float
    context: Optional[str]

class ExtractResponse(BaseModel):
    entities: list[ExtractedEntity]
    key_dates: list[dict]
    monetary_values: list[dict]
    parties: list[str]
    key_clauses: list[str]
    action_items: list[str]
    document_metadata: dict


# ── /doc/summarize ───────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=50)
    document_type: Optional[str] = None
    summary_length: str = Field("medium", pattern="^(short|medium|long)$")

class SummarizeResponse(BaseModel):
    executive_summary: str
    key_points: list[str]
    topics: list[str]
    sentiment: str
    urgency_level: str
    recommended_actions: list[str]
    word_count_original: int
    word_count_summary: int
    compression_ratio: float


# ── /doc/search ──────────────────────────────────────────────────────────────

class DocumentSnippet(BaseModel):
    doc_id: str
    title: str
    document_type: str
    snippet: str
    relevance_score: float
    match_type: str
    matched_terms: list[str]

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language search query")
    documents: list[dict] = Field(..., description="List of {id, title, text, type} dicts")
    top_k: int = Field(5, ge=1, le=20)
    filter_type: Optional[str] = Field(None, description="Filter results by document type")

class SearchResponse(BaseModel):
    query: str
    total_searched: int
    results: list[DocumentSnippet]
    query_intent: str
    suggested_refinements: list[str]
    search_time_ms: float
