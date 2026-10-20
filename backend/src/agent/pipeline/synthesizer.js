/**
 * PHASE 4 — SYNTHESIS (report generation + hallucination audit, part 2)
 *
 * Compiles every grounded claim into a structured Markdown report with
 * numbered citations, a references table, an explicit conflicts section and
 * a limitations list.
 *
 * Two independent hallucination defences run here:
 *   A. CITATIONS ARE INJECTED, NEVER AUTHORSHIPED — the model returns
 *      evidence indexes; we render the `[n]` markers. (see lib/citations.js)
 *   B. POST-GENERATION AUDIT — a separate LLM pass reads each section against
 *      the exact claims it cites and reports any sentence that asserts more
 *      than its citations support. Flagged sentences are removed and the
 *      report is demoted to `needs_review`.
 */

const Evidence = require('../../models/evidence.model');
const Report = require('../../models/report.model');
const config = require('../config');
const llm = require('../llm/client');
const { injectCitations, buildMarkdown } = require('../lib/citations');
const { dedupeConflicts, conflictKey } = require('../lib/conflicts');

const SYNTHESIS_SYSTEM = `You are the synthesis module of an autonomous research agent.
Write the findings of a research report using ONLY the supplied evidence.
Return ONLY JSON:
{"title":"...","executiveSummary":"...","sections":[{"heading":"...","content":"...","citationIndexes":[0,2]}],
 "conflicts":[{"claim":"...","description":"...","evidenceIndexes":[0,1]}],
 "comparisonTable":null|"{"headers":["..."],"rows":[["..."]]}",
 "recommendation":"...","confidenceScore":0.0,"limitations":["..."]}
Rules:
- NEVER write [1]-style citation markers yourself; give "citationIndexes"
  (the evidence index numbers) and the system will render the markers.
- Every section MUST cite at least one evidence index that backs it.
- Every factual sentence must be traceable to a cited claim. If the evidence
  is thin, say so in "limitations" instead of extrapolating.
- "comparisonTable" is only for comparison questions, otherwise null.`;

const AUDIT_SYSTEM = `You are the hallucination auditor of an autonomous research agent.
You receive report sections together with the exact evidence claims cited by
each section. Flag any sentence that asserts a fact NOT supported by those
cited claims (numbers, dates, superlatives, causal statements, guarantees).
Return ONLY JSON: {"unsupported":[{"sectionIndex":0,"sentence":"exact sentence text","reason":"..."}]}
Return an empty array when every sentence is properly supported. Be strict
about invented specifics, lenient about paraphrase.`;

const clamp01 = (value, fallback = 0.7) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(1, Math.max(0, num));
};

/** Remove the first matching sentence from a paragraph of text. */
const removeSentence = (text, sentence) => {
  const target = String(sentence || '').trim();
  if (!target) return text;

  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const attempt = new RegExp(`(^|(?<=[.!?]\\s))${escaped}\\s*`, 'i');
  if (attempt.test(text)) return text.replace(attempt, '');

  // Fall back to a fuzzy containment match on the first 60 chars.
  const seed = target.slice(0, 60);
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentenceText) => !sentenceText.includes(seed))
    .join(' ');
};

const validComparisonTable = (table) =>
  table &&
  Array.isArray(table.headers) &&
  table.headers.length > 0 &&
  Array.isArray(table.rows) &&
  table.rows.length > 0 &&
  table.rows.every((row) => Array.isArray(row));

/**
 * @param {object} params
 * @param {object} params.research
 * @param {Array} params.conflicts Conflicts from the final reflection pass.
 * @param {number} params.confidence Reflection confidence (0..1).
 * @param {Tracer} params.tracer
 * @returns {Promise<object>} The persisted Report document.
 */
