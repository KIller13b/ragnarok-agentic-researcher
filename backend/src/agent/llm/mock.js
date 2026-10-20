/**
 * Deterministic rule-based stand-in for a real LLM.
 *
 * Two jobs:
 *  1. Let the whole pipeline run with ZERO API keys (great for the first
 *     integration test and for a venue with dead Wi-Fi — the demo still works).
 *  2. Guarantee the agent never hard-fails on a provider outage mid-run: the
 *     orchestrator can degrade to mock mode instead of crashing the session.
 *
 * The mock receives structured `context` (never a raw prompt string), so its
 * output is stable and testable.
 */

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

const cleanWords = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Extract the distinctive terms of a question (drop stopwords). */
const keywords = (question, limit = 6) => {
  const stop = new Set([
    'what', 'which', 'how', 'the', 'a', 'an', 'is', 'are', 'of', 'for', 'and',
    'or', 'to', 'in', 'on', 'with', 'between', 'vs', 'versus', 'compare',
    'difference', 'best', 'does', 'do', 'can', 'you', 'please', 'tell', 'me',
    'investigate', 'research', 'using', 'based', 'need', 'get', 'into',
  ]);
  return cleanWords(question)
    .filter((word) => !stop.has(word) && word.length > 2)
    .slice(0, limit);
};

const ANGLES = [
  {
    suffix: 'core capabilities and how it works',
    queries: (kw) => [`${kw} overview how it works`, `${kw} key features capabilities`],
  },
  {
    suffix: 'pricing, limits and practical constraints',
    queries: (kw) => [`${kw} pricing plans limits`, `${kw} cost free tier constraints`],
  },
  {
    suffix: 'independent benchmarks and user experience',
    queries: (kw) => [`${kw} benchmark review experience`, `${kw} comparison pros cons`],
  },
  {
    suffix: 'recent changes, risks and open questions',
    queries: (kw) => [`${kw} 2026 latest updates limitations`, `${kw} issues risks criticism`],
  },
];

// ── Purpose handlers ─────────────────────────────────────────────────────

const plan = ({ question, subtaskCount = 4 }) => {
  // Keep queries SHORT and topic-led: search engines return junk for long
  // keyword concatenations, and a fallback provider has no slack to waste.
  const kw = keywords(question, 3).join(' ') || String(question).slice(0, 60);
  const count = Math.min(Math.max(subtaskCount, 3), ANGLES.length);

  return {
    subtasks: ANGLES.slice(0, count).map((angle, index) => ({
      title: `Investigate ${angle.suffix}`,
      description: `Research "${angle.suffix}" in the context of: ${question}`,
      searchQueries: angle.queries(kw).slice(0, 2),
    })),
  };
};

const extract = ({ sources = [] }) => ({
  sources: sources.map((source) => {
    const text = String(source.snippet || '').trim();
    const sentences = text ? text.split(SENTENCE_SPLIT).filter((s) => s.length > 25) : [];
    const claims = sentences.slice(0, 2).map((sentence) => ({
      claim: sentence.trim(),
      supportingText: sentence.trim(),
    }));

    return {
      url: source.url,
      claims,
      credibility: text ? 0.6 : 0.3,
      sourceType: source.sourceType || 'other',
    };
  }),
});

/** Jaccard similarity between two token sets. */
const similarity = (a, b) => {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  setA.forEach((token) => {
    if (setB.has(token)) shared += 1;
  });
  return shared / (setA.size + setB.size - shared);
};

const NUMBERS = /\b\d+(?:[.,]\d+)?%?\b/g;

/**
 * Cheap deterministic contradiction detector: two claims from *different*
 * sources that talk about the same thing (high token overlap) but quote
 * different numbers are treated as conflicting.
 */
const detectConflicts = (evidence = []) => {
  const flattened = [];
  evidence.forEach((item) => {
    (item.extractedFacts || []).forEach((fact) => {
      flattened.push({ url: item.url, text: String(fact.claim || '') });
    });
  });

  const conflicts = [];
  for (let i = 0; i < flattened.length; i += 1) {
    for (let j = i + 1; j < flattened.length; j += 1) {
      const a = flattened[i];
      const b = flattened[j];
      if (!a.url || a.url === b.url) continue;

      const tokensA = cleanWords(a.text);
      const tokensB = cleanWords(b.text);
      if (similarity(tokensA, tokensB) < 0.45) continue;

      const numbersA = a.text.match(NUMBERS) || [];
      const numbersB = b.text.match(NUMBERS) || [];
      if (!numbersA.length || !numbersB.length) continue;
      if (numbersA.join(',') === numbersB.join(',')) continue;

      conflicts.push({
        claim: tokensA.slice(0, 8).join(' '),
        description: `Sources disagree: "${a.text.slice(0, 140)}" vs "${b.text.slice(0, 140)}"`,
        urls: [a.url, b.url],
      });
    }
  }

  return conflicts.slice(0, 5);
};

