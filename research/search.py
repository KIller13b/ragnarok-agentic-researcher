"""
research/search.py — Live web search using the Tavily API
==========================================================

Public API
----------
    search_web(query, max_results=5) -> list[dict]
    SearchError                        (custom exception)
    MOCK_DISCLAIMER                    (string constant)

Integration contract (shared data format)
-----------------------------------------
Every dict returned by search_web() contains exactly these keys:

    {
        "title":   str,   # page title as returned by the search engine
        "url":     str,   # full URL of the source page
        "snippet": str,   # short excerpt summarising the page content
        "source":  str,   # domain name extracted from the URL
    }

No other keys are guaranteed. Callers must not rely on provider-specific
fields that may appear inside raw Tavily responses.

Provider isolation
------------------
All Tavily-specific code lives in _search_via_tavily().  To swap providers
later, implement a new _search_via_<name>() function and update search_web()
to call it.  The rest of the codebase does not need to change.

Mock mode
---------
Set RESEARCH_MOCK_MODE=true in your .env (or the environment) to get
deterministic fake results without consuming API credits.  Mock results are
always labelled with MOCK_DISCLAIMER and must never be presented as live data.

Errors
------
Raises SearchError for every failure that prevents results from being returned.
The message describes the problem; callers should catch SearchError and decide
whether to retry, skip, or propagate.
"""

from __future__ import annotations

import os
import time
from urllib.parse import urlparse  # standard library — splits URLs into parts


# ── Public constants ────────────────────────────────────────────────────────

MOCK_DISCLAIMER: str = (
    "[MOCK DATA — not live search results. "
    "Set TAVILY_API_KEY in .env for real searches.]"
)

# How long (in seconds) we wait for a Tavily response before giving up.
_DEFAULT_TIMEOUT: int = 15

# Maximum number of results a caller may request in a single call.
_MAX_ALLOWED_RESULTS: int = 20


# ── Custom exception ─────────────────────────────────────────────────────────

class SearchError(Exception):
    """
    Raised when a search cannot be completed.

    Attributes
    ----------
    message : str
        Human-readable explanation of what went wrong.
    cause : Exception | None
        The underlying exception, if any.  Useful for logging.
    """

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


# ── Shared data format helper ─────────────────────────────────────────────────

def _build_result(
    title: str,
    url: str,
    snippet: str,
) -> dict:
    """
    Build one search-result dict in the shared integration contract format.

    The ``source`` field is derived from the URL domain so callers do not need
    to do any URL parsing themselves.

    Parameters
    ----------
    title   : Page title.
    url     : Full URL of the result page.
    snippet : Short text excerpt from the page.

    Returns
    -------
    dict with keys: title, url, snippet, source.
    """
    # urlparse("https://www.bbc.com/news/...").netloc  →  "www.bbc.com"
    parsed = urlparse(url)
    source = parsed.netloc or url  # fall back to the full URL if parsing fails

    return {
        "title":   str(title).strip(),
        "url":     str(url).strip(),
        "snippet": str(snippet).strip(),
        "source":  str(source).strip(),
    }


# ── Provider-specific implementation ─────────────────────────────────────────

def _search_via_tavily(
    query: str,
    max_results: int,
    api_key: str,
) -> list[dict]:
    """
    Perform a live search using the Tavily Python SDK.

    This function is intentionally private (starts with _).  Only search_web()
    should call it.  This makes it easy to swap the provider later.

    Parameters
    ----------
    query      : The search query string.
    max_results: How many results to return (1–20).
    api_key    : A valid Tavily API key.

    Returns
    -------
    list of dicts in the shared integration contract format.

    Raises
    ------
    SearchError : on network issues, timeouts, or API errors.
    """
    try:
        # Import here (not at the top of the file) so the rest of the module
        # works even if tavily-python is not installed — useful for teammates
        # who only need evidence.py or verification.py.
        from tavily import TavilyClient  # type: ignore[import]
    except ImportError as exc:
        raise SearchError(
            "tavily-python is not installed. "
            "Run: pip install -r requirements.txt",
            cause=exc,
        ) from exc

    try:
        client = TavilyClient(api_key=api_key)

        # search_depth="basic" costs 1 credit per call (free tier has 1 000/month)
        raw_response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
        )
    except Exception as exc:  # noqa: BLE001 — Tavily SDK raises generic exceptions
        # Wrap every SDK or network failure in our own clean exception.
        raise SearchError(
            f"Tavily API request failed: {exc}",
            cause=exc,
        ) from exc

    # raw_response is a dict like:
    # { "results": [ {"title": ..., "url": ..., "content": ..., ...}, ... ] }
    raw_results: list[dict] = raw_response.get("results", [])

    # Translate from Tavily's field names to our shared contract.
    # Tavily uses "content" for the snippet; we rename it.
    results: list[dict] = []
    for item in raw_results:
        result = _build_result(
            title=item.get("title", "No title"),
            url=item.get("url", ""),
            snippet=item.get("content", ""),
        )
        if result["url"]:  # skip malformed entries with no URL
            results.append(result)

    return results