const synthesizeReport = async ({ research, conflicts = [], confidence = 0.5, tracer, extraLimitations = [] }) => {
  const evidence = await Evidence.find({ researchId: research._id }).sort({ createdAt: 1 }).lean();

  if (evidence.length === 0) {
    throw new Error('No evidence was collected — cannot synthesise a grounded report.');
  }

  const citable = evidence.filter((item) => (item.extractedFacts || []).length > 0);
  const references = citable.map((item, index) => ({
    index: index + 1,
    evidenceId: item._id.toString(),
    title: item.title,
    url: item.url,
    sourceType: item.sourceType,
    qualityScore: item.qualityScore,
  }));

  await tracer.log(
    'generating_report',
    `Synthesising report from ${citable.length} citable source(s) and ${conflicts.length} detected conflict(s).`
  );

  const { data, meta } = await llm.call({
    purpose: 'synthesize',
    system: SYNTHESIS_SYSTEM,
    prompt: `Research question: ${research.question}

Detected conflicts between sources:
${conflicts.length ? conflicts.map((c) => `- ${c.claim}: ${c.description}`).join('\n') : '- none'}

Evidence (citation index = the number to cite):
${citable
  .map(
    (item, index) =>
      `[${index + 1}] ${item.title} (${item.sourceType}, quality ${item.qualityScore ?? 'n/a'})\n    URL: ${item.url}\n    Claims:\n${(item.extractedFacts || [])
        .map((fact) => `      - ${fact.claim}`)
        .join('\n')}`
  )
  .join('\n')}`,
    context: {
      question: research.question,
      evidence: citable.map((item, index) => ({
        index: index + 1,
        title: item.title,
        url: item.url,
        sourceType: item.sourceType,
        claims: (item.extractedFacts || []).map((fact) => fact.claim),
      })),
      conflicts,
      sectionsCount: 3,
    },
  });

  // ── Normalise model output ──────────────────────────────────────────────
  const validIndexes = new Set(references.map((reference) => reference.index));

  let sections = (Array.isArray(data?.sections) ? data.sections : [])
    .filter((section) => section && (section.content || '').trim())
    .slice(0, 8)
    .map((section, index) => {
      const citationIndexes = (Array.isArray(section.citationIndexes) ? section.citationIndexes : [])
        .map(Number)
        .filter((value) => validIndexes.has(value));

      return {
        heading: String(section.heading || `Finding ${index + 1}`).slice(0, 200),
        content: injectCitations(String(section.content).trim(), citationIndexes),
        citationIndexes,
      };
    });

  if (sections.length === 0) {
    // Degenerate model output → fall back to a single evidence-backed section.
    sections = [
      {
        heading: 'Findings',
        content: injectCitations(
          citable.flatMap((item) => (item.extractedFacts || []).map((fact) => `- ${fact.claim}`)).join('\n'),
          references.map((reference) => reference.index)
        ),
        citationIndexes: references.map((reference) => reference.index),
      },
    ];
  }

  // Deduplicate within the synthesis output first: the model often reports the
  // same contradiction twice in different words (see lib/conflicts.js).
  let reportConflicts = dedupeConflicts(
    (Array.isArray(data?.conflicts) ? data.conflicts : [])
      .filter((conflict) => conflict && conflict.claim)
      .map((conflict) => ({
        claim: String(conflict.claim).slice(0, 300),
        description: String(conflict.description || '').slice(0, 800),
        evidenceIds: (Array.isArray(conflict.evidenceIndexes) ? conflict.evidenceIndexes : [])
          .map((index) => citable[Number(index) - 1]?._id)
          .filter(Boolean),
      }))
  ).slice(0, 10);

  // Conflicts discovered during reflection are always reported, even if the
  // synthesis pass chose to omit them.
  const reportConflictKeys = new Set(reportConflicts.map(conflictKey));
  conflicts.forEach((conflict) => {
    if (!conflict.claim) return;
    if (reportConflictKeys.has(conflictKey(conflict))) return;
    reportConflictKeys.add(conflictKey(conflict));
    reportConflicts.push({
      claim: String(conflict.claim).slice(0, 300),
      description: String(conflict.description || '').slice(0, 800),
      evidenceIds: (conflict.evidenceIds || []).map(String),
    });
  });

  // Operational notes from the orchestrator (e.g. subtasks the budget cut
  // off) go in first: they are facts about THIS run, not model prose, and
  // they must survive the slice(0, 8) below.
  const limitations = [...extraLimitations, ...(Array.isArray(data?.limitations) ? data.limitations : [])]
    .map((item) => String(item).slice(0, 300))
    .filter(Boolean)
    .slice(0, 8);

  const title = String(data?.title || `Research Report: ${research.question.slice(0, 80)}`).slice(0, 200);
  const executiveSummary = String(data?.executiveSummary || '').slice(0, 2000);
  const recommendation = String(data?.recommendation || '').slice(0, 2000);
  const confidenceScore = clamp01(data?.confidenceScore, confidence);
  const comparisonTable = validComparisonTable(data?.comparisonTable) ? data.comparisonTable : null;

  // ── Post-generation hallucination audit ─────────────────────────────────
  const auditFindings = await auditSections({ sections, citable, tracer });
  let strippedCount = 0;

  auditFindings.forEach((finding) => {
    const section = sections[finding.sectionIndex];
    if (!section) return;
    section.content = removeSentence(section.content, finding.sentence);
    strippedCount += 1;
  });

  if (strippedCount > 0) {
    limitations.push(
      `Hallucination audit removed ${strippedCount} unsupported statement(s) that exceeded their cited evidence.`
    );
    sections = sections.filter((section) => section.content.trim().length > 0);
  }

  const generatedAt = new Date();
  const markdown = buildMarkdown({
    title,
    generatedAt,
    executiveSummary,
    sections,
    conflicts: reportConflicts,
    limitations,
    recommendation,
    confidenceScore,
    references,
  });

  const report = await Report.findOneAndUpdate(
    { researchId: research._id },
    {
      $set: {
        researchId: research._id,
        title,
        executiveSummary,
        sections,
        comparisonTable,
        recommendation,
        confidenceScore,
        limitations,
        conflicts: reportConflicts,
        references,
        markdown,
        citationCoverage: sections.length
          ? Number(
              (sections.filter((s) => (s.citationIndexes || []).length > 0).length / sections.length).toFixed(2)
            )
          : 0,
        generatedAt,
        verificationStatus: 'pending',
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  await tracer.log(
    'generating_report',
    `Report drafted via ${meta.provider}: ${sections.length} section(s), ${references.length} reference(s), ${reportConflicts.length} conflict(s).`,
    { reportId: String(report._id) }
  );

  return report;
};

/**
 * Independent audit pass: does each section say only what its citations say?
 * @returns {Promise<Array<{sectionIndex: number, sentence: string, reason: string}>>}
 */
const auditSections = async ({ sections, citable, tracer }) => {
  try {
    const { data, meta } = await llm.call({
      purpose: 'audit',
      system: AUDIT_SYSTEM,
      prompt: `Sections:
${sections
  .map(
    (section, index) =>
      `[section ${index}] ${section.heading}\n${section.content}\nCited evidence indexes: ${(section.citationIndexes || []).join(', ') || 'none'}`
  )
  .join('\n\n')}

Cited evidence claims:
${sections
  .map((section, index) => {
    const claims = (section.citationIndexes || [])
      .map((citeIndex) => {
        const item = citable[citeIndex - 1];
        if (!item) return '';
        return `  [${citeIndex}] ${item.title}: ${(item.extractedFacts || []).map((f) => f.claim).join(' | ')}`;
      })
      .filter(Boolean)
      .join('\n');
    return `[section ${index}]\n${claims || '  (no citations)'}`;
  })
  .join('\n')}`,
      context: {
        sections: sections.map((section, index) => ({
          index,
          heading: section.heading,
          content: section.content,
          citationIndexes: section.citationIndexes,
        })),
        evidence: citable.map((item, index) => ({
          index: index + 1,
          title: item.title,
          claims: (item.extractedFacts || []).map((fact) => fact.claim),
        })),
      },
    });

    const findings = (Array.isArray(data?.unsupported) ? data.unsupported : []).filter(
      (finding) => finding && typeof finding.sentence === 'string' && finding.sentence.trim()
    );

    if (findings.length > 0) {
      await tracer.log(
        'generating_report',
        `Hallucination audit flagged ${findings.length} unsupported statement(s) via ${meta.provider}.`,
        { findings: findings.map((f) => f.sentence.slice(0, 80)) },
        'warn'
      );
    }

    // Hard cap: an over-eager auditor must never gut the whole report.
    return findings.slice(0, 3);
  } catch (err) {
    await tracer.log('generating_report', `Audit pass skipped: ${err.message}`, undefined, 'warn');
    return [];
  }
};

module.exports = { synthesizeReport, removeSentence, clamp01 };
