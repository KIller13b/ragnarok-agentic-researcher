"""
research/tests/test_evidence.py — Tests for research/evidence.py
================================================================

Tests cover:
- Adding search results to an EvidenceStore.
- Deduplication by normalized URL.
- Malformed and missing-field records.
- JSON export and import (using a temporary directory).
- All public methods: all_evidence, find_by_url, find_by_id, count.

No network calls, no API keys needed.

Run with:
    pytest research/tests/test_evidence.py -v
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

# ── Make the repo root importable ────────────────────────────────────────────
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from research.evidence import EvidenceStore, EvidenceValidationError


# ── Shared test fixtures ──────────────────────────────────────────────────────

def _make_result(
    title: str = "Test Title",
    url: str = "https://example.com/page",
    snippet: str = "A useful snippet.",
    source: str = "example.com",
) -> dict:
    """Build a minimal valid search result dict."""
    return {"title": title, "url": url, "snippet": snippet, "source": source}


def _make_full_record(
    evidence_id: str = "ev_001",
    title: str = "Test Title",
    url: str = "https://example.com/page",
    snippet: str = "A snippet.",
    source: str = "example.com",
    query: str = "test query",
) -> dict:
    """Build a complete evidence record dict (all six required fields)."""
    return {
        "evidence_id": evidence_id,
        "title":       title,
        "url":         url,
        "snippet":     snippet,
        "source":      source,
        "query":       query,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Test class 1 — Adding search results
# ─────────────────────────────────────────────────────────────────────────────

class TestAddFromSearchResults(unittest.TestCase):
    """EvidenceStore.add_from_search_results() behaviour."""

    def setUp(self):
        self.store = EvidenceStore()

    def test_single_result_is_stored(self):
        """One valid result should produce one evidence record."""
        results = [_make_result()]
        added = self.store.add_from_search_results(results, query="test")
        self.assertEqual(len(added), 1)
        self.assertEqual(self.store.count(), 1)

    def test_evidence_id_is_assigned(self):
        """The added record must have a stable evidence_id."""
        added = self.store.add_from_search_results([_make_result()], query="q")
        self.assertIn("evidence_id", added[0])
        self.assertEqual(added[0]["evidence_id"], "ev_001")

    def test_query_is_stored(self):
        """The query used to find the result must be stored in the record."""
        added = self.store.add_from_search_results(
            [_make_result()], query="my research question"
        )
        self.assertEqual(added[0]["query"], "my research question")

    def test_all_contract_fields_present(self):
        """Every evidence record must have all six guaranteed fields."""
        added = self.store.add_from_search_results([_make_result()], query="q")
        record = added[0]
        for field in ("evidence_id", "title", "url", "snippet", "source", "query"):
            self.assertIn(field, record, f"Missing field: {field}")

    def test_empty_results_list_adds_nothing(self):
        """An empty input list should leave the store unchanged."""
        added = self.store.add_from_search_results([], query="q")
        self.assertEqual(added, [])
        self.assertEqual(self.store.count(), 0)

    def test_multiple_results_stored(self):
        """Multiple distinct results should all be stored."""
        results = [
            _make_result(url="https://a.com/page"),
            _make_result(url="https://b.com/page"),
            _make_result(url="https://c.com/page"),
        ]
        added = self.store.add_from_search_results(results, query="q")
        self.assertEqual(len(added), 3)
        self.assertEqual(self.store.count(), 3)

    def test_sequential_evidence_ids(self):
        """Evidence IDs should be sequential: ev_001, ev_002, ev_003."""
        results = [
            _make_result(url="https://a.com/"),
            _make_result(url="https://b.com/"),
            _make_result(url="https://c.com/"),
        ]
        added = self.store.add_from_search_results(results, query="q")
        ids = [r["evidence_id"] for r in added]
        self.assertEqual(ids, ["ev_001", "ev_002", "ev_003"])


# ─────────────────────────────────────────────────────────────────────────────
# Test class 2 — Deduplication
# ─────────────────────────────────────────────────────────────────────────────

class TestDeduplication(unittest.TestCase):
    """URL-based deduplication must prevent identical pages from being stored twice."""

    def setUp(self):
        self.store = EvidenceStore()

    def test_exact_duplicate_url_is_skipped(self):
        """The same URL added twice should produce only one record."""
        result = _make_result(url="https://example.com/page")
        self.store.add_from_search_results([result], query="q1")
        added = self.store.add_from_search_results([result], query="q2")
        self.assertEqual(added, [])          # second call adds nothing
        self.assertEqual(self.store.count(), 1)

    def test_url_with_trailing_slash_is_duplicate(self):
        """https://example.com/page and https://example.com/page/ are the same."""
        self.store.add_from_search_results(
            [_make_result(url="https://example.com/page")], query="q"
        )
        added = self.store.add_from_search_results(
            [_make_result(url="https://example.com/page/")], query="q"
        )
        self.assertEqual(self.store.count(), 1)
        self.assertEqual(added, [])

    def test_url_with_query_string_is_duplicate(self):
        """A URL with a query string should match the same URL without one."""
        self.store.add_from_search_results(
            [_make_result(url="https://example.com/page")], query="q"
        )
        added = self.store.add_from_search_results(
            [_make_result(url="https://example.com/page?ref=search")], query="q"
        )
        self.assertEqual(self.store.count(), 1)
        self.assertEqual(added, [])

    def test_different_urls_are_not_duplicates(self):
        """Two genuinely different URLs should both be stored."""
        self.store.add_from_search_results(
            [_make_result(url="https://example.com/page-one")], query="q"
        )
        added = self.store.add_from_search_results(
            [_make_result(url="https://example.com/page-two")], query="q"
        )
        self.assertEqual(self.store.count(), 2)
        self.assertEqual(len(added), 1)

    def test_mixed_list_with_one_duplicate(self):
        """In a list of three, if one is a duplicate, only two should be added."""
        self.store.add_from_search_results(
            [_make_result(url="https://a.com/")], query="q"
        )
        results = [
            _make_result(url="https://a.com/"),        # duplicate
            _make_result(url="https://b.com/"),        # new
            _make_result(url="https://c.com/"),        # new
        ]
        added = self.store.add_from_search_results(results, query="q")
        self.assertEqual(len(added), 2)
        self.assertEqual(self.store.count(), 3)


