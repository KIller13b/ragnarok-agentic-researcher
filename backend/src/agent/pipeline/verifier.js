/**
 * PHASE 4b — CITATION VERIFICATION (hallucination audit, part 1)
 *
 * A mechanical, LLM-free audit of the finished report. Because citations are
 * injected by us (never authored by the model), every marker is *structurally*
 * grounded — this pass proves it and enforces three invariants:
 *
 *   1. every `[n]` in the body resolves to a reference,
 *   2. every reference resolves to an Evidence document of this session,
 *   3. every section carries at least one citation.
 *
 * Anything violating an invariant is stripped or flagged `needs_review`
 * rather than silently shipped.
 */

const { extractCitationIndexes, stripCitations } = require('../lib/citations');

/**
 * Pure function — safe to unit test with no database.
 *
 * @param {object} params
 * @param {string} params.markdown
 * @param {Array<{heading: string, content: string, citationIndexes?: number[]}>} params.sections
 * @param {Array<{index: number, evidenceId: string, title: string, url: string}>} params.references
 * @param {Set<string>|string[]} params.validEvidenceIds Evidence ids owned by this session.
 * @returns {{markdown: string, verificationStatus: 'verified'|'needs_review', issues: string[], citationCoverage: number}}
 */
const verifyCitations = ({ markdown, sections = [], references = [], validEvidenceIds = [] }) => {
  const validIds = new Set((validEvidenceIds instanceof Set ? [...validEvidenceIds] : validEvidenceIds).map(String));
  const issues = [];

  // ── Invariant 2: references must resolve to real session evidence ───────
  const usableIndexes = new Set();
  references.forEach((reference) => {
    if (reference && reference.evidenceId && validIds.has(String(reference.evidenceId))) {
      usableIndexes.add(Number(reference.index));
    } else {
      issues.push(`Reference [${reference?.index}] does not resolve to evidence in this session.`);
    }
  });

  // ── Invariant 1: no dangling markers in the body ────────────────────────
  let output = String(markdown || '');
  const bodyCitations = extractCitationIndexes(output);
  const dangling = bodyCitations.filter((index) => !usableIndexes.has(index));

  if (dangling.length > 0) {
    issues.push(`Removed dangling citation(s): ${dangling.map((i) => `[${i}]`).join(', ')}.`);
    output = stripCitations(output, dangling);
    output = output
      .replace(/\n## References[\s\S]*$/, '\n')
      .replace(/\[\d+\] .*— https?:\/\/\S+/g, (line) =>
        dangling.some((index) => line.startsWith(`[${index}] `)) ? '' : line
      );
  }

  // ── Invariant 3: every section must be cited ────────────────────────────
  const citedSections = sections.filter(
    (section) => (section.citationIndexes || []).some((index) => usableIndexes.has(Number(index)))
  ).length;

  const uncited = sections.length - citedSections;
  if (sections.length > 0 && uncited > 0) {
    issues.push(`${uncited} section(s) contain no verifiable citation.`);
  }

  const citationCoverage = sections.length ? Number((citedSections / sections.length).toFixed(2)) : 0;
  const verificationStatus = issues.length === 0 ? 'verified' : 'needs_review';

  return { markdown: output, verificationStatus, issues, citationCoverage };
};

module.exports = { verifyCitations };
