/**
 * Agent configuration.
 *
 * Every value is overridable via environment variables so teammates can tune
 * behaviour at the hackathon without touching code. Defaults are chosen for a
 * 24-hour build with free-tier API quotas: few LLM calls per run, bounded
 * loops, and hard ceilings everywhere so the agent can never spin forever.
 */

const int = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const float = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const config = {
  // ── LLM ────────────────────────────────────────────────────────────────
  // 'auto' picks gemini → openai → mock depending on which keys exist.
  llmProvider: (process.env.LLM_PROVIDER || 'auto').toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  // Default must be a model that still EXISTS. gemini-2.0-flash / 2.5-flash /
  // 2.5-flash-lite / 3-pro-preview are retired (404 as of 2026-10-20).
  // gemini-3.1-flash-lite is verified working and has its own free-tier quota,
  // unlike gemini-3-flash-preview which is capped at 20 requests/day.
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // How many times a malformed LLM response is re-requested with the error
  // appended before we give up and fall back to deterministic behaviour.
  llmRepairAttempts: int(process.env.LLM_REPAIR_ATTEMPTS, 2),

  // ── Search tools ───────────────────────────────────────────────────────
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  userAgent:
    process.env.AGENT_USER_AGENT ||
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',

  // ── Pipeline bounds (the anti-infinite-loop guarantees) ────────────────
  autoStart: bool(process.env.AGENT_ENABLED, true),
  maxIterations: int(process.env.AGENT_MAX_ITERATIONS, 3),
  maxTasks: int(process.env.AGENT_MAX_TASKS, 8),
  maxLlmCalls: int(process.env.AGENT_MAX_LLM_CALLS, 40),
  maxQueriesPerTask: int(process.env.AGENT_MAX_QUERIES_PER_TASK, 2),
  maxSourcesPerQuery: int(process.env.AGENT_MAX_SOURCES_PER_QUERY, 4),
  minEvidencePerTask: int(process.env.AGENT_MIN_EVIDENCE_PER_TASK, 2),
  defaultMaxSources: int(process.env.AGENT_DEFAULT_MAX_SOURCES, 12),

  // ── Rate limiting (free-tier friendly) ─────────────────────────────────
  llmMinIntervalMs: int(process.env.AGENT_LLM_MIN_INTERVAL_MS, 400),
  // Per-provider gaps: DDG's HTML endpoint throttles hard, Wikipedia 429s.
  ddgMinIntervalMs: int(process.env.AGENT_DDG_MIN_INTERVAL_MS, 1500),
  wikipediaMinIntervalMs: int(process.env.AGENT_WIKIPEDIA_MIN_INTERVAL_MS, 700),
  searchRetryBackoffMs: int(process.env.AGENT_SEARCH_RETRY_BACKOFF_MS, 2500),

  // ── Networking ─────────────────────────────────────────────────────────
  requestTimeoutMs: int(process.env.AGENT_REQUEST_TIMEOUT_MS, 30000),

  // ── Observability ──────────────────────────────────────────────────────
  maxAgentLogEntries: int(process.env.AGENT_MAX_LOG_ENTRIES, 150),
};

module.exports = config;
