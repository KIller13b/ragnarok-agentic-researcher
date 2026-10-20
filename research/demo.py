"""
research/demo.py - Standalone demo for the Research and Evidence module
=======================================================================

Run this file directly to test the full research pipeline:

    python research/demo.py

What the demo does
------------------
1. Asks you for a research question (or uses a default for quick testing).
2. Searches the web — or switches to mock mode if TAVILY_API_KEY is not set.
3. Displays every result's title, URL, and snippet.
4. Stores the results in an EvidenceStore.
5. Runs all three verification checks.
6. Prints a readable summary of every check result.
7. Saves the evidence to demo_output/evidence_<timestamp>.json.

This demo does NOT:
- Import or use Streamlit (Person 3's responsibility).
- Import agent/ planner, orchestrator, or report modules (Person 1).
- Run an autonomous multi-step research loop.
- Present mock data as real research findings.

Usage
-----
    # With a real API key (recommended for live demo):
    #   Set TAVILY_API_KEY in research/.env first
    python research/demo.py

    # Without an API key (mock mode):
    #   Set RESEARCH_MOCK_MODE=true in research/.env
    python research/demo.py
"""

from __future__ import annotations

import io
import json
import os
import sys
import textwrap
from datetime import datetime

# Fix Windows console so it can print unicode characters.
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf-8-sig"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Make sure the package root is in sys.path so we can import `research` ────
# This lets you run `python research/demo.py` from the repo root.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

# Load .env before importing the research package (the package also loads it,
# but being explicit here makes the demo self-contained).
from dotenv import load_dotenv

_ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_ENV_FILE):
    load_dotenv(_ENV_FILE)
    print(f"[Demo] Loaded environment from {_ENV_FILE}")
else:
    # Fall back to the repo-root .env if research/.env doesn't exist.
    load_dotenv()

from research.search import search_web, SearchError, MOCK_DISCLAIMER
from research.evidence import EvidenceStore
from research.verification import (
    verify_citations,
    flag_uncited_claims,
    find_duplicate_urls,
    find_conflicting_claims,
)


# ── Terminal colour helpers (works on Windows 10+ and all POSIX terminals) ───

def _color(text: str, code: str) -> str:
    """Wrap text in an ANSI colour escape if the terminal supports it."""
    if sys.stdout.isatty() or os.environ.get("FORCE_COLOR"):
        return f"\033[{code}m{text}\033[0m"
    return text


def green(text: str) -> str:
    return _color(text, "92")


def yellow(text: str) -> str:
    return _color(text, "93")


def red(text: str) -> str:
    return _color(text, "91")


def cyan(text: str) -> str:
    return _color(text, "96")


def bold(text: str) -> str:
    return _color(text, "1")


# ── Demo helpers ──────────────────────────────────────────────────────────────

def _separator(char: str = "-", width: int = 72) -> None:
    print(char * width)


def _print_result(index: int, result: dict) -> None:
    """Print one search result in a human-readable block."""
    print(f"\n  {bold(f'Result {index + 1}')}")
    print(f"  {cyan('Title:')}   {result['title']}")
    print(f"  {cyan('URL:')}     {result['url']}")
    print(f"  {cyan('Source:')}  {result['source']}")
    # Wrap the snippet at 65 chars and indent it.
    wrapped = textwrap.fill(result["snippet"], width=65, initial_indent="  ", subsequent_indent="  ")
    print(f"  {cyan('Snippet:')}\n{wrapped}")


def _status_color(status: str) -> str:
    colors = {
        "ok":        green,
        "warning":   yellow,
        "missing":   red,
        "heuristic": yellow,
    }
    fn = colors.get(status, str)
    return fn(status.upper())


def _print_verification_results(title: str, results: list) -> None:
    """Print a block of VerificationResults with clear status indicators."""
    print(f"\n{bold(title)}")
    _separator()
    if not results:
        print(green("  ✓ No issues found."))
        return
    for vr in results:
        icon = {"ok": "✓", "warning": "⚠", "missing": "✗", "heuristic": "~"}.get(vr.status, "?")
        status_str = _status_color(vr.status)
        print(f"\n  [{icon}] {status_str}")
        print(f"      Subject: {vr.subject[:80]}")
        wrapped_reason = textwrap.fill(
            vr.reason, width=65, initial_indent="      ", subsequent_indent="      "
        )
        print(f"      Reason:  \n{wrapped_reason}")
        if vr.supporting_evidence_ids:
            print(f"      Evidence: {', '.join(vr.supporting_evidence_ids)}")


# ── Main demo flow ────────────────────────────────────────────────────────────