# ─────────────────────────────────────────────────────────────────────────────
# Test class 3 — Malformed records
# ─────────────────────────────────────────────────────────────────────────────

class TestMalformedRecords(unittest.TestCase):
    """Malformed input must raise EvidenceValidationError, not silently pass."""

    def setUp(self):
        self.store = EvidenceStore()

    def test_missing_url_field_raises_validation_error(self):
        """A result without 'url' must raise EvidenceValidationError."""
        bad = {"title": "T", "snippet": "S", "source": "s.com"}
        with self.assertRaises(EvidenceValidationError):
            self.store.add_from_search_results([bad], query="q")

    def test_missing_title_field_raises_validation_error(self):
        """A result without 'title' must raise EvidenceValidationError."""
        bad = {"url": "https://a.com", "snippet": "S", "source": "a.com"}
        with self.assertRaises(EvidenceValidationError):
            self.store.add_from_search_results([bad], query="q")

    def test_missing_snippet_field_raises_validation_error(self):
        bad = {"title": "T", "url": "https://a.com", "source": "a.com"}
        with self.assertRaises(EvidenceValidationError):
            self.store.add_from_search_results([bad], query="q")

    def test_non_string_url_raises_validation_error(self):
        """Fields must be strings — an integer URL should raise an error."""
        bad = {"title": "T", "url": 12345, "snippet": "S", "source": "a.com"}
        with self.assertRaises(EvidenceValidationError):
            self.store.add_from_search_results([bad], query="q")

    def test_add_record_missing_evidence_id_raises(self):
        """add_record() must reject a record missing 'evidence_id'."""
        record = _make_full_record()
        del record["evidence_id"]
        with self.assertRaises(EvidenceValidationError):
            self.store.add_record(record)

    def test_add_record_missing_query_raises(self):
        """add_record() must reject a record missing 'query'."""
        record = _make_full_record()
        del record["query"]
        with self.assertRaises(EvidenceValidationError):
            self.store.add_record(record)

    def test_validation_error_includes_bad_record(self):
        """EvidenceValidationError.record should hold the offending dict."""
        bad = {"title": "T", "snippet": "S", "source": "a.com"}  # missing url
        with self.assertRaises(EvidenceValidationError) as ctx:
            self.store.add_from_search_results([bad], query="q")
        self.assertIs(ctx.exception.record, bad)


# ─────────────────────────────────────────────────────────────────────────────
# Test class 4 — Querying the store
# ─────────────────────────────────────────────────────────────────────────────

class TestQuerying(unittest.TestCase):
    """all_evidence(), find_by_url(), find_by_id(), all_urls(), count()."""

    def setUp(self):
        self.store = EvidenceStore()
        results = [
            _make_result(url="https://alpha.com/page", title="Alpha"),
            _make_result(url="https://beta.com/page", title="Beta"),
        ]
        self.store.add_from_search_results(results, query="q")

    def test_all_evidence_returns_all_records(self):
        evidence = self.store.all_evidence()
        self.assertEqual(len(evidence), 2)

    def test_all_evidence_returns_copy(self):
        """Mutating the returned list must not affect the internal store."""
        evidence = self.store.all_evidence()
        evidence.clear()
        self.assertEqual(self.store.count(), 2)

    def test_find_by_url_exact_match(self):
        """find_by_url() should return the record with the matching URL."""
        record = self.store.find_by_url("https://alpha.com/page")
        self.assertIsNotNone(record)
        self.assertEqual(record["title"], "Alpha")

    def test_find_by_url_normalized_match(self):
        """find_by_url() should match even with a trailing slash difference."""
        record = self.store.find_by_url("https://alpha.com/page/")
        self.assertIsNotNone(record)

    def test_find_by_url_not_found_returns_none(self):
        record = self.store.find_by_url("https://not-in-store.com/")
        self.assertIsNone(record)

    def test_find_by_id_returns_correct_record(self):
        record = self.store.find_by_id("ev_001")
        self.assertIsNotNone(record)
        self.assertEqual(record["title"], "Alpha")

    def test_find_by_id_not_found_returns_none(self):
        record = self.store.find_by_id("ev_999")
        self.assertIsNone(record)

    def test_count_reflects_unique_records(self):
        self.assertEqual(self.store.count(), 2)

    def test_all_urls_returns_original_urls(self):
        urls = self.store.all_urls()
        self.assertIn("https://alpha.com/page", urls)
        self.assertIn("https://beta.com/page", urls)


