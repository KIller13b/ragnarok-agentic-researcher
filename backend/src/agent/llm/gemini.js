/**
 * Google Gemini REST client (no SDK dependency).
 *
 * Chosen for the free tier: no billing account, ~15 req/min and ~1,500 req/day
 * on gemini-2.0-flash, plus native JSON responses. We talk to the REST API
 * directly with global fetch so the backend has zero extra dependencies.
 */

const config = require('../config');

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * @param {object} params
 * @param {string} params.system System instruction.
 * @param {string} params.prompt User prompt.
 * @param {string} [params.model]
 * @returns {Promise<string>} Raw text of the completion.
 */
const complete = async ({ system, prompt, model = config.geminiModel }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(`${ENDPOINT(model)}?key=${config.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      // Surface the provider's message — the client layer retries/reports it.
      throw new Error(`Gemini ${response.status}: ${body.slice(0, 400)}`);
    }

    const parsed = JSON.parse(body);
    const parts = parsed?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((part) => part.text || '').join('');

    if (!text) {
      throw new Error(
        `Gemini returned an empty completion (finishReason=${parsed?.candidates?.[0]?.finishReason || 'unknown'})`
      );
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { complete };
