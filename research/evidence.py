"""
research/evidence.py — Research evidence collection and persistence
===================================================================

This module converts raw search results into structured, deduplicated evidence
records, and provides save/load functionality so evidence survives between runs.

Public API
----------
    EvidenceStore              — main class; create one per research session
    EvidenceValidationError    — raised when a record has missing/bad fields

Shared data format — EvidenceRecord
------------------------------------
An evidence record is a plain Python dict with these guaranteed keys:

    {
        "evidence_id": str,   # stable unique identifier, e.g. "ev_001"
        "title":       str,   # page title
        "url":         str,   # normalized source URL (query-string stripped)
        "snippet":     str,   # text excerpt
        "source":      str,   # domain extracted from the URL
        "query":       str,   # the search query that retrieved this result
    }

Design decisions
----------------
- Deduplication is by *normalized URL* (lowercased, query-string removed).
  Two results pointing to the same page are kept as one record.
- evidence_id is generated sequentially ("ev_001", "ev_002", …) and is stable
  once assigned — it will not change if more evidence is added later.
- This module has zero imports from agent/, app.py, or any LLM library.
"""

from __future__ import annotations

import json
import os
import re
from urllib.parse import urlparse, urlunparse  # standard library URL tools


# ── Custom exception ──────────────────────────────────────────────────────────

class EvidenceValidationError(Exception):
    """
    Raised when an evidence record is missing required fields or has bad data.

    Attributes
    ----------
    message : str
        What field is missing or invalid.
    record : dict
        The offending record (useful for debugging).
    """

    def __init__(self, message: str, record: dict) -> None:
        super().__init__(message)
        self.record = record


# ── Required fields for a valid evidence record ───────────────────────────────

_REQUIRED_FIELDS: tuple[str, ...] = ("title", "url", "snippet", "source")


# ── URL normalization ─────────────────────────────────────────────────────────

def _normalize_url(url: str) -> str:
    """
    Produce a stable, canonical form of a URL used as a deduplication key.

    Normalization steps:
    1. Strip leading/trailing whitespace.
    2. Lowercase the scheme and host (``HTTPS://BBC.COM`` → ``https://bbc.com``).
    3. Remove the query string and fragment (``?page=1#section`` → removed).
    4. Remove a trailing slash from the path (``/news/`` → ``/news``).

    Parameters
    ----------
    url : str
        A raw URL string.

    Returns
    -------
    str
        The normalized URL used as a deduplication key.

    Examples
    --------
    >>> _normalize_url("HTTPS://www.BBC.com/News/?ref=home#top")
    'https://www.bbc.com/News'
    """
    url = url.strip()
    parsed = urlparse(url)

    normalized = urlunparse((
        parsed.scheme.lower(),   # https
        parsed.netloc.lower(),   # www.bbc.com
        parsed.path.rstrip("/"), # /News  (trailing slash removed)
        "",                      # params  — dropped
        "",                      # query   — dropped
        "",                      # fragment — dropped
    ))
    return normalized


def _make_evidence_id(index: int) -> str:
    """
    Generate a human-readable, zero-padded evidence ID.

    Parameters
    ----------
    index : int
        Zero-based position of the record (0 → "ev_001", 99 → "ev_100").

    Returns
    -------
    str
        A stable evidence ID string like ``"ev_042"``.
    """
    return f"ev_{index + 1:03d}"


# ── EvidenceStore class ───────────────────────────────────────────────────────

