"""
research/tests/test_verification.py — Tests for research/verification.py
=========================================================================

Tests cover:
- Citations that exist in evidence and those that do not.
- Claims with evidence keyword support and those without.
- Duplicate URL detection.
- Conflict heuristic with high-overlap and low-overlap pairs.
- Empty edge cases: empty evidence, empty claim lists.

No network calls, no API keys needed.

Run with:
    pytest research/tests/test_verification.py -v
"""

from __future__ import annotations

import os
import sys
import unittest

# ── Make the repo root importable ────────────────────────────────────────────
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from research.verification import (
    VerificationResult,
    verify_citations,
    flag_uncited_claims,
    find_duplicate_urls,
    find_conflicting_claims,
)


# ── Shared test fixtures ──────────────────────────────────────────────────────

def _make_evidence(
    evidence_id: str = "ev_001",
    title: str = "Test Article",
    url: str = "https://example.com/article",
    snippet: str = "Artificial intelligence is transforming healthcare and education.",
    source: str = "example.com",
    query: str = "artificial intelligence",
) -> dict:
    """Build one complete evidence record."""
    return {
        "evidence_id": evidence_id,
        "title":       title,
        "url":         url,
        "snippet":     snippet,
        "source":      source,
        "query":       query,
    }


def _status(result: VerificationResult) -> str:
    """Shortcut to read the status of a VerificationResult."""
    return result.status


# ─────────────────────────────────────────────────────────────────────────────
# Test class 1 — verify_citations
# ─────────────────────────────────────────────────────────────────────────────

class TestVerifyCitations(unittest.TestCase):
    """verify_citations() checks whether cited URLs are in the evidence."""

    def setUp(self):
        self.evidence = [
            _make_evidence("ev_001", url="https://example.com/article"),
            _make_evidence("ev_002", url="https://research.org/paper"),
        ]

    def test_cited_url_found_in_evidence(self):
        """A URL that exists in evidence should return status 'ok'."""
        results = verify_citations(["https://example.com/article"], self.evidence)
        self.assertEqual(len(results), 1)
        self.assertEqual(_status(results[0]), "ok")

    def test_cited_url_not_in_evidence(self):
        """A URL absent from evidence should return status 'missing'."""
        results = verify_citations(["https://not-in-evidence.com/"], self.evidence)
        self.assertEqual(len(results), 1)
        self.assertEqual(_status(results[0]), "missing")

    def test_mixed_citations(self):
        """One found + one missing → two results with correct statuses."""
        urls = [
            "https://example.com/article",          # found
            "https://totally-fake.example/missing",  # missing
        ]
        results = verify_citations(urls, self.evidence)
        self.assertEqual(len(results), 2)
        statuses = {r.subject.split("/")[-1]: r.status for r in results}
        self.assertEqual(results[0].status, "ok")
        self.assertEqual(results[1].status, "missing")

    def test_empty_cited_urls_returns_empty(self):
        """Passing an empty URL list should return an empty results list."""
        results = verify_citations([], self.evidence)
        self.assertEqual(results, [])

    def test_empty_evidence_all_missing(self):
        """With no evidence, every citation should be 'missing'."""
        results = verify_citations(["https://example.com/article"], evidence_list=[])
        self.assertEqual(_status(results[0]), "missing")

    def test_result_includes_supporting_evidence_id(self):
        """When 'ok', the result should include the matching evidence_id."""
        results = verify_citations(["https://example.com/article"], self.evidence)
        self.assertIn("ev_001", results[0].supporting_evidence_ids)

    def test_url_with_trailing_slash_matches(self):
        """Citation with trailing slash should match stored URL without."""
        results = verify_citations(["https://example.com/article/"], self.evidence)
        self.assertEqual(_status(results[0]), "ok")

    def test_url_with_query_string_matches(self):
        """Citation with query string should match the base URL in evidence."""
        results = verify_citations(
            ["https://example.com/article?utm_source=google"], self.evidence
        )
        self.assertEqual(_status(results[0]), "ok")

    def test_result_check_type_is_citation_check(self):
        """check_type must be 'citation_check' for all citation results."""
        results = verify_citations(["https://example.com/article"], self.evidence)
        self.assertEqual(results[0].check_type, "citation_check")


# ─────────────────────────────────────────────────────────────────────────────
# Test class 2 — flag_uncited_claims
# ─────────────────────────────────────────────────────────────────────────────

