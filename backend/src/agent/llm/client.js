/**
 * Provider-agnostic LLM client for the agent brain.
 *
 * Responsibilities:
 *  - pick a provider (Gemini → OpenAI → deterministic mock) from config,
 *  - serialise prompts (real providers) or structured context (mock),
 *  - parse + repair malformed JSON (the #1 cause of "agent crashed" demos),
 *  - enforce a global call budget so a research run can never exceed
 *    `config.maxLlmCalls` — the hard backstop against runaway loops.
 *
 * Every call is rate-limited through a shared GapLimiter because we are on
 * free-tier quotas.
 */

const config = require('../config');
const { GapLimiter } = require('../lib/rate-limiter');
const gemini = require('./gemini');
const openai = require('./openai');
const mock = require('./mock');

const limiter = new GapLimiter({ minGapMs: config.llmMinIntervalMs, concurrency: 1 });

let callsMade = 0;

class LlmBudgetExceededError extends Error {
  constructor(limit) {
    super(`LLM call budget exhausted (${limit} calls)`);
    this.name = 'LlmBudgetExceededError';
  }
}

/** Resolve which provider to use, honouring an explicit override. */
const resolveProvider = () => {
  const wanted = config.llmProvider;
  if (wanted === 'gemini') return config.geminiApiKey ? 'gemini' : 'mock';
  if (wanted === 'openai') return config.openaiApiKey ? 'openai' : 'mock';
  if (wanted === 'mock') return 'mock';
  if (config.geminiApiKey) return 'gemini';
  if (config.openaiApiKey) return 'openai';
  return 'mock';
};

/** Pull the first parsable JSON object/array out of free-form model text. */
const parseJson = (text) => {
  const stripped = String(text)
    .replace(/```(?:json)?/gi, '')
    .trim();

  const candidates = [stripped];
  const objectStart = stripped.indexOf('{');
  const objectEnd = stripped.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(stripped.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = stripped.indexOf('[');
  const arrayEnd = stripped.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(stripped.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }

  throw new Error(`Model response was not valid JSON: ${stripped.slice(0, 200)}`);
};

const PROVIDERS = { gemini, openai, mock };

/**
 * Call the LLM for a specific agent purpose.
 *
 * @param {object} params
 * @param {'plan'|'extract'|'reflect'|'synthesize'} params.purpose
 * @param {string} params.system System prompt.
 * @param {string} params.prompt User prompt (ignored in mock mode).
 * @param {object} params.context Structured context handed to the mock provider.
 * @param {boolean} [params.raw=false] Return raw text instead of parsed JSON.
 * @returns {Promise<{data: any, meta: {provider: string, durationMs: number, repaired: boolean}}>}
 */
const call = async ({ purpose, system, prompt, context = {}, raw = false }) => {
  if (callsMade >= config.maxLlmCalls) {
    throw new LlmBudgetExceededError(config.maxLlmCalls);
  }

  let provider = resolveProvider();
  const startedAt = Date.now();
  callsMade += 1;

  // Mock mode is a direct structured call — no network, no parsing.
  if (provider === 'mock') {
    const data = await mock.complete({ purpose, context });
    return { data, meta: { provider: 'mock', durationMs: Date.now() - startedAt, repaired: false } };
  }

  let lastError;
  let repaired = false;

  for (let attempt = 0; attempt <= config.llmRepairAttempts; attempt += 1) {
    const attemptPrompt = attempt === 0 ? prompt : `${prompt}

Your previous reply could not be parsed: ${lastError.message}
Reply with ONLY a valid JSON value matching the requested shape. No prose, no code fences.`;

    try {
      // eslint-disable-next-line no-await-in-loop
      const text = await limiter.schedule(() =>
        PROVIDERS[provider].complete({ system, prompt: attemptPrompt })
      );

      if (raw) {
        return { data: text, meta: { provider, durationMs: Date.now() - startedAt, repaired } };
      }

      const data = parseJson(text);
      return { data, meta: { provider, durationMs: Date.now() - startedAt, repaired } };
    } catch (err) {
      lastError = err;
      repaired = attempt > 0;

      // A key/quota error will not fix itself on retry — degrade immediately.
      const fatal = /401|403|API key|quota/i.test(err.message || '');
      if (fatal) break;
    }
  }

  // Graceful degradation: a broken provider must not kill the research run.
  console.warn(`[agent] LLM ${provider} failed for "${purpose}": ${lastError?.message}. Falling back to deterministic mode.`);
  const data = await mock.complete({ purpose, context });
  return { data, meta: { provider: 'mock-fallback', durationMs: Date.now() - startedAt, repaired } };
};

const resetBudget = () => {
  callsMade = 0;
};

module.exports = {
  call,
  parseJson,
  resolveProvider,
  resetBudget,
  getCallsMade: () => callsMade,
  LlmBudgetExceededError,
};