class EvidenceStore:
    """
    A collection of deduplicated evidence records for one research session.

    Usage
    -----
    ::

        store = EvidenceStore()

        # Add results from search_web()
        results = search_web("AI safety risks", max_results=5)
        store.add_from_search_results(results, query="AI safety risks")

        # Inspect what we have
        print(store.count())           # number of unique records
        print(store.all_evidence())    # list of all evidence dicts

        # Persist to disk and reload
        store.save_json("demo_output/evidence.json")
        store2 = EvidenceStore.load_json("demo_output/evidence.json")

    Deduplication
    -------------
    Records with the same normalized URL are silently ignored on insertion.
    This means you can safely call add_from_search_results() multiple times
    (e.g. for follow-up searches) without creating duplicates.
    """

    def __init__(self) -> None:
        # _records: ordered list of evidence dicts (insertion order preserved)
        self._records: list[dict] = []
        # _seen_urls: set of normalized URLs we have already stored
        self._seen_urls: set[str] = set()

    # ── Adding evidence ───────────────────────────────────────────────────────

    def add_from_search_results(
        self,
        results: list[dict],
        query: str,
    ) -> list[dict]:
        """
        Convert a list of search results into evidence records and store them.

        Only results not already present (by normalized URL) are added.

        Parameters
        ----------
        results : list[dict]
            Output from ``search_web()``.  Each dict must have at least the
            keys ``title``, ``url``, ``snippet``, and ``source``.
        query : str
            The search query that produced these results.  Stored with each
            record so we know where the evidence came from.

        Returns
        -------
        list[dict]
            The newly added evidence records (may be fewer than ``results`` if
            some were duplicates).

        Raises
        ------
        EvidenceValidationError
            If any result dict is missing a required field.
        """
        newly_added: list[dict] = []

        for result in results:
            # Validate that this result has the required fields.
            self._validate_search_result(result)

            norm_url = _normalize_url(result["url"])

            if norm_url in self._seen_urls:
                # Duplicate — skip silently.
                continue

            # Assign a stable evidence_id based on the current count.
            evidence_id = _make_evidence_id(len(self._records))

            record: dict = {
                "evidence_id": evidence_id,
                "title":       result["title"],
                "url":         result["url"],          # keep original URL
                "snippet":     result["snippet"],
                "source":      result["source"],
                "query":       query.strip(),
            }

            self._records.append(record)
            self._seen_urls.add(norm_url)
            newly_added.append(record)

        return newly_added

    def add_record(self, record: dict) -> bool:
        """
        Add a single, already-structured evidence record to the store.

        Use this when loading records built outside this class (e.g. from a
        database or a manually created dict).

        Parameters
        ----------
        record : dict
            Must contain all six evidence fields: evidence_id, title, url,
            snippet, source, query.

        Returns
        -------
        bool
            ``True`` if the record was added, ``False`` if it was a duplicate.

        Raises
        ------
        EvidenceValidationError
            If any required field is missing or empty.
        """
        self._validate_evidence_record(record)

        norm_url = _normalize_url(record["url"])
        if norm_url in self._seen_urls:
            return False  # duplicate

        self._records.append(record)
        self._seen_urls.add(norm_url)
        return True

    # ── Querying evidence ─────────────────────────────────────────────────────

    def all_evidence(self) -> list[dict]:
        """
        Return all stored evidence records.

        Returns
        -------
        list[dict]
            A copy of all evidence records in insertion order.
            Modifying the returned list does not affect the store.
        """
        # Return a shallow copy so callers cannot accidentally mutate the store.
        return list(self._records)

    def find_by_url(self, url: str) -> dict | None:
        """
        Look up an evidence record by URL (uses normalized matching).

        Parameters
        ----------
        url : str
            The URL to search for (exact or normalized form both work).

        Returns
        -------
        dict | None
            The matching evidence record, or ``None`` if not found.
        """
        norm_url = _normalize_url(url)
        for record in self._records:
            if _normalize_url(record["url"]) == norm_url:
                return record
        return None

    def find_by_id(self, evidence_id: str) -> dict | None:
        """
        Look up an evidence record by its evidence_id.

        Parameters
        ----------
        evidence_id : str
            The stable evidence ID, e.g. ``"ev_001"``.

        Returns
        -------
        dict | None
            The matching record, or ``None`` if not found.
        """
        for record in self._records:
            if record.get("evidence_id") == evidence_id:
                return record
        return None

    def count(self) -> int:
        """Return the number of unique evidence records currently stored."""
        return len(self._records)

    def all_urls(self) -> list[str]:
        """Return the original (non-normalized) URL of every stored record."""
        return [r["url"] for r in self._records]

    # ── Persistence ───────────────────────────────────────────────────────────

    def save_json(self, filepath: str) -> None:
        """
        Serialize all evidence records to a JSON file.

        Creates any missing parent directories automatically.

        Parameters
        ----------
        filepath : str
            Destination path, e.g. ``"demo_output/evidence.json"``.

        Raises
        ------
        OSError
            If the file cannot be written (e.g. permission denied).
        """
        directory = os.path.dirname(filepath)
        if directory:
            os.makedirs(directory, exist_ok=True)

        payload = {
            "record_count": self.count(),
            "records":      self._records,
        }

        with open(filepath, "w", encoding="utf-8") as fh:
            # indent=2 makes the JSON human-readable
            json.dump(payload, fh, indent=2, ensure_ascii=False)

    @classmethod
    def load_json(cls, filepath: str) -> "EvidenceStore":
        """
        Load evidence records from a previously saved JSON file.

        Parameters
        ----------
        filepath : str
            Path to a JSON file written by ``save_json()``.

        Returns
        -------
        EvidenceStore
            A new store populated with the loaded records.

        Raises
        ------
        FileNotFoundError
            If ``filepath`` does not exist.
        EvidenceValidationError
            If any record in the file is missing required fields.
        json.JSONDecodeError
            If the file is not valid JSON.
        """
        with open(filepath, encoding="utf-8") as fh:
            payload = json.load(fh)

        store = cls()  # create an empty store
        for record in payload.get("records", []):
            store.add_record(record)  # validates each record on the way in

        return store

    # ── Validation helpers (private) ──────────────────────────────────────────

    def _validate_search_result(self, result: dict) -> None:
        """
        Check that a search result dict has all required fields.

        Raises EvidenceValidationError if anything is missing.
        """
        for field in _REQUIRED_FIELDS:
            if field not in result:
                raise EvidenceValidationError(
                    f"Search result is missing required field '{field}'. "
                    f"Expected fields: {_REQUIRED_FIELDS}.",
                    record=result,
                )
            if not isinstance(result[field], str):
                raise EvidenceValidationError(
                    f"Field '{field}' must be a string; got {type(result[field]).__name__}.",
                    record=result,
                )

    def _validate_evidence_record(self, record: dict) -> None:
        """
        Check that a full evidence record has all six required fields.

        Raises EvidenceValidationError if anything is missing.
        """
        required = (*_REQUIRED_FIELDS, "evidence_id", "query")
        for field in required:
            if field not in record:
                raise EvidenceValidationError(
                    f"Evidence record is missing required field '{field}'. "
                    f"Expected fields: {required}.",
                    record=record,
                )