# ── Mock / demo mode ──────────────────────────────────────────────────────────

def _search_mock(query: str, max_results: int) -> list[dict]:
    """
    Return deterministic fake search results for testing and demos.

    These results are completely invented and must never be presented as
    real research findings.  Every result includes MOCK_DISCLAIMER in its
    snippet so consumers can detect mock data programmatically.

    Parameters
    ----------
    query      : The query string (used only to make the output look relevant).
    max_results: How many fake results to generate.

    Returns
    -------
    list of dicts in the shared integration contract format.
    """
    # Simulate a small network delay so demos feel realistic.
    time.sleep(0.1)

    templates = [
        {
            "title":   f"[MOCK] Overview of: {query}",
            "url":     "https://example.com/mock-overview",
            "snippet": f"{MOCK_DISCLAIMER} This is a placeholder overview about '{query}'.",
        },
        {
            "title":   f"[MOCK] Research findings on {query}",
            "url":     "https://example.org/mock-research",
            "snippet": f"{MOCK_DISCLAIMER} Placeholder research findings related to '{query}'.",
        },
        {
            "title":   f"[MOCK] Expert analysis: {query}",
            "url":     "https://example.net/mock-analysis",
            "snippet": f"{MOCK_DISCLAIMER} Placeholder expert analysis about '{query}'.",
        },
        {
            "title":   f"[MOCK] Latest news about {query}",
            "url":     "https://mockdata.test/news",
            "snippet": f"{MOCK_DISCLAIMER} Placeholder news item about '{query}'.",
        },
        {
            "title":   f"[MOCK] Historical context: {query}",
            "url":     "https://mockdata.test/history",
            "snippet": f"{MOCK_DISCLAIMER} Placeholder historical background on '{query}'.",
        },
    ]

    # Return only as many as requested (up to the number we have templates for).
    return [
        _build_result(t["title"], t["url"], t["snippet"])
        for t in templates[:max_results]
    ]


# ── Public function ───────────────────────────────────────────────────────────

def search_web(query: str, max_results: int = 5) -> list[dict]:
    """
    Search the web for the given query and return structured results.

    This is the main public function of this module.  Person 1's orchestrator
    calls this to retrieve evidence for a research subtask.

    Parameters
    ----------
    query : str
        The search query.  Must be a non-empty string.
    max_results : int, optional
        Maximum number of results to return.  Must be between 1 and 20.
        Default is 5, which costs 1 Tavily credit per call.

    Returns
    -------
    list[dict]
        A list of search result dicts.  Each dict contains:
        - ``title``   (str) — page title
        - ``url``     (str) — full source URL
        - ``snippet`` (str) — short text excerpt
        - ``source``  (str) — domain of the URL

        Returns an empty list only if the API genuinely returned zero results.
        Never returns invented/hallucinated results when the API is unavailable.

    Raises
    ------
    ValueError
        If ``query`` is empty or whitespace-only, or if ``max_results`` is
        outside the range [1, 20].
    SearchError
        If the search cannot be completed for any other reason:
        missing API key, network failure, timeout, or API error.
        The error message describes the problem.  The original exception is
        stored in ``SearchError.cause`` for debugging.

    Examples
    --------
    >>> # Normal usage (requires TAVILY_API_KEY in environment):
    >>> results = search_web("climate change effects", max_results=3)
    >>> results[0].keys()
    dict_keys(['title', 'url', 'snippet', 'source'])

    >>> # Mock mode (set RESEARCH_MOCK_MODE=true in .env):
    >>> results = search_web("test query")
    >>> "[MOCK DATA" in results[0]["snippet"]
    True
    """
    # ── Input validation ─────────────────────────────────────────────────────
    if not isinstance(query, str) or not query.strip():
        raise ValueError(
            "query must be a non-empty string. "
            f"Got: {query!r}"
        )

    if not isinstance(max_results, int) or not (1 <= max_results <= _MAX_ALLOWED_RESULTS):
        raise ValueError(
            f"max_results must be an integer between 1 and {_MAX_ALLOWED_RESULTS}. "
            f"Got: {max_results!r}"
        )

    # ── Decide which mode to run in ──────────────────────────────────────────
    mock_mode_env = os.environ.get("RESEARCH_MOCK_MODE", "false").lower()
    use_mock = mock_mode_env in ("true", "1", "yes")

    if use_mock:
        # Explicitly operating in mock mode — no API call.
        return _search_mock(query, max_results)

    # ── Live mode: retrieve and validate the API key ─────────────────────────
    api_key = os.environ.get("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise SearchError(
            "TAVILY_API_KEY is not set in the environment. "
            "Options:\n"
            "  1. Copy research/.env.example to .env and add your key.\n"
            "  2. Set RESEARCH_MOCK_MODE=true in .env to use mock data instead.\n"
            "Get a free key at https://app.tavily.com"
        )

    # ── Perform the live search ───────────────────────────────────────────────
    return _search_via_tavily(query=query, max_results=max_results, api_key=api_key)
