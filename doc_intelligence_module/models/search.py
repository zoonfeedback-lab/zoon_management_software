import re
import time
import math
from collections import Counter
from typing import Optional


_STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "this",
    "that", "it", "not", "no", "so", "if", "as", "all", "also",
}

_INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    ("FIND_AMOUNT",     ["how much", "total", "amount", "price", "cost", "fee", "pay"]),
    ("FIND_DATE",       ["when", "date", "deadline", "due", "schedule", "timeline"]),
    ("FIND_PARTY",      ["who", "contact", "person", "company", "vendor", "client", "supplier"]),
    ("FIND_CLAUSE",     ["clause", "term", "condition", "policy", "rule", "provision"]),
    ("FIND_ACTION",     ["what", "action", "next step", "todo", "requirement", "must"]),
    ("FIND_SUMMARY",    ["summary", "overview", "about", "describe", "explain"]),
    ("FIND_REFERENCE",  ["reference", "invoice number", "contract id", "order number"]),
]

_REFINEMENT_TEMPLATES = {
    "FIND_AMOUNT":    ["Filter by document type: INVOICE", "Add date range to narrow results", "Search for specific currency"],
    "FIND_DATE":      ["Try searching for a specific milestone", "Include the project name for precision"],
    "FIND_PARTY":     ["Include company domain or email for better results"],
    "FIND_CLAUSE":    ["Specify the clause type (payment, liability, IP)", "Filter by document type: CONTRACT"],
    "FIND_ACTION":    ["Filter to MEETING_NOTES for action items", "Add assignee name to narrow results"],
    "FIND_SUMMARY":   ["Specify document type to get type-specific results"],
    "FIND_REFERENCE": ["Include partial reference number for fuzzy matching"],
    "GENERAL_SEARCH": ["Add document type filter", "Try more specific keywords", "Use quotes for exact phrases"],
}


def _tokenize(text: str) -> list[str]:
    return [w for w in re.findall(r"\b[a-z]{2,}\b", text.lower()) if w not in _STOP_WORDS]


def _tf_idf_scores(query_terms: list[str], documents: list[dict]) -> list[float]:
    """
    Lightweight TF-IDF: compute relevance of each document to the query.
    """
    corpus = [_tokenize(d.get("text", "")) for d in documents]
    N = max(len(corpus), 1)

    # Document frequency
    df: Counter = Counter()
    for doc_tokens in corpus:
        for term in set(doc_tokens):
            df[term] += 1

    scores: list[float] = []
    for doc_tokens in corpus:
        tf = Counter(doc_tokens)
        doc_len = max(len(doc_tokens), 1)
        score = 0.0
        for term in query_terms:
            if term in tf:
                tf_val = tf[term] / doc_len
                idf_val = math.log((N + 1) / (df.get(term, 0) + 1)) + 1
                score += tf_val * idf_val
        scores.append(score)
    return scores


def _extract_snippet(text: str, matched_terms: list[str], max_len: int = 250) -> str:
    if not matched_terms:
        return text[:max_len].strip() + ("..." if len(text) > max_len else "")

    # Find the position of the first matched term
    best_pos = len(text)
    for term in matched_terms:
        idx = text.lower().find(term)
        if idx != -1 and idx < best_pos:
            best_pos = idx

    start = max(0, best_pos - 60)
    end = min(len(text), start + max_len)
    snippet = ("..." if start > 0 else "") + text[start:end].strip() + ("..." if end < len(text) else "")
    return snippet


def _detect_intent(query: str) -> str:
    q = query.lower()
    for intent, keywords in _INTENT_PATTERNS:
        if any(k in q for k in keywords):
            return intent
    return "GENERAL_SEARCH"


def search_documents(
    query: str,
    documents: list[dict],
    top_k: int = 5,
    filter_type: Optional[str] = None,
) -> dict:
    t_start = time.perf_counter()

    # Filter by type
    filtered = documents
    if filter_type:
        filtered = [d for d in documents if d.get("type", "").upper() == filter_type.upper()]

    query_terms = _tokenize(query)
    intent = _detect_intent(query)

    if not filtered or not query_terms:
        return {
            "query": query,
            "total_searched": len(filtered),
            "results": [],
            "query_intent": intent,
            "suggested_refinements": _REFINEMENT_TEMPLATES.get(intent, _REFINEMENT_TEMPLATES["GENERAL_SEARCH"]),
            "search_time_ms": round((time.perf_counter() - t_start) * 1000, 2),
        }

    tfidf_scores = _tf_idf_scores(query_terms, filtered)

    results = []
    for idx, doc in enumerate(filtered):
        raw_score = tfidf_scores[idx]
        if raw_score <= 0:
            continue

        doc_tokens = _tokenize(doc.get("text", ""))
        matched_terms = [t for t in query_terms if t in doc_tokens]

        # Exact phrase bonus
        match_type = "KEYWORD"
        if query.lower() in doc.get("text", "").lower():
            raw_score *= 1.5
            match_type = "EXACT_PHRASE"
        elif len(matched_terms) == len(query_terms):
            raw_score *= 1.2
            match_type = "FULL_TERM"

        snippet = _extract_snippet(doc.get("text", ""), matched_terms)

        results.append({
            "doc_id": str(doc.get("id", idx)),
            "title": doc.get("title", f"Document {idx+1}"),
            "document_type": doc.get("type", "UNKNOWN"),
            "snippet": snippet,
            "relevance_score": raw_score,
            "match_type": match_type,
            "matched_terms": matched_terms,
        })

    # Sort and normalise scores 0–1
    results.sort(key=lambda r: r["relevance_score"], reverse=True)
    if results:
        max_score = results[0]["relevance_score"]
        for r in results:
            r["relevance_score"] = round(r["relevance_score"] / max_score, 4)

    results = results[:top_k]

    elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)

    return {
        "query": query,
        "total_searched": len(filtered),
        "results": results,
        "query_intent": intent,
        "suggested_refinements": _REFINEMENT_TEMPLATES.get(intent, _REFINEMENT_TEMPLATES["GENERAL_SEARCH"]),
        "search_time_ms": elapsed_ms,
    }
