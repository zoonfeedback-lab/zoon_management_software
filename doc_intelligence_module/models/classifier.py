import re
from typing import Optional


# ── Type signature patterns ───────────────────────────────────────────────────

_TYPE_PATTERNS: list[tuple[str, str, list[str]]] = [
    ("INVOICE", "BILLING", [
        r"\binvoice\b", r"\binv[- ]?\d+\b", r"\bdue date\b", r"\btotal amount\b",
        r"\bbill to\b", r"\bpayment terms\b", r"\bsubtotal\b", r"\btax\b",
        r"\bamount due\b", r"\bpurchase order\b",
    ]),
    ("CONTRACT", "LEGAL", [
        r"\bagreement\b", r"\bterms and conditions\b", r"\bparty\b", r"\bparties\b",
        r"\bhereby agree\b", r"\bindemnif\w+\b", r"\bliabilit\w+\b", r"\bjurisdiction\b",
        r"\bgoverning law\b", r"\btermination\b", r"\bconfidential\w*\b",
        r"\bwarrant\w+\b", r"\bobligation\b",
    ]),
    ("REPORT", "ANALYTICAL", [
        r"\bexecutive summary\b", r"\bfindings\b", r"\brecommendation\b",
        r"\banalysis\b", r"\bconclusion\b", r"\bfigure \d+\b", r"\btable \d+\b",
        r"\bappendix\b", r"\bmethodology\b", r"\bresearch\b",
    ]),
    ("PROPOSAL", "BUSINESS", [
        r"\bproposal\b", r"\bscope of work\b", r"\bdeliverable\b",
        r"\btimeline\b", r"\bbudget\b", r"\bproject plan\b", r"\bobjective\b",
        r"\bbenefits\b", r"\broi\b", r"\breturn on investment\b",
    ]),
    ("RESUME", "HR", [
        r"\bwork experience\b", r"\bskills\b", r"\beducation\b",
        r"\bcertification\b", r"\breferences\b", r"\bsummary\b",
        r"\bprofessional profile\b", r"\bcareer objective\b",
    ]),
    ("EMAIL", "COMMUNICATION", [
        r"\bfrom:\b", r"\bto:\b", r"\bsubject:\b", r"\bcc:\b", r"\bregards\b",
        r"\bdear\b", r"\bsincerely\b", r"\bplease find attached\b",
    ]),
    ("MEETING_NOTES", "COMMUNICATION", [
        r"\bmeeting minutes\b", r"\battendees\b", r"\bagenda\b",
        r"\baction item\b", r"\bfollowup\b", r"\bdiscussed\b", r"\bdecision\b",
        r"\bnext steps\b", r"\baction required\b",
    ]),
    ("POLICY", "GOVERNANCE", [
        r"\bpolicy\b", r"\bprocedure\b", r"\bcompliance\b", r"\bregulation\b",
        r"\bguideline\b", r"\benforcement\b", r"\bviolation\b", r"\baudit\b",
    ]),
    ("TECHNICAL_SPEC", "TECHNICAL", [
        r"\bspecification\b", r"\barchitecture\b", r"\bapi\b", r"\bendpoint\b",
        r"\bdatabase schema\b", r"\buse case\b", r"\bsequence diagram\b",
        r"\bdeployment\b", r"\bfirewall\b", r"\blatency\b",
    ]),
]

_SECTION_KEYWORDS: list[str] = [
    "introduction", "overview", "summary", "background", "scope",
    "objectives", "methodology", "findings", "analysis", "recommendations",
    "conclusion", "appendix", "references", "terms and conditions",
    "deliverables", "timeline", "budget", "action items", "next steps",
]

_LANGUAGE_SIGNATURES: dict[str, list[str]] = {
    "English":  ["the", "and", "is", "are", "this", "that", "with", "for"],
    "Malay":    ["yang", "dan", "di", "ke", "dengan", "untuk", "ini"],
    "French":   ["le", "la", "les", "de", "du", "et", "est", "une"],
    "Spanish":  ["el", "la", "los", "de", "y", "es", "en", "que"],
}


def classify_document(text: str, filename: Optional[str] = None) -> dict:
    text_lower = text.lower()
    words = text_lower.split()
    word_count = len(words)

    # Score each type
    scores: dict[str, float] = {}
    for doc_type, sub_type, patterns in _TYPE_PATTERNS:
        hits = sum(1 for p in patterns if re.search(p, text_lower))
        scores[doc_type] = hits / len(patterns)

    # Filename hint bonus
    if filename:
        fn = filename.lower()
        for doc_type, _, _ in _TYPE_PATTERNS:
            if doc_type.lower().replace("_", "") in fn.replace("_", "").replace("-", ""):
                scores[doc_type] = min(1.0, scores.get(doc_type, 0) + 0.25)

    best_type = max(scores, key=scores.get) if scores else "UNKNOWN"
    best_score = scores.get(best_type, 0.0)
    sub_type = next((s for t, s, _ in _TYPE_PATTERNS if t == best_type), "GENERAL")

    if best_score < 0.1:
        best_type = "GENERAL"
        sub_type = "UNCLASSIFIED"

    confidence = min(0.99, 0.40 + best_score * 0.60)

    # Detected sections
    detected_sections = [
        kw.title() for kw in _SECTION_KEYWORDS
        if re.search(r"\b" + re.escape(kw) + r"\b", text_lower)
    ]

    # Language detection (simple frequency check)
    detected_lang = "English"
    best_lang_hits = 0
    for lang, tokens in _LANGUAGE_SIGNATURES.items():
        hits = sum(1 for t in tokens if t in words)
        if hits > best_lang_hits:
            best_lang_hits = hits
            detected_lang = lang

    # Estimated pages (rough: ~400 words/page)
    estimated_pages = max(1, round(word_count / 400))

    # Processing flags
    flags: list[str] = []
    if re.search(r"\bconfidential\w*\b|\bprivate\b|\bsensitive\b", text_lower):
        flags.append("CONFIDENTIAL")
    if re.search(r"\burgent\b|\basap\b|\bimmediately\b|\bcritical\b", text_lower):
        flags.append("URGENT")
    if re.search(r"\bsignature required\b|\bsign by\b|\bplease sign\b", text_lower):
        flags.append("SIGNATURE_REQUIRED")
    if re.search(r"\bdeadline\b|\bdue by\b|\bby eod\b|\bby end of\b", text_lower):
        flags.append("HAS_DEADLINE")
    if re.search(r"\$\s?\d+|\busd\b|\beur\b|\bmyr\b|\bamount\b", text_lower):
        flags.append("CONTAINS_FINANCIALS")
    if word_count > 2000:
        flags.append("LONG_DOCUMENT")

    return {
        "document_type": best_type,
        "confidence": round(confidence, 3),
        "sub_type": sub_type,
        "language": detected_lang,
        "estimated_pages": estimated_pages,
        "detected_sections": detected_sections[:10],
        "processing_flags": flags,
    }
