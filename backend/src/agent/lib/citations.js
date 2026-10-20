/**
 * Citation utilities.
 *
 * Design decision that protects the "zero hallucination" claim:
 * the LLM NEVER writes `[n]` markers itself. It returns which evidence
 * indexes back each statement, and WE inject the markers deterministically.
 * A citation in the final report can therefore only ever point at a real
 * evidence document — the model has no opportunity to invent `[7]`.
 */

const CITE_RE = /\[(\d{1,3})\]/g;

/** All citation indexes present in a piece of text, ascending & unique. */
const extractCitationIndexes = (text) => {
  const found = new Set();
  let match;
  while ((match = CITE_RE.exec(String(text || ''))) !== null) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
};

/** Append grounded citation markers to a section body. */
const injectCitations = (content, indexes) => {
  const unique = [...new Set((indexes || []).map(Number).filter(Number.isFinite))].sort(
    (a, b) => a - b
  );
  const base = String(content || '').trim();
  if (unique.length === 0) return base;
  return `${base} ${unique.map((index) => `[${index}]`).join(' ')}`;
};

/** Remove specific citation markers from a string (used when stripping dangling refs). */
const stripCitations = (text, indexes) => {
  let output = String(text || '');
  (indexes || []).forEach((index) => {
    output = output.replace(new RegExp(`\\s*\\[${index}\\]`, 'g'), '');
  });
  return output.trim();
};

/**
 * Render the complete Markdown report shown to the user (and copy/exported
 * from the dashboard).
 */
const buildMarkdown = ({
  title,
  generatedAt,
  executiveSummary,
  sections = [],
  conflicts = [],
  limitations = [],
  recommendation,
  confidenceScore,
  references = [],
}) => {
  const lines = [];

  lines.push(`# ${title || 'Research Report'}`);
  lines.push('');
  lines.push(`> Generated autonomously · ${new Date(generatedAt || Date.now()).toISOString()} · Confidence ${Math.round((confidenceScore || 0) * 100)}%`);
  lines.push('');

  if (executiveSummary) {
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(executiveSummary);
    lines.push('');
  }

  sections.forEach((section) => {
    lines.push(`## ${section.heading}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');
  });

  if (conflicts.length > 0) {
    lines.push('## Conflicting Claims Detected');
    lines.push('');
    conflicts.forEach((conflict) => {
      lines.push(`- **${conflict.claim}** — ${conflict.description}`);
    });
    lines.push('');
  }

  if (limitations.length > 0) {
    lines.push('## Limitations');
    lines.push('');
    limitations.forEach((limitation) => lines.push(`- ${limitation}`));
    lines.push('');
  }

  if (recommendation) {
    lines.push('## Recommendation');
    lines.push('');
    lines.push(recommendation);
    lines.push('');
  }

  if (references.length > 0) {
    lines.push('## References');
    lines.push('');
    references.forEach((reference) => {
      lines.push(`[${reference.index}] ${reference.title} — ${reference.url}`);
    });
    lines.push('');
  }

  return lines.join('\n').trim();
};

module.exports = { extractCitationIndexes, injectCitations, stripCitations, buildMarkdown };