# ─────────────────────────────────────────────────────────────────────────────
# Test class 5 — JSON persistence
# ─────────────────────────────────────────────────────────────────────────────

class TestJsonPersistence(unittest.TestCase):
    """save_json() and load_json() must preserve all evidence exactly."""

    def setUp(self):
        # Use a temporary directory so test files are auto-cleaned.
        self.tmp_dir = tempfile.mkdtemp()
        self.filepath = os.path.join(self.tmp_dir, "test_evidence.json")

        self.store = EvidenceStore()
        results = [
            _make_result(url="https://a.com/", title="A"),
            _make_result(url="https://b.com/", title="B"),
        ]
        self.store.add_from_search_results(results, query="persistence test")

    def test_save_creates_file(self):
        """save_json() must create the file at the given path."""
        self.store.save_json(self.filepath)
        self.assertTrue(os.path.exists(self.filepath))

    def test_saved_file_is_valid_json(self):
        """The saved file must be parseable as JSON."""
        self.store.save_json(self.filepath)
        with open(self.filepath, encoding="utf-8") as fh:
            data = json.load(fh)  # raises json.JSONDecodeError if invalid
        self.assertIsInstance(data, dict)

    def test_saved_file_contains_records(self):
        """The saved JSON must include all evidence records."""
        self.store.save_json(self.filepath)
        with open(self.filepath, encoding="utf-8") as fh:
            data = json.load(fh)
        self.assertIn("records", data)
        self.assertEqual(len(data["records"]), 2)

    def test_load_json_restores_all_records(self):
        """Loading a saved file should produce the same number of records."""
        self.store.save_json(self.filepath)
        reloaded = EvidenceStore.load_json(self.filepath)
        self.assertEqual(reloaded.count(), self.store.count())

    def test_load_json_preserves_titles(self):
        """Titles must survive the save/load round-trip unchanged."""
        self.store.save_json(self.filepath)
        reloaded = EvidenceStore.load_json(self.filepath)
        original_titles = {r["title"] for r in self.store.all_evidence()}
        reloaded_titles = {r["title"] for r in reloaded.all_evidence()}
        self.assertEqual(original_titles, reloaded_titles)

    def test_load_json_preserves_evidence_ids(self):
        """evidence_id values must survive the round-trip."""
        self.store.save_json(self.filepath)
        reloaded = EvidenceStore.load_json(self.filepath)
        original_ids = {r["evidence_id"] for r in self.store.all_evidence()}
        reloaded_ids = {r["evidence_id"] for r in reloaded.all_evidence()}
        self.assertEqual(original_ids, reloaded_ids)

    def test_load_json_file_not_found(self):
        """Loading a nonexistent file must raise FileNotFoundError."""
        with self.assertRaises(FileNotFoundError):
            EvidenceStore.load_json("/tmp/definitely_does_not_exist_12345.json")

    def test_load_json_invalid_json(self):
        """Loading a corrupted file must raise json.JSONDecodeError."""
        import json
        bad_file = os.path.join(self.tmp_dir, "bad.json")
        with open(bad_file, "w") as fh:
            fh.write("this is not json {{{{")
        with self.assertRaises(json.JSONDecodeError):
            EvidenceStore.load_json(bad_file)

    def test_save_creates_parent_directories(self):
        """save_json() must create missing parent directories automatically."""
        nested_path = os.path.join(self.tmp_dir, "a", "b", "c", "evidence.json")
        self.store.save_json(nested_path)
        self.assertTrue(os.path.exists(nested_path))

    def test_empty_store_saves_and_loads(self):
        """An empty EvidenceStore should save and reload as empty."""
        empty_store = EvidenceStore()
        empty_store.save_json(self.filepath)
        reloaded = EvidenceStore.load_json(self.filepath)
        self.assertEqual(reloaded.count(), 0)

    def test_loaded_store_deduplicates(self):
        """Adding the same URL to a reloaded store should not create a duplicate."""
        self.store.save_json(self.filepath)
        reloaded = EvidenceStore.load_json(self.filepath)
        # Try to add a URL that is already in the loaded store.
        added = reloaded.add_from_search_results(
            [_make_result(url="https://a.com/")], query="follow-up"
        )
        self.assertEqual(added, [])  # duplicate — not added
        self.assertEqual(reloaded.count(), 2)


if __name__ == "__main__":
    unittest.main()
