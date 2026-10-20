"""
research/tests/test_search.py — Tests for research/search.py
=============================================================

All tests are isolated: no real network requests are made.
The Tavily SDK is mocked so these tests run without an API key.

Run with:
    pytest research/tests/test_search.py -v
"""

from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# ── Make the repo root importable ────────────────────────────────────────────
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from research.search import search_web, SearchError, MOCK_DISCLAIMER


# ── Helper: build a fake Tavily API response ──────────────────────────────────

def _make_tavily_response(results: list[dict]) -> dict:
    """Return a dict shaped like a real Tavily API response."""
    return {"results": results}


def _make_tavily_result(title: str, url: str, content: str) -> dict:
    """Return one item shaped like a Tavily result dict."""
    return {"title": title, "url": url, "content": content}


# ─────────────────────────────────────────────────────────────────────────────
# Test class 1 — Input validation
# ─────────────────────────────────────────────────────────────────────────────

class TestSearchWebInputValidation(unittest.TestCase):
    """search_web() must reject bad inputs before touching the network."""

    def test_empty_string_query_raises_value_error(self):
        """An empty string query must raise ValueError immediately."""
        with self.assertRaises(ValueError) as ctx:
            search_web("")
        self.assertIn("non-empty", str(ctx.exception).lower())

    def test_whitespace_only_query_raises_value_error(self):
        """A query containing only spaces is invalid."""
        with self.assertRaises(ValueError):
            search_web("   ")

    def test_none_query_raises_value_error(self):
        """None is not a valid query."""
        with self.assertRaises(ValueError):
            search_web(None)  # type: ignore[arg-type]

    def test_zero_max_results_raises_value_error(self):
        """max_results=0 is below the allowed minimum."""
        with patch.dict(os.environ, {"RESEARCH_MOCK_MODE": "true"}):
            with self.assertRaises(ValueError):
                search_web("test query", max_results=0)

    def test_negative_max_results_raises_value_error(self):
        """Negative max_results is not allowed."""
        with patch.dict(os.environ, {"RESEARCH_MOCK_MODE": "true"}):
            with self.assertRaises(ValueError):
                search_web("test query", max_results=-1)

    def test_too_large_max_results_raises_value_error(self):
        """max_results above 20 should raise ValueError."""
        with patch.dict(os.environ, {"RESEARCH_MOCK_MODE": "true"}):
            with self.assertRaises(ValueError):
                search_web("test query", max_results=99)

    def test_float_max_results_raises_value_error(self):
        """max_results must be an integer, not a float."""
        with patch.dict(os.environ, {"RESEARCH_MOCK_MODE": "true"}):
            with self.assertRaises(ValueError):
                search_web("test query", max_results=3.5)  # type: ignore[arg-type]


# ─────────────────────────────────────────────────────────────────────────────
# Test class 2 — Mock mode
# ─────────────────────────────────────────────────────────────────────────────

class TestSearchWebMockMode(unittest.TestCase):
    """When RESEARCH_MOCK_MODE=true, search_web() must return fake data."""

    def setUp(self):
        """Activate mock mode for every test in this class."""
        self._env_patch = patch.dict(os.environ, {
            "RESEARCH_MOCK_MODE": "true",
            "TAVILY_API_KEY": "",   # ensure no real key leaks in
        })
        self._env_patch.start()

    def tearDown(self):
        self._env_patch.stop()

    def test_mock_returns_list(self):
        """Mock mode must return a list."""
        results = search_web("test query")
        self.assertIsInstance(results, list)

    def test_mock_returns_correct_count(self):
        """Mock mode must respect max_results."""
        results = search_web("test query", max_results=3)
        self.assertEqual(len(results), 3)

    def test_mock_result_has_required_keys(self):
        """Every mock result must have the integration contract keys."""
        results = search_web("test")
        for result in results:
            self.assertIn("title", result)
            self.assertIn("url", result)
            self.assertIn("snippet", result)
            self.assertIn("source", result)

    def test_mock_snippet_contains_disclaimer(self):
        """Mock results must be labelled so callers can detect mock data."""
        results = search_web("test")
        for result in results:
            self.assertIn(MOCK_DISCLAIMER[:20], result["snippet"])

    def test_mock_does_not_make_network_calls(self):
        """Mock mode must never touch the Tavily SDK."""
        with patch("research.search._search_via_tavily") as mock_fn:
            search_web("test")
            mock_fn.assert_not_called()

    def test_mock_returns_strings_only(self):
        """All fields in a mock result must be strings."""
        results = search_web("test")
        for result in results:
            for key, value in result.items():
                self.assertIsInstance(value, str, f"Field '{key}' is not a string")


