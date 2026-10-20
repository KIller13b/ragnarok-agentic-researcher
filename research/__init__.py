"""
research package — Role 2: Research and Evidence
=================================================
This package provides three independent, testable modules:

    search.py        — live web search via Tavily (or mock mode)
    evidence.py      — evidence collection, deduplication, and persistence
    verification.py  — citation checks, claim flagging, conflict detection

Public integration contract
---------------------------
Person 1 (orchestrator) and Person 3 (UI) should import only the names
exported here. Internal helpers inside each module are not part of the
public contract and may change.

Example usage by Person 1::

    from research import search_web, EvidenceStore, verify_citations

    results = search_web("AI safety risks", max_results=5)
    store   = EvidenceStore()
    store.add_from_search_results(results, query="AI safety risks")
    report  = verify_citations(["https://example.com"], store.all_evidence())
"""

# Load .env automatically when the package is imported so callers do not need
# to call load_dotenv() themselves.
from dotenv import load_dotenv as _load_dotenv

_load_dotenv()  # reads the nearest .env file up the directory tree

# Re-export the public API so teammates can write:
#   from research import search_web
# instead of:
#   from research.search import search_web
from research.search import search_web, SearchError, MOCK_DISCLAIMER
from research.evidence import EvidenceStore, EvidenceValidationError
from research.verification import (
    verify_citations,
    flag_uncited_claims,
    find_duplicate_urls,
    find_conflicting_claims,
    VerificationResult,
)

__all__ = [
    # search
    "search_web",
    "SearchError",
    "MOCK_DISCLAIMER",
    # evidence
    "EvidenceStore",
    "EvidenceValidationError",
    # verification
    "verify_citations",
    "flag_uncited_claims",
    "find_duplicate_urls",
    "find_conflicting_claims",
    "VerificationResult",
]
