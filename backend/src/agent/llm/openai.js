/**
 * OpenAI chat-completions REST client (no SDK dependency).
 *
 * Secondary provider — used when OPENAI_API_KEY is set and Gemini is absent
 * or failing. `response_format: json_object` guarantees parsable output.
 */

const config = require('../config');

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * @param {object} params
 * @param {string} params.system System message.
 * @param {string} params.prompt User message.
 * @param {string} [params.model]
 * @returns {Promise<string>} Raw text of the completion.
 */
const complete = async ({ system, prompt, model = config.openaiModel }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`OpenAI ${response.status}: ${body.slice(0, 400)}`);
    }

    const parsed = JSON.parse(body);
    const text = parsed?.choices?.[0]?.message?.content || '';

    if (!text) throw new Error('OpenAI returned an empty completion');

    return text;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { complete };
