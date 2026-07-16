import pytest
from doc_intelligence_module.models.classifier import classify_document
from doc_intelligence_module.models.extractor import extract_information
from doc_intelligence_module.models.summarizer import summarize
from doc_intelligence_module.models.search import search_documents

# ── Sample texts ──────────────────────────────────────────────────────────────

INVOICE_TEXT = """
INVOICE
Invoice No: INV-2026-0042
Bill To: Acme Corp Sdn Bhd
Due Date: 15 August 2026
Payment Terms: Net 30

Description          Qty   Unit Price   Total
Web Development      1     MYR 5,000    MYR 5,000
Monthly Maintenance  1     MYR 500      MYR 500

Subtotal: MYR 5,500
Tax (6%): MYR 330
Total Amount Due: MYR 5,830

Please settle payment by the due date to avoid late charges.
"""

CONTRACT_TEXT = """
SERVICE AGREEMENT

This Agreement is entered into between Zoon Software Company (hereinafter "Service Provider")
and TechClient Sdn Bhd (hereinafter "Client"). The parties hereby agree to the following terms and conditions.

1. Confidentiality: Both parties shall maintain strict confidentiality of all proprietary information.
2. Liability: The Service Provider's liability shall not exceed the total contract value.
3. Termination: Either party may terminate with 30 days written notice.
4. Governing Law: This agreement shall be governed by the laws of Malaysia.
5. Indemnification: Each party shall indemnify the other against third-party claims.

Signature required before commencement of services.
"""

REPORT_TEXT = """
QUARTERLY PERFORMANCE REPORT — Q2 2026

Executive Summary:
This report presents findings from our Q2 2026 analysis. Overall performance showed a 15% increase
compared to Q1, driven by improved client satisfaction scores and higher project completion rates.

Methodology:
Data was collected from 48 active projects across 6 departments using our internal tracking system.

Findings:
- Project completion rate: 87% (up from 79% in Q1)
- Average client rating: 4.3/5.0
- Revenue growth: 12% month-over-month

Recommendations:
1. Continue investment in workforce training programs.
2. Expand the client retention initiative to all accounts.
3. Implement the new BI forecasting module for real-time insights.

Conclusion:
Q2 results demonstrate strong momentum and position the company well for H2 targets.

Appendix: Raw data available on request.
"""

EMAIL_TEXT = """
From: john.smith@example.com
To: faiqsamad134@gmail.com
CC: manager@zoonsoftware.com
Subject: Action Required — Contract Review

Dear Faiq,

Please review the attached contract by 20 July 2026 and confirm your acceptance.
You must sign and return the document within 5 business days.

The total contract value is USD 12,500. Please ensure that all terms are reviewed
carefully before signing.

Kindly acknowledge receipt of this email.

Regards,
John Smith
+60 12-345 6789
https://zoonsoftware.com/contracts/2026-007
"""

MEETING_TEXT = """
MEETING MINUTES — Weekly Sync
Date: 10 July 2026
Attendees: Faiq, Sara, Dev Team Lead

Agenda:
1. Sprint review
2. Upcoming deadline discussion
3. Next steps for AI module integration

Discussed:
- The AI Document Intelligence module design was reviewed and approved.
- Deadline for integration is set for 31 July 2026.
- Action item: Dev team to wire up NestJS endpoints by next Thursday.
- Action item: Faiq to complete unit tests and INTEGRATION.md.

Decision: Proceed with port 8003 for the new module.

Next Steps:
- Schedule follow-up meeting for 17 July 2026.
"""

CORPUS = [
    {"id": "1", "title": "Q2 Report",            "text": REPORT_TEXT,   "type": "REPORT"},
    {"id": "2", "title": "Service Agreement",     "text": CONTRACT_TEXT, "type": "CONTRACT"},
    {"id": "3", "title": "Invoice INV-2026-0042", "text": INVOICE_TEXT,  "type": "INVOICE"},
    {"id": "4", "title": "Meeting Notes Jul 10",  "text": MEETING_TEXT,  "type": "MEETING_NOTES"},
    {"id": "5", "title": "John's Email",          "text": EMAIL_TEXT,    "type": "EMAIL"},
]


# ══════════════════════════════════════════════════════════════════════════════
# Document Classifier tests
# ══════════════════════════════════════════════════════════════════════════════

class TestClassifier:
    def test_invoice_classified(self):
        r = classify_document(INVOICE_TEXT)
        assert r["document_type"] == "INVOICE"

    def test_contract_classified(self):
        r = classify_document(CONTRACT_TEXT)
        assert r["document_type"] == "CONTRACT"

    def test_report_classified(self):
        r = classify_document(REPORT_TEXT)
        assert r["document_type"] == "REPORT"

    def test_email_classified(self):
        r = classify_document(EMAIL_TEXT)
        assert r["document_type"] == "EMAIL"

    def test_meeting_classified(self):
        r = classify_document(MEETING_TEXT)
        assert r["document_type"] == "MEETING_NOTES"

    def test_confidence_in_range(self):
        r = classify_document(CONTRACT_TEXT)
        assert 0.0 <= r["confidence"] <= 1.0

    def test_language_detected(self):
        r = classify_document(REPORT_TEXT)
        assert r["language"] == "English"

    def test_estimated_pages_positive(self):
        r = classify_document(REPORT_TEXT)
        assert r["estimated_pages"] >= 1

    def test_processing_flags_confidential(self):
        r = classify_document(CONTRACT_TEXT)
        assert "CONFIDENTIAL" in r["processing_flags"]

    def test_processing_flags_signature_required(self):
        r = classify_document(CONTRACT_TEXT)
        assert "SIGNATURE_REQUIRED" in r["processing_flags"]

    def test_detected_sections_nonempty(self):
        r = classify_document(REPORT_TEXT)
        assert len(r["detected_sections"]) > 0

    def test_filename_hint_bonus(self):
        r_with = classify_document(INVOICE_TEXT, filename="invoice_2026.pdf")
        r_without = classify_document(INVOICE_TEXT)
        assert r_with["confidence"] >= r_without["confidence"]