def run_demo() -> None:
    """Execute the full research module demo."""
    print()
    _separator("=")
    print(bold("  Research & Evidence Module - Standalone Demo"))
    print("  Role 2: Research and Evidence  |  Ragnarok Autonomous Research Agent")
    _separator("=")

    # ── Step 0: Detect mode ───────────────────────────────────────────────────
    api_key = os.environ.get("TAVILY_API_KEY", "").strip()
    mock_env = os.environ.get("RESEARCH_MOCK_MODE", "false").lower()
    use_mock = mock_env in ("true", "1", "yes") or not api_key

    if use_mock:
        print(yellow("\n⚠  MOCK MODE ACTIVE"))
        print(yellow("   Results below are INVENTED PLACEHOLDERS — not real web searches."))
        print(yellow("   To enable live search: add TAVILY_API_KEY to research/.env"))
        if not api_key:
            print(yellow("   (No TAVILY_API_KEY found in environment.)"))
        # Switch to mock mode for the search call.
        os.environ["RESEARCH_MOCK_MODE"] = "true"
    else:
        print(green("\n✓  LIVE SEARCH MODE ACTIVE (Tavily API)"))

    # ── Step 1: Ask for a research question ──────────────────────────────────
    print()
    _separator()
    print(bold("STEP 1 — Enter your research question"))
    _separator()
    print("  Press Enter without typing anything to use the default question.")
    print()

    try:
        user_input = input("  Your question: ").strip()
    except (EOFError, KeyboardInterrupt):
        user_input = ""

    query = user_input or "What are the main risks and benefits of artificial intelligence?"

    if not user_input:
        print(f"  (Using default: {cyan(query)})")

    # ── Step 2: Perform the search ───────────────────────────────────────────
    print()
    _separator()
    print(bold("STEP 2 — Searching the web"))
    _separator()
    print(f"  Query:       {cyan(query)}")
    print(f"  Max results: 5")
    print()

    search_results: list[dict] = []
    search_failed = False

    try:
        search_results = search_web(query, max_results=5)
        count = len(search_results)
        if use_mock:
            print(yellow(f"  [MOCK] Returned {count} placeholder result(s)."))
        else:
            print(green(f"  ✓ Returned {count} live result(s) from Tavily."))
    except SearchError as exc:
        search_failed = True
        print(red(f"\n  ✗ Search failed: {exc}"))
        if exc.cause:
            print(red(f"    Underlying error: {exc.cause}"))
        print(yellow("\n  → The demo will continue with an empty evidence store."))
        print(yellow("    Fix the error above and re-run to see real results."))
    except ValueError as exc:
        search_failed = True
        print(red(f"\n  ✗ Invalid input: {exc}"))

    # ── Step 3: Display results ───────────────────────────────────────────────
    if search_results:
        print()
        _separator()
        print(bold("STEP 3 — Search results"))
        _separator()
        for i, result in enumerate(search_results):
            _print_result(i, result)

    # ── Step 4: Collect evidence ──────────────────────────────────────────────
    print()
    _separator()
    print(bold("STEP 4 — Collecting evidence"))
    _separator()

    store = EvidenceStore()
    if search_results:
        added = store.add_from_search_results(search_results, query=query)
        print(f"  ✓ Added {len(added)} unique evidence record(s).")
        print(f"  ✓ Store now contains {store.count()} record(s).")
        if len(added) < len(search_results):
            dup_count = len(search_results) - len(added)
            print(yellow(f"  ⚠ {dup_count} duplicate(s) skipped."))
    else:
        print(yellow("  No search results to collect."))

    # ── Step 5: Verification checks ──────────────────────────────────────────
    print()
    _separator()
    print(bold("STEP 5 — Running verification checks"))
    _separator()

    evidence = store.all_evidence()

    # 5a: Citation check — pretend the report cites the first two URLs.
    cited_urls: list[str] = []
    if evidence:
        cited_urls = [evidence[0]["url"]]  # one valid citation

    # Add a fictional URL to demonstrate a "missing" result.
    cited_urls.append("https://completely-fictional-url-not-in-evidence.example/")

    citation_results = verify_citations(cited_urls, evidence)
    _print_verification_results("5a — Citation Check", citation_results)

    # 5b: Uncited claims check.
    sample_claims = [
        f"Research about '{query}' shows significant findings.",
        "Quantum computing will solve all computational problems by 2030.",
        "The moon is made of cheese.",
    ]
    uncited_results = flag_uncited_claims(sample_claims, evidence)
    _print_verification_results("5b — Uncited Claims Check", uncited_results)

    # 5c: Duplicate URL check.
    dup_results = find_duplicate_urls(evidence)
    _print_verification_results("5c — Duplicate URL Check", dup_results)

    # 5d: Conflict check — demonstrate with example claim pairs.
    claim_pairs = [
        (
            f"Artificial intelligence poses significant risks to society.",
            f"Artificial intelligence brings major benefits and opportunities.",
        ),
        (
            "The Earth is flat.",
            "Quantum physics is a branch of mathematics.",
        ),
    ]
    conflict_results = find_conflicting_claims(claim_pairs, evidence)
    _print_verification_results("5d — Conflict Detection (Heuristic)", conflict_results)

    # ── Step 6: Save evidence ─────────────────────────────────────────────────
    print()
    _separator()
    print(bold("STEP 6 — Saving evidence to JSON"))
    _separator()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = os.path.join(_REPO_ROOT, "demo_output")
    output_file = os.path.join(output_dir, f"evidence_{timestamp}.json")

    if store.count() > 0:
        try:
            store.save_json(output_file)
            print(green(f"  ✓ Evidence saved to: {output_file}"))

            # Demonstrate load-back.
            reloaded = EvidenceStore.load_json(output_file)
            print(green(f"  ✓ Reloaded {reloaded.count()} record(s) — JSON round-trip verified."))
        except OSError as exc:
            print(red(f"  ✗ Could not save evidence: {exc}"))
    else:
        print(yellow("  No evidence to save (search produced no results)."))

    # ── Final summary ─────────────────────────────────────────────────────────
    print()
    _separator("=")
    print(bold("  DEMO COMPLETE"))
    _separator("=")
    print(f"  Mode:     {'MOCK (not real data)' if use_mock else 'LIVE'}")
    print(f"  Query:    {query[:60]}")
    print(f"  Evidence: {store.count()} record(s)")
    if store.count() > 0:
        print(f"  Saved to: {output_file}")
    if search_failed:
        print(red("  ✗ Search step failed — see errors above."))
    print()

    if use_mock:
        print(yellow(f"  {MOCK_DISCLAIMER}"))
        print()


if __name__ == "__main__":
    run_demo()
