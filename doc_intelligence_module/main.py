import os
from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from doc_intelligence_module.schemas import (
    ClassifyRequest, ClassifyResponse,
    ExtractRequest, ExtractResponse,
    SummarizeRequest, SummarizeResponse,
    SearchRequest, SearchResponse,
)
from doc_intelligence_module.models.classifier import classify_document
from doc_intelligence_module.models.extractor import extract_information
from doc_intelligence_module.models.summarizer import summarize
from doc_intelligence_module.models.search import search_documents

load_dotenv()

API_KEY = os.getenv("DOC_INTELLIGENCE_API_KEY", "dev-secret-change-in-prod")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

app = FastAPI(
    title="AI Document Intelligence Module",
    description=(
        "Standalone AI microservice for document classification, information extraction, "
        "summarisation, and intelligent natural language search. Part of the Zoon AI platform."
    ),
    version="1.0.0",
    contact={"name": "Faiq Samad", "email": "faiqsamad134@gmail.com"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(key: str = Security(api_key_header)):
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    return key


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "module": "AI Document Intelligence", "version": "1.0.0", "port": 8003}


@app.post("/doc/classify", response_model=ClassifyResponse, tags=["Document Intelligence"])
def classify(req: ClassifyRequest, _: str = Depends(verify_api_key)):
    """
    Classify a document by type (INVOICE, CONTRACT, REPORT, PROPOSAL, etc.).
    Returns confidence score, language, estimated pages, detected sections, and processing flags.
    """
    result = classify_document(req.text, req.filename)
    return ClassifyResponse(**result)


@app.post("/doc/extract", response_model=ExtractResponse, tags=["Document Intelligence"])
def extract(req: ExtractRequest, _: str = Depends(verify_api_key)):
    """
    Extract key information: emails, phones, URLs, dates, monetary values,
    parties, key clauses, and action items from any document.
    """
    result = extract_information(req.text, req.document_type)
    return ExtractResponse(**result)


@app.post("/doc/summarize", response_model=SummarizeResponse, tags=["Document Intelligence"])
def summarize_doc(req: SummarizeRequest, _: str = Depends(verify_api_key)):
    """
    Generate an executive summary, key points, topics, sentiment analysis,
    urgency level, and recommended actions for any document.
    Supports short / medium / long summary lengths.
    """
    result = summarize(req.text, req.document_type, req.summary_length)
    return SummarizeResponse(**result)


@app.post("/doc/search", response_model=SearchResponse, tags=["Document Intelligence"])
def search(req: SearchRequest, _: str = Depends(verify_api_key)):
    """
    Intelligent natural language search across a collection of documents.
    Uses TF-IDF scoring with exact-phrase bonuses. Returns ranked snippets,
    matched terms, query intent detection, and suggested refinements.
    """
    result = search_documents(req.query, req.documents, req.top_k, req.filter_type)
    return SearchResponse(**result)