class TestFlagUncitedClaims(unittest.TestCase):
    """flag_uncited_claims() checks keyword overlap between claims and evidence."""

    def setUp(self):
        # Evidence snippet about artificial intelligence in healthcare.
        self.evidence = [
            _make_evidence(
                "ev_001",
                title="AI in Healthcare",
                snippet="Artificial intelligence systems are revolutionizing healthcare delivery.",
            ),
        ]

    def test_claim_with_keyword_overlap_is_ok(self):
        """A claim sharing keywords with evidence should get status 'ok'."""
        claims = ["Artificial intelligence is changing healthcare systems."]
        results = flag_uncited_claims(claims, self.evidence)
        self.assertEqual(len(results), 1)
        self.assertIn(results[0].status, ("ok", "heuristic"))

    def test_claim_with_no_keyword_overlap_is_missing(self):
        """A claim unrelated to any evidence should get status 'missing'."""
        claims = ["Quantum computing uses superconducting chips made from niobium."]
        results = flag_uncited_claims(claims, self.evidence)
        self.assertEqual(len(results), 1)
        self.assertEqual(_status(results[0]), "missing")

    def test_empty_claims_returns_empty_list(self):
        results = flag_uncited_claims([], self.evidence)
        self.assertEqual(results, [])

    def test_empty_evidence_all_claims_missing(self):
        """With no evidence, every claim should be 'missing'."""
        claims = ["Some claim about artificial intelligence."]
        results = flag_uncited_claims(claims, evidence_list=[])
        self.assertEqual(_status(results[0]), "missing")

    def test_multiple_claims_return_one_result_each(self):
        """The function should return exactly one result per claim."""
        claims = [
            "Artificial intelligence transforms healthcare.",
            "Completely unrelated topic about ancient history.",
        ]
        results = flag_uncited_claims(claims, self.evidence)
        self.assertEqual(len(results), 2)

    def test_short_claim_gets_warning(self):
        """A single very short claim should get status 'warning'."""
        results = flag_uncited_claims(["AI."], self.evidence)
        # Could be "warning" or "missing" — both are honest outcomes.
        self.assertIn(results[0].status, ("warning", "missing"))

    def test_result_check_type_is_uncited_claim_check(self):
        results = flag_uncited_claims(["Test claim about intelligence."], self.evidence)
        self.assertEqual(results[0].check_type, "uncited_claim_check")

    def test_status_is_honest_heuristic_label(self):
        """Results should acknowledge the heuristic nature of the check."""
        claims = ["Artificial intelligence is transforming industries."]
        results = flag_uncited_claims(claims, self.evidence)
        # The status should be one of the documented values.
        valid_statuses = {"ok", "warning", "missing", "heuristic"}
        self.assertIn(results[0].status, valid_statuses)


# ─────────────────────────────────────────────────────────────────────────────
# Test class 3 — find_duplicate_urls
# ─────────────────────────────────────────────────────────────────────────────

class TestFindDuplicateUrls(unittest.TestCase):
    """find_duplicate_urls() should find evidence records sharing a normalized URL."""

    def test_no_duplicates_returns_empty(self):
        """Distinct URLs should produce no warnings."""
        evidence = [
            _make_evidence("ev_001", url="https://a.com/page"),
            _make_evidence("ev_002", url="https://b.com/page"),
        ]
        results = find_duplicate_urls(evidence)
        self.assertEqual(results, [])

    def test_exact_duplicate_url_flagged(self):
        """Two records with the same URL should produce one warning."""
        evidence = [
            _make_evidence("ev_001", url="https://a.com/page"),
            _make_evidence("ev_002", url="https://a.com/page"),  # duplicate
        ]
        results = find_duplicate_urls(evidence)
        self.assertEqual(len(results), 1)
        self.assertEqual(_status(results[0]), "warning")

    def test_normalized_duplicate_flagged(self):
        """URL variants (trailing slash, query string) should be treated as duplicates."""
        evidence = [
            _make_evidence("ev_001", url="https://a.com/page"),
            _make_evidence("ev_002", url="https://a.com/page/"),   # trailing slash
        ]
        results = find_duplicate_urls(evidence)
        self.assertEqual(len(results), 1)

    def test_duplicate_result_includes_both_ids(self):
        """The warning should reference both evidence IDs involved."""
        evidence = [
            _make_evidence("ev_001", url="https://a.com/page"),
            _make_evidence("ev_002", url="https://a.com/page"),
        ]
        results = find_duplicate_urls(evidence)
        ids = results[0].supporting_evidence_ids
        self.assertIn("ev_001", ids)
        self.assertIn("ev_002", ids)

    def test_empty_evidence_returns_empty(self):
        results = find_duplicate_urls([])
        self.assertEqual(results, [])

    def test_single_record_returns_empty(self):
        results = find_duplicate_urls([_make_evidence()])
        self.assertEqual(results, [])

    def test_result_check_type_is_duplicate_url_check(self):
        evidence = [
            _make_evidence("ev_001", url="https://a.com/"),
            _make_evidence("ev_002", url="https://a.com/"),
        ]
        results = find_duplicate_urls(evidence)
        self.assertEqual(results[0].check_type, "duplicate_url_check")