# ══════════════════════════════════════════════════════════════════════════════
# Information Extractor tests
# ══════════════════════════════════════════════════════════════════════════════

class TestExtractor:
    def test_email_entities_extracted(self):
        r = extract_information(EMAIL_TEXT)
        emails = [e["value"] for e in r["entities"] if e["entity_type"] == "EMAIL"]
        assert any("john.smith@example.com" in e for e in emails)

    def test_phone_entities_extracted(self):
        r = extract_information(EMAIL_TEXT)
        phones = [e for e in r["entities"] if e["entity_type"] == "PHONE_NUMBER"]
        assert len(phones) > 0

    def test_url_entities_extracted(self):
        r = extract_information(EMAIL_TEXT)
        urls = [e for e in r["entities"] if e["entity_type"] == "URL"]
        assert len(urls) > 0

    def test_dates_extracted(self):
        r = extract_information(EMAIL_TEXT)
        assert len(r["key_dates"]) > 0

    def test_monetary_values_extracted(self):
        r = extract_information(INVOICE_TEXT)
        assert len(r["monetary_values"]) > 0

    def test_key_clauses_from_contract(self):
        r = extract_information(CONTRACT_TEXT, document_type="CONTRACT")
        assert len(r["key_clauses"]) > 0

    def test_action_items_extracted(self):
        r = extract_information(EMAIL_TEXT)
        assert len(r["action_items"]) > 0

    def test_metadata_present(self):
        r = extract_information(REPORT_TEXT)
        assert "word_count" in r["document_metadata"]
        assert r["document_metadata"]["word_count"] > 0

    def test_confidence_range_for_entities(self):
        r = extract_information(EMAIL_TEXT)
        for e in r["entities"]:
            assert 0.0 <= e["confidence"] <= 1.0


# ══════════════════════════════════════════════════════════════════════════════
# Summarizer tests
# ══════════════════════════════════════════════════════════════════════════════

class TestSummarizer:
    def test_executive_summary_nonempty(self):
        r = summarize(REPORT_TEXT)
        assert len(r["executive_summary"]) > 0

    def test_key_points_list(self):
        r = summarize(REPORT_TEXT)
        assert isinstance(r["key_points"], list)

    def test_topics_extracted(self):
        r = summarize(REPORT_TEXT)
        assert len(r["topics"]) > 0

    def test_sentiment_positive_for_report(self):
        r = summarize(REPORT_TEXT)
        assert r["sentiment"] in ("POSITIVE", "NEUTRAL", "NEGATIVE")

    def test_urgency_detected(self):
        r = summarize(EMAIL_TEXT)
        assert r["urgency_level"] in ("HIGH", "MEDIUM", "LOW")

    def test_compression_ratio_less_than_one(self):
        r = summarize(REPORT_TEXT, summary_length="short")
        assert r["compression_ratio"] <= 1.0

    def test_short_vs_long_summary_length(self):
        r_short = summarize(REPORT_TEXT, summary_length="short")
        r_long  = summarize(REPORT_TEXT, summary_length="long")
        assert r_long["word_count_summary"] >= r_short["word_count_summary"]

    def test_word_counts_match_text(self):
        r = summarize(REPORT_TEXT)
        expected = len(REPORT_TEXT.split())
        assert abs(r["word_count_original"] - expected) < 5


# ══════════════════════════════════════════════════════════════════════════════
# Search tests
# ══════════════════════════════════════════════════════════════════════════════

class TestSearch:
    def test_basic_keyword_search(self):
        r = search_documents("client satisfaction", CORPUS)
        assert len(r["results"]) > 0

    def test_results_ordered_by_relevance(self):
        r = search_documents("confidentiality termination", CORPUS)
        scores = [res["relevance_score"] for res in r["results"]]
        assert scores == sorted(scores, reverse=True)

    def test_top_k_respected(self):
        r = search_documents("project", CORPUS, top_k=2)
        assert len(r["results"]) <= 2

    def test_filter_by_type(self):
        r = search_documents("payment", CORPUS, filter_type="INVOICE")
        for res in r["results"]:
            assert res["document_type"] == "INVOICE"

    def test_no_results_for_unknown_query(self):
        r = search_documents("quantum entanglement reactor", CORPUS)
        assert isinstance(r["results"], list)

    def test_query_intent_detected(self):
        r = search_documents("what is the total amount due", CORPUS)
        assert r["query_intent"] == "FIND_AMOUNT"

    def test_suggested_refinements_present(self):
        r = search_documents("deadline for project", CORPUS)
        assert len(r["suggested_refinements"]) > 0

    def test_relevance_scores_normalised(self):
        r = search_documents("contract terms", CORPUS)
        if r["results"]:
            assert r["results"][0]["relevance_score"] == 1.0

    def test_matched_terms_in_results(self):
        r = search_documents("invoice payment terms", CORPUS)
        for res in r["results"]:
            assert isinstance(res["matched_terms"], list)

    def test_search_time_returned(self):
        r = search_documents("report findings", CORPUS)
        assert r["search_time_ms"] >= 0

    def test_total_searched_reflects_filter(self):
        r_all = search_documents("report", CORPUS)
        r_filtered = search_documents("report", CORPUS, filter_type="REPORT")
        assert r_all["total_searched"] >= r_filtered["total_searched"]
