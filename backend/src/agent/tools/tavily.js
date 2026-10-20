/**
 * Tavily search tool — the agent's primary web evidence source.
 *
 * Purpose-built for LLM agents: one call returns cleaned page content plus a
 * relevance score, so we never need a headless browser or an HTML scraper.
 * Free tier = 1,000 credits/month, which comfortably covers a hackathon.
 */

const config = require('../config');

const ENDPOINT = 'https://api.tavily.com/search';

/**
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array<{title: string, url: string, snippet: string, score: number}>>}
 */
const search = async (query, limit = 5) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: config.tavilyApiKey,
        query,
        max_results: limit,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    const body = await response.text();
    if (!response.ok) throw new Error(`Tavily ${response.status}: ${body.slice(0, 300)}`);

    const parsed = JSON.parse(body);
    return (parsed.results || []).map((result) => ({
      title: result.title || result.url,
      url: result.url,
      snippet: (result.content || '').trim(),
      score: typeof result.score === 'number' ? Number(result.score.toFixed(3)) : 0.5,
    }));
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { search };
