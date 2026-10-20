/**
 * Heuristic source-type classifier.
 *
 * Maps a URL onto the `Evidence.sourceType` enum so the dashboard can badge
 * sources and the credibility scorer can weight them (documentation and
 * academic sources outrank forums and marketing blogs).
 */

const RULES = [
  { type: 'academic', pattern: /(\.|\/)(arxiv\.org|doi\.org|scholar\.google|pubmed\.ncbi\.nlm\.nih\.gov|acm\.org|ieee\.org|nature\.com|sciencedirect\.com|springer\.com|ssrn\.com|nber\.org)/i },
  { type: 'academic', pattern: /\.edu(\.|\/|$)/i },
  { type: 'official', pattern: /(\.|\/)(gov|govt|nic\.in|gov\.in)(\.|\/|$)/i },
  { type: 'documentation', pattern: /(docs\.|developer\.|dev\.|readthedocs\.|gitbook\.|wiki\.|swagger\.|apidocs\.)/i },
  { type: 'documentation', pattern: /\.dev(\/|$)/i },
  { type: 'documentation', pattern: /(github\.com|gitlab\.com|stackoverflow\.com|mdn\.web\.dev|developer\.mozilla\.org)/i },
  { type: 'news', pattern: /(reuters\.com|bbc\.co\.uk|bbc\.com|apnews\.com|thehindu\.com|indianexpress\.com|hindustantimes\.com|livemint\.com|economist\.com|nytimes\.com|theguardian\.com|wired\.com|techcrunch\.com|ars technica|theverge\.com|bloomberg\.com|cnbc\.com)/i },
  { type: 'forum', pattern: /(reddit\.com|stackexchange\.com|news\.ycombinator\.com|quora\.com|discord\.(com|gg))/i },
  { type: 'blog', pattern: /(medium\.com|substack\.com|dev\.to|hashnode\.dev|blogspot\.|wordpress\.com|linkedin\.com\/pulse)/i },
];

/**
 * @param {string} url
 * @returns {'official'|'academic'|'news'|'blog'|'forum'|'documentation'|'other'}
 */
const classifySourceType = (url) => {
  const target = String(url || '');
  for (const rule of RULES) {
    if (rule.pattern.test(target)) return rule.type;
  }
  return 'other';
};

module.exports = { classifySourceType };
