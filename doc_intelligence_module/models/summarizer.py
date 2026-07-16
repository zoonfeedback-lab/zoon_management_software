import re
from typing import Optional
from collections import Counter


_STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "this", "that", "these", "those",
    "it", "its", "we", "our", "you", "your", "he", "she", "they", "their",
    "i", "me", "my", "us", "not", "no", "so", "if", "as", "up", "about",
    "into", "than", "then", "also", "all", "both", "each", "more", "most",
}

_POSITIVE_WORDS = {
    "excellent", "great", "successful", "achieved", "improved", "increase",
    "growth", "positive", "benefit", "advantage", "opportunity", "profit",
    "gain", "effective", "efficient", "innovative", "strong", "best",
}

_NEGATIVE_WORDS = {
    "risk", "issue", "problem", "concern", "fail", "loss", "decline",
    "decrease", "challenge", "difficult", "delay", "error", "breach",
    "penalty", "dispute", "urgent", "critical", "overdue", "violation",
}

_URGENCY_MARKERS = {
    "high":   ["immediately", "urgent", "asap", "critical", "overdue", "must", "require"],
    "medium": ["soon", "priority", "important", "deadline", "by end of", "action required"],
    "low":    [],
}


def _tokenize_sentences(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if len(s.split()) >= 4]


def _score_sentence(sentence: str, keyword_weights: dict[str, float]) -> float:
    words = re.findall(r"\b[a-z]+\b", sentence.lower())
    score = sum(keyword_weights.get(w, 0) for w in words)
    # Bonus for sentence containing numbers / money
    if re.search(r"\d+", sentence):
        score += 0.15
    # Penalty for very long sentences
    if len(words) > 50:
        score -= 0.1
    return score


def _extract_topics(text: str, n: int = 6) -> list[str]:
    words = re.findall(r"\b[a-z]{4,}\b", text.lower())
    filtered = [w for w in words if w not in _STOP_WORDS]
    freq = Counter(filtered)
    # Also look for bigrams (noun phrases)
    bigrams_raw = re.findall(r"\b([A-Z][a-z]+ [A-Z][a-z]+)\b", text)
    bigrams = Counter(bigrams_raw)
    topics = [phrase for phrase, _ in bigrams.most_common(3)]
    topics += [word.title() for word, _ in freq.most_common(15) if word not in {t.lower() for t in topics}]
    return list(dict.fromkeys(topics))[:n]


def summarize(text: str, document_type: Optional[str] = None, summary_length: str = "medium") -> dict:
    sentences = _tokenize_sentences(text)
    word_count_original = len(text.split())

    # Term frequency weights
    all_words = re.findall(r"\b[a-z]{3,}\b", text.lower())
    filtered = [w for w in all_words if w not in _STOP_WORDS]
    freq = Counter(filtered)
    total = max(len(filtered), 1)
    keyword_weights = {w: c / total for w, c in freq.items()}

    # Score sentences
    scored = [(s, _score_sentence(s, keyword_weights)) for s in sentences]
    scored.sort(key=lambda x: x[1], reverse=True)

    # How many sentences for summary
    n_sentences = {"short": 2, "medium": 4, "long": 7}.get(summary_length, 4)
    top_sentences = [s for s, _ in scored[:n_sentences]]
    # Re-order by original position
    top_set = set(top_sentences)
    summary_sentences = [s for s in sentences if s in top_set]
    executive_summary = " ".join(summary_sentences)

    # Key points: next best sentences after top
    key_point_candidates = [s for s, _ in scored[n_sentences: n_sentences + 6]]
    key_points = key_point_candidates[:5]

    # Topics
    topics = _extract_topics(text)

    # Sentiment
    text_lower = text.lower()
    pos = sum(1 for w in _POSITIVE_WORDS if w in text_lower)
    neg = sum(1 for w in _NEGATIVE_WORDS if w in text_lower)
    if pos > neg * 1.5:    sentiment = "POSITIVE"
    elif neg > pos * 1.5:  sentiment = "NEGATIVE"
    else:                  sentiment = "NEUTRAL"

    # Urgency
    urgency = "LOW"
    for level, markers in _URGENCY_MARKERS.items():
        if any(m in text_lower for m in markers):
            urgency = level.upper()
            break

    # Recommended actions (action-oriented sentences from extraction patterns)
    action_patterns = [
        r"\b(please\s+\w[\w\s]{5,40})\b",
        r"\b(action required[:\s]+[\w\s]{5,50})\b",
        r"\b(must\s+\w[\w\s]{5,40})\b",
        r"\b(kindly\s+\w[\w\s]{5,40})\b",
    ]
    recommended_actions: list[str] = []
    for pattern in action_patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            action = m.group(1).strip()
            if action not in recommended_actions:
                recommended_actions.append(action)
    recommended_actions = recommended_actions[:4]

    word_count_summary = len(executive_summary.split())
    compression_ratio = round(word_count_summary / max(word_count_original, 1), 3)

    return {
        "executive_summary": executive_summary or text[:300] + "...",
        "key_points": key_points,
        "topics": topics,
        "sentiment": sentiment,
        "urgency_level": urgency,
        "recommended_actions": recommended_actions,
        "word_count_original": word_count_original,
        "word_count_summary": word_count_summary,
        "compression_ratio": compression_ratio,
    }