const reflect = ({ tasks = [], evidence = [], minEvidencePerTask = 2, question = '' }) => {
  // The reflector sends a digest with `claims` (array of strings); database
  // documents carry `extractedFacts`. Normalise so both paths behave alike.
  const normalised = evidence.map((item) => ({
    ...item,
    extractedFacts: item.extractedFacts || (item.claims || []).map((claim) => ({ claim })),
  }));

  const evidenceByTask = new Map();
  normalised.forEach((item) => {
    const key = String(item.taskId || 'unknown');
    evidenceByTask.set(key, (evidenceByTask.get(key) || 0) + 1);
  });

  const gaps = [];
  const followupQueries = [];

  const anchorTerms = keywords(question, 3);

  tasks.forEach((task) => {
    const count = evidenceByTask.get(String(task._id)) || 0;
    if (count < minEvidencePerTask) {
      // Anchor the follow-up on the ORIGINAL question's topic words plus the
      // subtask's ANGLE. Two traps this avoids: (1) meta-words like
      // "evidence sources" that no search engine can answer, and (2)
      // re-echoing the question back out of a "Follow-up: <query>" title,
      // which collapses every follow-up onto the same generic words.
      const bareTitle = String(task.title).replace(/^follow[\s-]*up\s*:\s*/i, '');
      const angleTerms = keywords(bareTitle, 6)
        .filter((word) => !anchorTerms.includes(word))
        .slice(0, 3);
      const query =
        [...new Set([...anchorTerms, ...angleTerms])].join(' ').trim() ||
        String(task.title).slice(0, 80);
      gaps.push({
        taskId: String(task._id),
        question: task.title,
        reason: `Only ${count} evidence item(s) retrieved; expected at least ${minEvidencePerTask}.`,
      });
      followupQueries.push({
        taskId: String(task._id),
        query,
        reason: 'Follow-up needed to close an evidence gap.',
      });
    }
  });

  const conflicts = detectConflicts(normalised);
  const coverage = tasks.length ? gaps.length / tasks.length : 1;

  return {
    gaps,
    conflicts,
    followupQueries,
    confidence: Number(Math.max(0.2, 0.95 - coverage * 0.5).toFixed(2)),
  };
};

const synthesize = ({ question, evidence = [], conflicts = [], sectionsCount = 3 }) => {
  // `claims` is what the synthesizer passes; `extractedFacts` is what the
  // database documents carry. Accept either so the mock works in both paths.
  const citable = evidence.filter(
    (item) => (item.claims || item.extractedFacts || []).length > 0
  );
  const perSection = Math.max(1, Math.ceil(citable.length / Math.max(sectionsCount, 1)));

  const sections = [];
  for (let i = 0; i < citable.length; i += perSection) {
    const chunk = citable.slice(i, i + perSection);
    const citationIndexes = chunk.map((item) => item.index);
    const lines = chunk.flatMap((item) =>
      (item.claims || item.extractedFacts || []).map((fact) => `- ${typeof fact === 'string' ? fact : fact.claim}`)
    );

    sections.push({
      heading: `Finding ${sections.length + 1}: ${chunk[0].title || chunk[0].url}`,
      content: lines.join(' ') || 'No citable claims were extracted from this group of sources.',
      citationIndexes,
    });
  }

  const cited = sections.reduce((sum, section) => sum + section.citationIndexes.length, 0);
  const limitations = [];
  if (conflicts.length > 0) {
    limitations.push(
      'Conflicting claims were detected between sources and are reported rather than silently resolved.'
    );
  }
  if (citable.length < evidence.length) {
    limitations.push('Some retrieved sources contained no extractable factual claims.');
  }
  limitations.push('Generated in deterministic offline mode — no live LLM reasoning was used.');

  return {
    title: `Research Report: ${question.slice(0, 80)}`,
    executiveSummary: `This report investigates "${question}" across ${evidence.length} retrieved source(s) and ${sections.length} finding group(s). Every statement below is anchored to at least one extracted citation.`,
    sections,
    conflicts: conflicts.map((conflict) => ({
      claim: conflict.claim,
      description: conflict.description,
      urls: conflict.urls || [],
    })),
    recommendation:
      sections.length > 0
        ? 'Review the cited findings above; verify the flagged conflicts against primary sources before acting.'
        : 'Evidence was insufficient to make a grounded recommendation.',
    confidenceScore: Number(Math.min(0.9, 0.4 + cited * 0.05).toFixed(2)),
    limitations,
  };
};

/**
 * The deterministic mode cites nothing it cannot back, so the audit always
 * passes. Kept as a real implementation so the audit code path runs in
 * offline demos too.
 */
const audit = () => ({ unsupported: [] });

// ── Entry point matching the real provider signature ─────────────────────

const complete = async ({ purpose, context = {} }) => {
  switch (purpose) {
    case 'plan':
      return plan(context);
    case 'extract':
      return extract(context);
    case 'reflect':
      return reflect(context);
    case 'synthesize':
      return synthesize(context);
    case 'audit':
      return audit(context);
    default:
      throw new Error(`Mock LLM does not implement purpose "${purpose}"`);
  }
};

module.exports = {
  complete,
  plan,
  extract,
  reflect,
  synthesize,
  audit,
  detectConflicts,
  keywords,
};