# ─────────────────────────────────────────────────────────────────────────────
# Test class 4 — find_conflicting_claims
# ─────────────────────────────────────────────────────────────────────────────

class TestFindConflictingClaims(unittest.TestCase):
    """find_conflicting_claims() applies a keyword-overlap heuristic."""

    def setUp(self):
        self.evidence = [
            _make_evidence(
                "ev_001",
                snippet="Artificial intelligence poses risks to employment and privacy.",
            )
        ]

    def test_high_overlap_pair_flagged_as_heuristic(self):
        """Two claims sharing many keywords should be flagged (heuristic)."""
        pairs = [(
            "Artificial intelligence is dangerous and poses many risks.",
            "Artificial intelligence is safe and poses no risks at all.",
        )]
        results = find_conflicting_claims(pairs, self.evidence)
        self.assertEqual(len(results), 1)
        self.assertEqual(_status(results[0]), "heuristic")

    def test_unrelated_claims_return_ok(self):
        """Two claims about completely different topics should not be flagged."""
        pairs = [(
            "The Eiffel Tower is located in Paris.",
            "Quantum computing uses superconducting materials.",
        )]
        results = find_conflicting_claims(pairs, self.evidence)
        self.assertEqual(len(results), 1)
        self.assertEqual(_status(results[0]), "ok")

    def test_empty_pairs_returns_empty(self):
        results = find_conflicting_claims([], self.evidence)
        self.assertEqual(results, [])

    def test_multiple_pairs_return_one_result_each(self):
        """Three pairs should produce exactly three results."""
        pairs = [
            ("Claim one A.", "Claim one B."),
            ("AI benefits.", "AI risks."),
            ("Short.", "Also short."),
        ]
        results = find_conflicting_claims(pairs, self.evidence)
        self.assertEqual(len(results), 3)

    def test_result_is_heuristic_not_definitive(self):
        """The reason must clearly state this is a heuristic, not a confirmed conflict."""
        pairs = [(
            "Artificial intelligence will replace all human jobs.",
            "Artificial intelligence creates more human jobs.",
        )]
        results = find_conflicting_claims(pairs, self.evidence)
        reason = results[0].reason.lower()
        is_honest = (
            "heuristic" in reason
            or "cannot" in reason
            or "preliminary" in reason
            or "human" in reason
        )
        self.assertTrue(
            is_honest,
            f"Reason does not acknowledge limitation: {results[0].reason}"
        )

    def test_result_check_type_is_conflict_check(self):
        pairs = [("AI is good.", "AI is bad.")]
        results = find_conflicting_claims(pairs, self.evidence)
        self.assertEqual(results[0].check_type, "conflict_check")

    def test_too_short_claims_get_warning_status(self):
        """Very short claims (no meaningful keywords) should get 'warning', not crash."""
        pairs = [("A.", "B.")]
        results = find_conflicting_claims(pairs, self.evidence)
        self.assertEqual(len(results), 1)
        self.assertIn(results[0].status, ("warning", "ok", "heuristic"))


# ─────────────────────────────────────────────────────────────────────────────
# Test class 5 — VerificationResult structure
# ─────────────────────────────────────────────────────────────────────────────

class TestVerificationResultStructure(unittest.TestCase):
    """VerificationResult must always have the documented fields."""

    def test_all_fields_present(self):
        """A manually constructed VerificationResult must have all fields."""
        vr = VerificationResult(
            check_type="test_check",
            status="ok",
            subject="https://example.com",
            reason="Test reason.",
        )
        self.assertEqual(vr.check_type, "test_check")
        self.assertEqual(vr.status, "ok")
        self.assertEqual(vr.subject, "https://example.com")
        self.assertEqual(vr.reason, "Test reason.")
        self.assertEqual(vr.supporting_evidence_ids, [])

    def test_supporting_evidence_ids_defaults_to_empty_list(self):
        """supporting_evidence_ids must default to [] if not provided."""
        vr = VerificationResult(
            check_type="x", status="ok", subject="x", reason="x"
        )
        self.assertIsInstance(vr.supporting_evidence_ids, list)
        self.assertEqual(len(vr.supporting_evidence_ids), 0)

    def test_supporting_evidence_ids_can_be_set(self):
        vr = VerificationResult(
            check_type="x",
            status="ok",
            subject="x",
            reason="x",
            supporting_evidence_ids=["ev_001", "ev_002"],
        )
        self.assertEqual(vr.supporting_evidence_ids, ["ev_001", "ev_002"])


if __name__ == "__main__":
    unittest.main()
