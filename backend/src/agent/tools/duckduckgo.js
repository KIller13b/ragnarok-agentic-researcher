/**
 * DuckDuckGo search tool — the keyless fallback.
 *
 * No API key, no account: if Tavily's quota dies mid-demo the agent keeps
 * working. We parse the HTML endpoint and decode DDG's `/l/?uddg=` redirect
 * wrapper to recover the real destination URL.
 *
 * `parseResults` is exported separately so it can be unit-tested offline.
 */

const config = require('../config');

const ENDPOINT = 'https://html.duckduckgo.com/html/';

const decodeEntities = (text) =>
  String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

// Decode entities FIRST (so `&lt;b&gt;` becomes a strippable tag), then strip tags.
const stripTags = (html) =>
  decodeEntities(String(html || ''))
    .replace(/<[^>]*>/g, '')
    .trim();

/** Unwrap `//duckduckgo.com/l/?uddg=<encoded-url>&rut=…` redirect links. */
const resolveUrl = (href) => {
  const raw = decodeEntities(href || '').trim();
  if (!raw) return '';

  try {
    const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
    const parsed = new URL(absolute);
    const destination = parsed.searchParams.get('uddg');
    return destination ? decodeURIComponent(destination) : absolute;
  } catch {
    return raw;
  }
};

/**
 * Extract organic results from DDG's HTML endpoint.
 * @param {string} html
 * @param {number} limit
 * @returns {Array<{title: string, url: string, snippet: string, score: number}>}
 */
const parseResults = (html, limit = 5) => {
  const linkRe = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const links = [];
  let match;
  while ((match = linkRe.exec(html)) !== null && links.length < limit) {
    links.push({ url: resolveUrl(match[1]), title: stripTags(match[2]) });
  }

  const snippets = [];
  while ((match = snippetRe.exec(html)) !== null && snippets.length < limit) {
    snippets.push(stripTags(match[1]));
  }

  return links
    .filter((link) => /^https?:\/\//.test(link.url))
    .map((link, index) => ({
      title: link.title || link.url,
      url: link.url,
      snippet: snippets[index] || '',
      // DDG gives no relevance score — decay by rank instead.
      score: Number((1 - index * 0.1).toFixed(2)),
    }));
};

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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': config.userAgent,
      },
      signal: controller.signal,
      body: new URLSearchParams({ q: query, kl: 'in-en' }).toString(),
    });

    if (!response.ok) throw new Error(`DuckDuckGo ${response.status}`);

    const html = await response.text();
    const results = parseResults(html, limit);
    if (results.length === 0) throw new Error('DuckDuckGo returned no parseable results');

    return results;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { search, parseResults, resolveUrl };
