/**
 * Wikipedia tool — the agent's corroboration source.
 *
 * Not a general search engine, and deliberately so: for the "Hallucination
 * Auditing" criterion, "two independent sources agree" is far more convincing
 * when one of them is a stable, citable encyclopedia entry rather than two
 * SEO blogs. Keyless, free, and very hard to rate-limit us.
 */

const config = require('../config');

const API = 'https://en.wikipedia.org/w/api.php';
const PAGE_URL = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

const STOPWORDS = new Set([
  'what', 'which', 'how', 'the', 'a', 'an', 'is', 'are', 'of', 'for', 'and', 'or',
  'to', 'in', 'on', 'with', 'between', 'vs', 'versus', 'compare', 'difference',
  'best', 'does', 'do', 'can', 'you', 'please', 'tell', 'me',
]);

const cleanWords = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOPWORDS.has(word) && word.length > 2);

/**
 * Topical-relevance gate for the Wikipedia fallback.
 *
 * Wikipedia is only consulted when the primary providers come up short, so a
 * result must actually be *about* the query — otherwise an incidental keyword
 * hit (query "...practical constraints" → page "Speed limits in the United
 * States", or query "core capabilities works evidence sources" → "Epistemology")
 * gets promoted to evidence and, worse, cited in the final report.
 *
 * A result passes when EITHER the page title contains one of the query's
 * salient terms (strong signal), OR the opening extract covers at least
 * `minBodyRatio` of them (weak signal, and only in aggregate — one stray word
 * like "evidence" or "limits" is never enough on its own).
 *
 * @returns {{ratio: number, titleMatches: number, passes: boolean}}
 */
const evaluateRelevance = (query, title, extract = '', minBodyRatio = 0.6) => {
  const queryTerms = cleanWords(query);
  if (queryTerms.length === 0) return { ratio: 1, titleMatches: 1, passes: true };

  const titleTerms = new Set(cleanWords(title));
  const bodyTerms = new Set(cleanWords(extract).slice(0, 120));

  const titleMatches = queryTerms.filter((term) => titleTerms.has(term)).length;
  const matched = new Set(
    queryTerms.filter((term) => titleTerms.has(term) || bodyTerms.has(term))
  );
  const ratio = matched.size / queryTerms.length;

  return { ratio, titleMatches, passes: titleMatches >= 1 || ratio >= minBodyRatio };
};

/** Ratio-only view, used for scoring within the passing set. */
const scoreRelevance = (query, title, extract = '') =>
  evaluateRelevance(query, title, extract).ratio;

const getJson = async (params) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': config.userAgent },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Wikipedia ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

/**
 * MediaWiki `srsearch` ANDs every term: "langchain llamaindex building core
 * capabilities" matches ZERO pages because no single article contains all six
 * words (verified against the live API), while "langchain OR llamaindex OR
 * building" returns 822k pages led by exactly the right ones.
 *
 * Builds that relaxed variant from the top salient terms of the query.
 * Returns null when there is nothing to relax (fewer than two usable terms —
 * a second pass would be a byte-identical repeat of the first).
 *
 * @param {string} query
 * @returns {string|null}
 */
const relaxQuery = (query) => {
  const terms = cleanWords(query).slice(0, 3);
  if (terms.length < 2) return null;
  return terms.join(' OR ');
};

/** Strip question scaffolding so the strict AND pass matches on topic words. */
const strictQuery = (query) => cleanWords(query).join(' ') || String(query || '').trim();

/**
 * One `list=search` pass: fetch, pull intros, gate through relevance.
 * `originalQuery` is what relevance is judged against — a relaxed pass widens
 * the net, it never widens the standard.
 *
 * @returns {Promise<Array<{title: string, url: string, snippet: string, relevance: number, score: number}>>}
 */
const runSearch = async (srsearch, originalQuery, limit, minBodyRatio) => {
  const searchData = await getJson({
    action: 'query',
    list: 'search',
    srsearch,
    // Over-fetch: the gate drops off-topic hits, so start with headroom.
    srlimit: String(limit * 2),
  });

  const hits = searchData?.query?.search || [];
  if (hits.length === 0) return [];

  // Fetch plain-text intros for all hits in a single call.
  const titles = hits.map((hit) => hit.title).join('|');
  const extractData = await getJson({
    action: 'query',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    exchars: '700',
    titles,
  });

  const pages = extractData?.query?.pages || {};
  const byTitle = new Map(
    Object.values(pages).map((page) => [page.title, String(page.extract || '').trim()])
  );

  return hits
    .map((hit, index) => {
      const extract = byTitle.get(hit.title) || String(hit.snippet || '').replace(/<[^>]*>/g, '');
      const verdict = evaluateRelevance(originalQuery, hit.title, extract, minBodyRatio);
      const rank = 1 - index / Math.max(1, hits.length);
      return {
        title: hit.title,
        url: PAGE_URL(hit.title),
        snippet: extract,
        relevance: Number(verdict.ratio.toFixed(3)),
        passes: verdict.passes,
        // Blend topical relevance with search rank so an incidental keyword
        // match can never outrank a genuinely on-topic page.
        score: Number((verdict.ratio * 0.7 + 0.3 * rank).toFixed(3)),
      };
    })
    .filter((result) => result.passes)
    .map(({ passes, ...result }) => result);
};

/**
 * Two-pass search: exact AND semantics first (precise when the terms really
 * do co-occur), then one relaxed OR pass when the strict pass yields nothing
 * the relevance gate will accept. Keyless corroboration fallback — must work
 * even when the primary providers are rate-limiting us.
 *
 * @param {string} query
 * @param {number} limit
 * @param {object} [options]
 * @param {number} [options.minBodyRatio] Body-only relevance floor (default 0.6).
 * @returns {Promise<Array<{title: string, url: string, snippet: string, score: number}>>}
 */
const search = async (query, limit = 3, options = {}) => {
  const minBodyRatio = options.minBodyRatio ?? 0.6;

  // Pass 1 — strict, cleaned of question scaffolding.
  let results = await runSearch(strictQuery(query), query, limit, minBodyRatio);
  if (results.length > 0) return results.slice(0, limit);

  // Pass 2 — relaxed OR of the top salient terms; same gate, same standard.
  const relaxed = relaxQuery(query);
  if (!relaxed) return results.slice(0, limit);

  results = await runSearch(relaxed, query, limit, minBodyRatio);
  return results.slice(0, limit);
};

module.exports = { search, PAGE_URL, scoreRelevance, evaluateRelevance, relaxQuery, strictQuery };