# ─────────────────────────────────────────────────────────────────────────────
# Test class 3 — Missing API key
# ─────────────────────────────────────────────────────────────────────────────

class TestSearchWebMissingApiKey(unittest.TestCase):
    """Without a key and not in mock mode, search_web() must raise SearchError."""

    def test_missing_key_raises_search_error(self):
        """SearchError raised when key is absent and mock mode is off."""
        with patch.dict(os.environ, {
            "TAVILY_API_KEY": "",
            "RESEARCH_MOCK_MODE": "false",
        }):
            with self.assertRaises(SearchError) as ctx:
                search_web("some valid query")

        error_message = str(ctx.exception).lower()
        self.assertIn("tavily_api_key", error_message)

    def test_error_message_suggests_fix(self):
        """The error message should guide the user to get a key or use mock mode."""
        with patch.dict(os.environ, {
            "TAVILY_API_KEY": "",
            "RESEARCH_MOCK_MODE": "false",
        }):
            with self.assertRaises(SearchError) as ctx:
                search_web("some valid query")

        # Check the message mentions at least one actionable hint.
        msg = str(ctx.exception)
        has_hint = ".env" in msg or "mock" in msg.lower() or "tavily" in msg.lower()
        self.assertTrue(has_hint, f"Expected a helpful hint in: {msg}")


# ─────────────────────────────────────────────────────────────────────────────
# Test class 4 — Tavily API errors (mocked)
# ─────────────────────────────────────────────────────────────────────────────

class TestSearchWebApiErrors(unittest.TestCase):
    """Network and API errors must be wrapped in SearchError, not propagated raw."""

    def _live_env(self) -> dict:
        return {"TAVILY_API_KEY": "tvly-fake-key-for-testing", "RESEARCH_MOCK_MODE": "false"}

    def test_network_error_becomes_search_error(self):
        """A network-level exception from Tavily becomes a SearchError."""
        with patch.dict(os.environ, self._live_env()):
            with patch("research.search._search_via_tavily",
                       side_effect=SearchError("Network failed", cause=ConnectionError())):
                with self.assertRaises(SearchError):
                    search_web("valid query")

    def test_search_error_has_cause(self):
        """SearchError.cause should hold the original exception."""
        original_exc = TimeoutError("connection timed out")
        err = SearchError("Tavily timed out", cause=original_exc)
        self.assertIs(err.cause, original_exc)

    def test_search_error_without_cause(self):
        """SearchError can be created without a cause (cause defaults to None)."""
        err = SearchError("Something went wrong")
        self.assertIsNone(err.cause)

    def test_tavily_returns_empty_results_list(self):
        """An API response with zero results returns an empty list, not an error."""
        with patch.dict(os.environ, self._live_env()):
            with patch("research.search._search_via_tavily", return_value=[]):
                results = search_web("obscure topic with no results")
        self.assertEqual(results, [])

    def test_successful_live_search_structure(self):
        """A successful (mocked) live search returns correct structure."""
        fake_results = [
            {"title": "Test Page", "url": "https://example.com/page", "snippet": "A test snippet.", "source": "example.com"},
        ]
        with patch.dict(os.environ, self._live_env()):
            with patch("research.search._search_via_tavily", return_value=fake_results):
                results = search_web("test query", max_results=5)

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Test Page")
        self.assertEqual(results[0]["url"], "https://example.com/page")
        self.assertIn("source", results[0])


# ─────────────────────────────────────────────────────────────────────────────
# Test class 5 — Result structure contract
# ─────────────────────────────────────────────────────────────────────────────

class TestSearchResultStructure(unittest.TestCase):
    """Every result must conform to the shared integration contract."""

    def test_source_field_is_domain(self):
        """The 'source' field must be derived from the URL domain."""
        with patch.dict(os.environ, {"RESEARCH_MOCK_MODE": "true"}):
            results = search_web("test")
        for result in results:
            # source should not be a full URL (no slashes from path)
            self.assertNotIn("/", result["source"].replace("//", ""))

    def test_all_fields_are_strings(self):
        """title, url, snippet, source must all be plain Python strings."""
        with patch.dict(os.environ, {"RESEARCH_MOCK_MODE": "true"}):
            results = search_web("artificial intelligence")
        for result in results:
            for key in ("title", "url", "snippet", "source"):
                self.assertIsInstance(result[key], str)


if __name__ == "__main__":
    unittest.main()
