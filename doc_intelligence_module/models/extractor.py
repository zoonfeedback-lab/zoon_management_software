import re
from typing import Optional


# ── Regex patterns ────────────────────────────────────────────────────────────

_DATE_PATTERNS = [
    r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\b",
    r"\b(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})\b",
    r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b",
    r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b",
    r"\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b",
]

_MONEY_PATTERNS = [
    r"(?:USD|MYR|EUR|GBP|AUD|SGD)?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)",
    r"(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|MYR|EUR|GBP|AUD|SGD)",
]

_EMAIL_PATTERN = r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
_PHONE_PATTERN = r"(?:\+?\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}"
_URL_PATTERN   = r"https?://[^\s\)\]>]+"
_ABN_PATTERN   = r"\b(?:ABN|ACN|SSN|ID NO\.?|REF NO\.?)[:\s#]*([A-Z0-9\-]{5,20})\b"

_KEY_CLAUSE_KEYWORDS = [
    "payment terms", "termination clause", "confidentiality", "liability",
    "intellectual property", "indemnification", "governing law", "dispute resolution",
    "force majeure", "warranty", "non-disclosure", "penalty", "late payment",
]

_ACTION_KEYWORDS = [
    r"please\s+\w+", r"action required", r"you must", r"must be",
    r"required to", r"kindly\s+\w+", r"ensure that", r"submit by",
    r"complete by", r"respond by", r"sign and return",
]

_PARTY_PATTERNS = [
    r"(?:between|party|parties|client|vendor|supplier|contractor|employer|employee)[:\s]+([A-Z][A-Za-z\s&\.]{2,50}?)(?:\.|,|\band\b|$)",
    r"(?:from|to|cc|bcc)[:\s]+([A-Za-z\s]+<[^>]+>|[A-Za-z\s]{4,40})",
]


def extract_information(text: str, document_type: Optional[str] = None) -> dict:
    # Dates
    dates: list[dict] = []
    for pattern in _DATE_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            val = m.group(1).strip()
            # Determine label from surrounding context (30 chars)
            start = max(0, m.start() - 30)
            ctx = text[start:m.start()].lower()
            label = "General Date"
            if any(k in ctx for k in ["due", "payment", "pay by"]):
                label = "Payment Due Date"
            elif any(k in ctx for k in ["sign", "execut", "effective"]):
                label = "Effective / Signing Date"
            elif any(k in ctx for k in ["deadline", "submit", "deliver"]):
                label = "Deadline"
            elif any(k in ctx for k in ["start", "commence", "begin"]):
                label = "Start Date"
            elif any(k in ctx for k in ["end", "expir", "terminat"]):
                label = "End / Expiry Date"
            if not any(d["value"] == val for d in dates):
                dates.append({"value": val, "label": label})

    # Monetary values
    monetary: list[dict] = []
    for pattern in _MONEY_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            raw = m.group(0).strip()
            numeric_str = m.group(1).replace(",", "")
            try:
                amount = float(numeric_str)
            except ValueError:
                continue
            start = max(0, m.start() - 40)
            ctx = text[start:m.start()].lower()
            label = "Amount"
            if "total" in ctx:       label = "Total Amount"
            elif "tax" in ctx:       label = "Tax"
            elif "discount" in ctx:  label = "Discount"
            elif "deposit" in ctx:   label = "Deposit"
            elif "fee" in ctx:       label = "Fee"
            elif "invoice" in ctx:   label = "Invoice Amount"
            if not any(mv["raw"] == raw for mv in monetary):
                monetary.append({"raw": raw, "amount": amount, "label": label})

    # Entities
    entities = []

    for m in re.finditer(_EMAIL_PATTERN, text):
        entities.append({
            "value": m.group(0), "entity_type": "EMAIL",
            "confidence": 0.97,
            "context": text[max(0, m.start()-20):m.end()+20].strip()
        })

    for m in re.finditer(_PHONE_PATTERN, text):
        val = m.group(0).strip()
        if len(re.sub(r"\D", "", val)) >= 7:
            entities.append({
                "value": val, "entity_type": "PHONE_NUMBER",
                "confidence": 0.85,
                "context": text[max(0, m.start()-20):m.end()+20].strip()
            })

    for m in re.finditer(_URL_PATTERN, text):
        entities.append({
            "value": m.group(0), "entity_type": "URL",
            "confidence": 0.98,
            "context": text[max(0, m.start()-20):m.end()+20].strip()
        })

    for m in re.finditer(_ABN_PATTERN, text, re.IGNORECASE):
        entities.append({
            "value": m.group(0).strip(), "entity_type": "REFERENCE_ID",
            "confidence": 0.90,
            "context": text[max(0, m.start()-20):m.end()+20].strip()
        })

    # Parties
    parties_raw: list[str] = []
    for pattern in _PARTY_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            name = m.group(1).strip()
            if 3 < len(name) < 60 and name not in parties_raw:
                parties_raw.append(name)

    # Key clauses
    text_lower = text.lower()
    key_clauses = [
        kw.title() for kw in _KEY_CLAUSE_KEYWORDS
        if re.search(r"\b" + re.escape(kw) + r"\b", text_lower)
    ]

    # Action items
    action_items: list[str] = []
    for pattern in _ACTION_KEYWORDS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            # Extract the full sentence
            sent_start = text.rfind(".", 0, m.start()) + 1
            sent_end = text.find(".", m.end())
            if sent_end == -1:
                sent_end = min(m.end() + 100, len(text))
            sentence = text[sent_start:sent_end].strip()
            if sentence and sentence not in action_items and len(sentence) < 200:
                action_items.append(sentence)

    # Metadata
    word_count = len(text.split())
    char_count = len(text)
    paragraph_count = len([p for p in text.split("\n\n") if p.strip()])

    return {
        "entities": entities[:20],
        "key_dates": dates[:10],
        "monetary_values": monetary[:10],
        "parties": parties_raw[:8],
        "key_clauses": key_clauses[:10],
        "action_items": action_items[:8],
        "document_metadata": {
            "word_count": word_count,
            "character_count": char_count,
            "paragraph_count": paragraph_count,
            "document_type_hint": document_type or "auto",
        }
    }
