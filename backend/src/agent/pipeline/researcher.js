/**
 * PHASE 2 — RESEARCH (tool use + structured fact extraction)
 *
 * For each subtask: run its search queries through the `web_search` tool,
 * then make ONE batched extraction call that converts the raw snippets into
 * structured, attributable claims. Every step lands in the `ToolCall` and
 * `Evidence` collections, which is what the dashboard's live panels render.
 *
 * Batching matters: a naive agent makes one LLM call per source (12+ calls
 * per run). We make one per query, which keeps us inside free-tier limits.
 */

const Task = require('../../models/task.model');
const Evidence = require('../../models/evidence.model');
const config = require('../config');
const llm = require('../llm/client');
const { webSearch } = require('../tools/search');

const SYSTEM = `You are the evidence-extraction module of an autonomous research agent.
You are given a research subtask and raw search-result snippets.
Extract only claims that are explicitly supported by the snippet text.
Return ONLY JSON: {"sources":[{"url":"...","claims":[{"claim":"...","supportingText":"..."}],"credibility":0.0,"sourceType":"documentation"}]}
Rules:
- "claim" is a single factual assertion (<= 250 chars), written as a statement.
- "supportingText" is the verbatim snippet text that backs the claim.
- Never invent facts that are not present in the snippet. If a snippet has no
  usable fact, return an empty claims array for that source.
- "credibility" is 0..1 based on the source: documentation/academic 0.8-0.95,
  news 0.6-0.8, blog 0.4-0.6, forum 0.3-0.5, marketing or unverifiable 0.2-0.4.
- "sourceType" is one of: official, academic, news, blog, forum, documentation, other.`;

const clamp01 = (value, fallback = 0.5) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(1, Math.max(0, num));
};

/**
 * @param {object} params
 * @param {object} params.task Lean task document.
 * @param {object} params.research Lean research document.
 * @param {Tracer} params.tracer
 * @param {string[]} params.seenUrls Mutated: URL dedupe across the whole run.
 * @param {number} params.evidenceBudget How many evidence docs may still be created.
 * @returns {Promise<Array>} Created evidence documents.
 */
const researchTask = async ({ task, research, tracer, seenUrls, evidenceBudget }) => {
  const created = [];

  if (evidenceBudget <= 0) {
    await tracer.log('researching', `Evidence budget exhausted — skipping "${task.title}".`, undefined, 'warn');
    return created;
  }

  await Task.updateOne({ _id: task._id }, { $set: { status: 'in_progress' } });
  await tracer.log('researching', `Executing subtask: ${task.title}`, { taskId: String(task._id) });

  const queries = (task.searchQueries || []).slice(0, config.maxQueriesPerTask);
  const collected = [];

  for (const query of queries) {
    if (collected.length >= evidenceBudget) break;

    try {
      // eslint-disable-next-line no-await-in-loop
      const { results, attempts } = await tracer.tool({
        toolName: 'web_search',
        taskId: task._id,
        input: { query, maxResults: config.maxSourcesPerQuery },
        fn: () =>
          webSearch(query, {
            limit: config.maxSourcesPerQuery,
            preferredSourceTypes: research.constraints?.preferredSourceTypes || [],
            excludeUrls: seenUrls,
          }),
        summarise: (result) =>
          `${result.results.length} source(s) [${result.attempts.map((a) => `${a.provider}:${a.ok ? a.count : 'ERR'}`).join(', ')}]`,
      });

      const fresh = results
        .filter((result) => !seenUrls.has(result.url.replace(/\/+$/, '').toLowerCase()))
        .slice(0, evidenceBudget - collected.length);

      fresh.forEach((result) => {
        seenUrls.add(result.url.replace(/\/+$/, '').toLowerCase());
        collected.push({ ...result, query, attempts });
      });

      await tracer.log(
        'researching',
        `"${query}" → ${results.length} source(s) via ${attempts.filter((a) => a.ok).map((a) => a.provider).join(', ') || 'no provider'}.`,
        { taskId: String(task._id), query }
      );
    } catch (err) {
      // Search outage for this query: log it and let the reflector spawn a gap.
      await tracer.log('researching', `Search failed for "${query}": ${err.message}`, { taskId: String(task._id) }, 'error');
    }
  }

  if (collected.length === 0) {
    await Task.updateOne(
      { _id: task._id },
      { $set: { status: 'failed', resultSummary: 'No sources could be retrieved for this subtask.' } }
    );
    return created;
  }

  // ── One batched extraction call for this subtask's sources ──────────────
  const { data, meta } = await llm.call({
    purpose: 'extract',
    system: SYSTEM,
    prompt: `Subtask: ${task.title}
${task.description || ''}

Search query context: ${collected.map((source) => `"${source.query}"`).join(', ')}

Sources to extract from:
${collected
  .map((source, index) => `[${index}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet.slice(0, 1200)}`)
  .join('\n\n')}`,
    context: {
      sources: collected.map((source) => ({
        url: source.url,
        snippet: source.snippet,
        sourceType: source.sourceType,
      })),
    },
  });

  const byUrl = new Map(
    (Array.isArray(data?.sources) ? data.sources : [])
      .filter((source) => source && source.url)
      .map((source) => [String(source.url).replace(/\/+$/, '').toLowerCase(), source])
  );

  for (const source of collected) {
    const extracted = byUrl.get(source.url.replace(/\/+$/, '').toLowerCase());
    const facts = (extracted?.claims || []).filter((fact) => fact && fact.claim);

    if (facts.length === 0) continue; // no grounded claim → no evidence record

    const credibility = clamp01(extracted?.credibility, 0.5);
    const qualityScore = clamp01(credibility * 0.7 + source.score * 0.3, 0.5);

    // eslint-disable-next-line no-await-in-loop
    created.push(
      await Evidence.create({
        researchId: research._id,
        taskId: task._id,
        title: source.title.slice(0, 200),
        url: source.url,
        sourceType: source.sourceType,
        snippet: source.snippet.slice(0, 2000),
        extractedFacts: facts.slice(0, 4).map((fact) => ({
          claim: String(fact.claim).slice(0, 400),
          supportingText: String(fact.supportingText || '').slice(0, 800),
        })),
        qualityScore,
        retrievedAt: new Date(),
      })
    );
  }

  const claimCount = created.reduce((sum, doc) => sum + doc.extractedFacts.length, 0);
  const status = created.length > 0 ? 'completed' : 'failed';

  await Task.updateOne(
    { _id: task._id },
    {
      $set: {
        status,
        resultSummary: `${created.length} source(s), ${claimCount} claim(s) extracted (extraction via ${meta.provider}).`,
      },
    }
  );

  await tracer.log(
    'researching',
    `Subtask done: ${created.length} evidence item(s), ${claimCount} claim(s).`,
    { taskId: String(task._id), evidenceIds: created.map((doc) => doc._id.toString()) }
  );

  return created;
};

module.exports = { researchTask, clamp01 };
