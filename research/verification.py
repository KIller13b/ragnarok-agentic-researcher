"""
research/verification.py — Evidence and citation quality checks
===============================================================

This module provides *heuristic, preliminary* checks on evidence and claims.
It does NOT:
  - Determine whether a source is trustworthy or authoritative.
  - Prove or disprove any statement.
  - Replace human or LLM-based fact-checking.

Every check returns a VerificationResult with an explicit ``status`` and a
``reason`` that honestly describes what was (and was not) checked.

Public API
----------
    VerificationResult           — named structure for one check's outcome
    verify_citations(urls, evidence_list) -> list[VerificationResult]
    flag_uncited_claims(claims, evidence_list) -> list[VerificationResult]
    find_duplicate_urls(evidence_list) -> list[VerificationResult]
    find_conflicting_claims(claim_pairs, evidence_list) -> list[VerificationResult]

Status codes
------------
    "ok"          — the check passed with no issues.
    "warning"     — a potential issue was found; human review recommended.
    "missing"     — a required piece of evidence or citation is absent.
    "heuristic"   — result is based on approximate matching; may be wrong.

Design notes
------------
- No LLM calls, no network requests, no imports from agent/ or app.py.
- Conflict detection uses keyword overlap as a *preliminary signal only*.
  It cannot determine whether two claims genuinely contradict each other.
  If LLM-based semantic evaluation is added later, replace the body of
  _heuristic_conflict_check() without changing the public function signature.
- The caller supplies both evidence and claims as plain Python objects.
  This module has no side effects: it reads data, never modifies it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlparse, urlunparse


# ── VerificationResult data class ────────────────────────────────────────────

@dataclass
class VerificationResult:
    """
    The structured outcome of a single verification check.

    Attributes
    ----------
    check_type : str
        Which check produced this result, e.g. ``"citation_check"``.
    status : str
        One of: ``"ok"``, ``"warning"``, ``"missing"``, ``"heuristic"``.
    subject : str
        The item that was checked (a URL, a claim text, etc.).
    reason : str
        Plain-English explanation of why this status was assigned.
    supporting_evidence_ids : list[str]
        evidence_id values of records related to this result.
        Empty list if no evidence is relevant.
    """

    check_type: str
    status: str
    subject: str
    reason: str
    supporting_evidence_ids: list[str] = field(default_factory=list)


# ── Internal URL normalization (duplicated from evidence.py intentionally) ────
# We duplicate this small helper rather than importing from evidence.py to keep
# verification.py independently importable and to avoid circular imports.

def _normalize_url(url: str) -> str:
    """Return a normalized URL for comparison (lowercase, no query/fragment)."""
    url = url.strip()
    parsed = urlparse(url)
    return urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        parsed.path.rstrip("/"),
        "", "", "",
    ))


# ── Helper: build a URL-to-evidence-id index ─────────────────────────────────

def _build_url_index(evidence_list: list[dict]) -> dict[str, str]:
    """
    Build a mapping from normalized URL to evidence_id.

    Parameters
    ----------
    evidence_list : list[dict]
        A list of evidence records (from EvidenceStore.all_evidence()).

    Returns
    -------
    dict[str, str]
        ``{normalized_url: evidence_id}``
    """
    index: dict[str, str] = {}
    for record in evidence_list:
        url = record.get("url", "")
        ev_id = record.get("evidence_id", "")
        if url and ev_id:
            index[_normalize_url(url)] = ev_id
    return index


# ── Public verification functions ─────────────────────────────────────────────

def verify_citations(
    cited_urls: list[str],
    evidence_list: list[dict],
) -> list[VerificationResult]:
    """
    Check whether each URL cited in a report exists in the collected evidence.

    This function answers: "Did we actually find this URL during research,
    or did it appear in the report without being searched?"

    ⚠️ LIMITATION: Finding a URL in the evidence only means it was returned
    by the search engine.  It does NOT mean the source is authoritative,
    accurate, or that it actually supports the claim it was cited for.

    Parameters
    ----------
    cited_urls : list[str]
        URLs referenced in the draft report.
    evidence_list : list[dict]
        All evidence records from EvidenceStore.all_evidence().

    Returns
    -------
    list[VerificationResult]
        One result per cited URL.
        - status "ok"      → URL found in evidence.
        - status "missing" → URL not found in evidence.
    """
    url_index = _build_url_index(evidence_list)
    results: list[VerificationResult] = []

    for url in cited_urls:
        norm = _normalize_url(url)
        if norm in url_index:
            ev_id = url_index[norm]
            results.append(VerificationResult(
                check_type="citation_check",
                status="ok",
                subject=url,
                reason=(
                    f"URL found in evidence as {ev_id}. "
                    "Note: presence in evidence does not verify the source's "
                    "accuracy or authority."
                ),
                supporting_evidence_ids=[ev_id],
            ))
        else:
            results.append(VerificationResult(
                check_type="citation_check",
                status="missing",
                subject=url,
                reason=(
                    "URL not found in collected evidence. "
                    "This citation may have been added to the report without "
                    "being retrieved during the research phase."
                ),
                supporting_evidence_ids=[],
            ))

    return results


def flag_uncited_claims(
    claims: list[str],
    evidence_list: list[dict],
) -> list[VerificationResult]:
    """
    Flag claims that have no keyword overlap with any evidence snippet.

    ⚠️ IMPORTANT LIMITATION: This is a *keyword heuristic*, not semantic
    analysis.  A claim may be well-supported by evidence even if the exact
    words do not appear in snippets (e.g., paraphrasing).  Equally, a claim
    may share keywords with a snippet but not actually be supported by it.
    The ``"heuristic"`` status signals that human review is needed.

    Parameters
    ----------
    claims : list[str]
        Short claim statements to check, e.g.:
        ``["Renewable energy is growing rapidly", "AI reduces costs by 40%"]``
    evidence_list : list[dict]
        All evidence records from EvidenceStore.all_evidence().

    Returns
    -------
    list[VerificationResult]
        One result per claim.
        - status "ok"        → at least one evidence snippet shares keywords.
        - status "heuristic" → weak keyword match found (marginal overlap).
        - status "missing"   → no keyword overlap found with any evidence.
    """
    # Combine all snippets + titles into one searchable corpus.
    corpus: list[tuple[str, str]] = [  # (evidence_id, text)
        (r.get("evidence_id", ""), f"{r.get('title', '')} {r.get('snippet', '')}")
        for r in evidence_list
    ]

    results: list[VerificationResult] = []

    for claim in claims:
        claim_keywords = _extract_keywords(claim)

        if not claim_keywords:
            results.append(VerificationResult(
                check_type="uncited_claim_check",
                status="warning",
                subject=claim,
                reason="Claim is too short or contains no meaningful keywords to check.",
                supporting_evidence_ids=[],
            ))
            continue

        matched_ids: list[str] = []
        weak_ids: list[str] = []

        for ev_id, text in corpus:
            text_keywords = _extract_keywords(text)
            overlap = claim_keywords & text_keywords
            overlap_ratio = len(overlap) / len(claim_keywords) if claim_keywords else 0

            if overlap_ratio >= 0.5:
                matched_ids.append(ev_id)
            elif overlap_ratio >= 0.2:
                weak_ids.append(ev_id)

        if matched_ids:
            results.append(VerificationResult(
                check_type="uncited_claim_check",
                status="ok",
                subject=claim,
                reason=(
                    f"Keywords overlap with {len(matched_ids)} evidence record(s). "
                    "⚠️ Keyword match does not confirm the claim is accurate."
                ),
                supporting_evidence_ids=matched_ids,
            ))
        elif weak_ids:
            results.append(VerificationResult(
                check_type="uncited_claim_check",
                status="heuristic",
                subject=claim,
                reason=(
                    f"Weak keyword overlap with {len(weak_ids)} evidence record(s). "
                    "This is a preliminary signal only — manual review needed."
                ),
                supporting_evidence_ids=weak_ids,
            ))
        else:
            results.append(VerificationResult(
                check_type="uncited_claim_check",
                status="missing",
                subject=claim,
                reason=(
                    "No keyword overlap found between this claim and any "
                    "evidence snippet. The claim may be unsupported, or the "
                    "relevant evidence may have been paraphrased in a way that "
                    "keyword matching cannot detect."
                ),
                supporting_evidence_ids=[],
            ))

    return results


def find_duplicate_urls(
    evidence_list: list[dict],
) -> list[VerificationResult]:
    """
    Identify evidence records that share the same normalized URL.

    Duplicates can occur when the same page is returned by different search
    queries or when URL variants (with/without trailing slash, query strings)
    point to the same resource.

    Parameters
    ----------
    evidence_list : list[dict]
        All evidence records from EvidenceStore.all_evidence().

    Returns
    -------
    list[VerificationResult]
        One result per duplicated URL (not per individual record).
        - status "warning" → two or more records share a normalized URL.
        - Returns an empty list if no duplicates are found.
    """
    # Group evidence_ids by normalized URL.
    url_to_ids: dict[str, list[str]] = {}
    for record in evidence_list:
        url = record.get("url", "")
        ev_id = record.get("evidence_id", "")
        if not url:
            continue
        norm = _normalize_url(url)
        url_to_ids.setdefault(norm, []).append(ev_id)

    results: list[VerificationResult] = []
    for norm_url, ids in url_to_ids.items():
        if len(ids) > 1:
            results.append(VerificationResult(
                check_type="duplicate_url_check",
                status="warning",
                subject=norm_url,
                reason=(
                    f"Normalized URL appears in {len(ids)} evidence record(s): "
                    f"{', '.join(ids)}. "
                    "These records likely describe the same source and could be merged."
                ),
                supporting_evidence_ids=ids,
            ))

    return results


def find_conflicting_claims(
    claim_pairs: list[tuple[str, str]],
    evidence_list: list[dict],
) -> list[VerificationResult]:
    """
    Apply a preliminary heuristic to flag claim pairs that may conflict.

    ⚠️ CRITICAL LIMITATION: This function uses keyword overlap to decide
    whether two claims concern the same topic.  It cannot determine whether
    the claims actually *contradict* each other.  Semantic contradiction
    detection requires a language model or expert review.  Results with
    status ``"heuristic"`` must be treated as *unverified signals*, not
    confirmed conflicts.

    Extension point: When LLM integration is added, replace the body of
    _heuristic_conflict_check() to call the LLM and return a richer result.
    The public function signature can remain unchanged.

    Parameters
    ----------
    claim_pairs : list[tuple[str, str]]
        Each tuple is (claim_A, claim_B).  The caller asserts these two claims
        are about the same topic and wants to know if they conflict.
    evidence_list : list[dict]
        All evidence records from EvidenceStore.all_evidence().
        Used to find which records are relevant to each claim.

    Returns
    -------
    list[VerificationResult]
        One result per pair.
        - status "heuristic" → keyword overlap suggests a potential conflict;
                               human or LLM review strongly recommended.
        - status "ok"        → low keyword overlap; claims may be about
                               different topics (but this is not guaranteed).
        - status "warning"   → one or both claims are too short to evaluate.
    """
    results: list[VerificationResult] = []

    for claim_a, claim_b in claim_pairs:
        result = _heuristic_conflict_check(claim_a, claim_b, evidence_list)
        results.append(result)

    return results


# ── Private helpers ───────────────────────────────────────────────────────────

def _extract_keywords(text: str) -> set[str]:
    """
    Extract a set of lowercase content words (length ≥ 4) from text.

    Short words and common stopwords are excluded to reduce false matches.
    This is a simple bag-of-words approach — not NLP.

    Parameters
    ----------
    text : str
        Any string.

    Returns
    -------
    set[str]
        Lowercase content words.
    """
    # Common English stopwords we want to ignore.
    _STOPWORDS: frozenset[str] = frozenset({
        "this", "that", "with", "from", "have", "will", "been",
        "they", "their", "there", "when", "were", "also", "some",
        "more", "than", "into", "about", "after", "before", "which",
        "what", "could", "would", "should", "does", "then", "them",
        "these", "those", "such", "each", "many", "much", "very",
        "most", "just", "like", "only", "both", "over", "under",
    })

    # Split on anything that is not a letter or digit.
    tokens = re.findall(r"[a-zA-Z]+", text.lower())

    # Keep words that are at least 4 characters and not stopwords.
    return {t for t in tokens if len(t) >= 4 and t not in _STOPWORDS}


def _heuristic_conflict_check(
    claim_a: str,
    claim_b: str,
    evidence_list: list[dict],
) -> VerificationResult:
    """
    Preliminary heuristic conflict check for a single claim pair.

    Returns a VerificationResult describing the outcome.

    EXTENSION POINT: replace the body of this function with an LLM call when
    one is available.  The signature and the VerificationResult structure must
    stay the same.
    """
    subject = f'"{claim_a[:60]}…" vs "{claim_b[:60]}…"'

    kw_a = _extract_keywords(claim_a)
    kw_b = _extract_keywords(claim_b)

    if not kw_a or not kw_b:
        return VerificationResult(
            check_type="conflict_check",
            status="warning",
            subject=subject,
            reason=(
                "One or both claims are too short or contain no meaningful "
                "keywords. Cannot apply heuristic conflict check."
            ),
        )

    # Jaccard similarity: how much do the keyword sets overlap?
    # High overlap → claims are likely about the same topic.
    union = kw_a | kw_b
    intersection = kw_a & kw_b
    jaccard = len(intersection) / len(union) if union else 0.0

    # Find evidence relevant to either claim.
    relevant_ids: list[str] = []
    for record in evidence_list:
        text = f"{record.get('title', '')} {record.get('snippet', '')}"
        text_kw = _extract_keywords(text)
        if text_kw & (kw_a | kw_b):
            ev_id = record.get("evidence_id", "")
            if ev_id:
                relevant_ids.append(ev_id)

    # Threshold: if more than 30 % of keywords overlap, flag as potential conflict.
    if jaccard >= 0.30:
        return VerificationResult(
            check_type="conflict_check",
            status="heuristic",
            subject=subject,
            reason=(
                f"Keyword similarity ({jaccard:.0%}) suggests these claims may "
                "concern the same topic. They could be conflicting, but "
                "⚠️ this heuristic CANNOT determine whether they actually "
                "contradict each other. A language model or human reviewer "
                "is needed for a reliable conclusion."
            ),
            supporting_evidence_ids=relevant_ids[:5],  # cap at 5 for readability
        )
    else:
        return VerificationResult(
            check_type="conflict_check",
            status="ok",
            subject=subject,
            reason=(
                f"Low keyword similarity ({jaccard:.0%}). Claims appear to concern "
                "different topics based on this heuristic. Note: this does not "
                "guarantee they are compatible."
            ),
            supporting_evidence_ids=relevant_ids[:5],
        )
