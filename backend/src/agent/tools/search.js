/**
 * Search facade — the `web_search` tool the agent brain calls.
 *
 * Provider chain (each layer is a graceful fallback for the previous):
 *   1. Tavily      — clean JSON + content, needs a free API key.
 *   2. DuckDuckGo  — keyless HTML parsing.
 *   3. Wikipedia   — keyless corroboration supplement.
 *
 * The tool NEVER throws for "no results" (that is a normal research outcome);
 * it returns an `attempts` log so the orchestrator can record exactly which
 * providers were tried in the ToolCall audit trail. It only throws when every
 * provider failed — i.e. the network is genuinely gone.
 */

const config = require('../config');
const { GapLimiter } = require('../lib/rate-limiter');
const { classifySourceType } = require('../lib/source-type');
const tavily = require('./tavily');
const duckduckgo = require('./duckduckgo');
const wikipedia = require('./wikipedia');

// Each provider gets its OWN limiter with a provider-appropriate gap.
// Tavily is an API and tolerates speed; DuckDuckGo's HTML endpoint throttles
// aggressively and will start returning empty pages if hammered; Wikipedia
// 429s above ~10 req/s. Getting this wrong is what makes a live demo die at
// minute three.
const limiters = {
  tavily: new GapLimiter({ minGapMs: 250, concurrency: 2 }),
  duckduckgo: new GapLimiter({ minGapMs: config.ddgMinIntervalMs, concurrency: 1 }),
  wikipedia: new GapLimiter({ minGapMs: config.wikipediaMinIntervalMs, concurrency: 1 }),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run one provider with a single backoff retry. Rate-limit responses are
 * transient by definition, so one retry converts most 429/empty-page
 * failures into successes without risking a loop (exactly one retry).
 */
const runProvider = async (name, fn, limit, attempts) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const results = await limiters[name].schedule(fn);
      attempts.push({ provider: name, ok: true, count: results.length });
      return results;
    } catch (err) {
      const retryable = attempt === 0 && /429|403|no parseable|ECONNRESET|socket/i.test(err.message || '');
      if (!retryable) {
        attempts.push({ provider: name, ok: false, error: err.message });
        return [];
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(config.searchRetryBackoffMs);
    }
  }

  return [];
};

/** Stable-partition by preferred source types, then order by score. */
const rankResults = (results, preferredSourceTypes = []) => {
  const preferred = new Set(preferredSourceTypes.map((t) => String(t).toLowerCase()));

  return results
    .map((result, index) => ({ ...result, _index: index }))
    .sort((a, b) => {
      const prefA = preferred.has(String(a.sourceType).toLowerCase()) ? 1 : 0;
      const prefB = preferred.has(String(b.sourceType).toLowerCase()) ? 1 : 0;
      if (prefA !== prefB) return prefB - prefA;
      if (b.score !== a.score) return b.score - a.score;
      return a._index - b._index;
    })
    .map(({ _index, ...result }) => result);
};

/**
 * @param {string} query
 * @param {object} options
 * @param {number} [options.limit]
 * @param {string[]} [options.preferredSourceTypes]
 * @param {string[]} [options.excludeUrls] Already-collected URLs (dedupe).
 * @returns {Promise<{results: Array, attempts: Array}>}
 */
const webSearch = async (query, options = {}) => {
  const limit = Math.max(1, options.limit || config.maxSourcesPerQuery);
  const exclude = new Set(options.excludeUrls || []);
  const attempts = [];

  let raw = [];

  if (config.tavilyApiKey) {
    raw = await runProvider('tavily', () => tavily.search(query, limit), limit, attempts);
  }

  if (raw.length < limit) {
    const extra = await runProvider('duckduckgo', () => duckduckgo.search(query, limit), limit, attempts);
    raw = raw.concat(extra);
  }

  // Corroborate with Wikipedia whenever we are short on sources.
  if (raw.length < limit) {
    const extra = await runProvider('wikipedia', () => wikipedia.search(query, Math.min(2, limit)), limit, attempts);
    raw = raw.concat(extra);
  }

  const everyAttemptFailed = attempts.length > 0 && attempts.every((attempt) => !attempt.ok);
  if (everyAttemptFailed) {
    throw new Error(`All search providers failed: ${attempts.map((a) => a.error).join(' | ')}`);
  }

  // Dedupe by normalised URL, drop excluded + empty-snippet entries.
  const seen = new Set();
  const deduped = [];
  for (const result of raw) {
    const key = String(result.url || '').replace(/\/+$/, '').toLowerCase();
    if (!key || seen.has(key) || exclude.has(key) || !result.snippet) continue;
    seen.add(key);
    deduped.push({
      title: result.title || result.url,
      url: result.url,
      snippet: result.snippet,
      score: typeof result.score === 'number' ? result.score : 0.5,
      sourceType: classifySourceType(result.url),
    });
  }

  const results = rankResults(deduped, options.preferredSourceTypes).slice(0, limit);

  // A search that returns nothing is a genuine tool failure (rate limit,
  // throttling, or a query no provider could answer). Throwing lets the
  // caller log it as `failed` in the ToolCall audit trail and record a real
  // error message, instead of reporting a hollow "succeeded" call.
  if (results.length === 0) {
    throw new Error(
      `No usable sources for "${query}" after ${attempts
        .map((a) => `${a.provider}${a.ok ? `(${a.count})` : `(failed: ${a.error})`}`)
        .join(', ')}`
    );
  }

  return { results, attempts };
};

module.exports = { webSearch, rankResults };
