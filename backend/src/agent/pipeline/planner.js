/**
 * PHASE 1 — PLANNING (decomposition)
 *
 * Turns the user's research question into 3-4 bounded subtasks, each with its
 * own search queries. This is the "Planning & Decomposition" pillar: the agent
 * does not answer in one shot, it builds a work queue.
 *
 * Follow-up tasks spawned later by the reflector are marked
 * `origin: 'followup'` so the dashboard can visualise autonomous re-planning.
 */

const Task = require('../../models/task.model');
const config = require('../config');
const llm = require('../llm/client');

const SYSTEM = `You are the planning module of an autonomous research agent.
Decompose the user's research question into a small set of independent,
investigable subtasks. Each subtask must be answerable from web sources.
Return ONLY JSON: {"subtasks":[{"title":"...","description":"...","searchQueries":["query one","query two"]}]}
Rules: 3 to 4 subtasks; each title under 80 characters; 1-2 highly specific
search queries per subtask (no generic single-word queries); cover different
aspects (definition/how-it-works, constraints or cost, independent
evaluation, and recent developments).`;

/** Defensive cleanup of whatever the model returned. */
const sanitiseSubtasks = (payload, question) => {
  const raw = Array.isArray(payload?.subtasks) ? payload.subtasks : Array.isArray(payload) ? payload : [];

  const subtasks = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      title: String(item.title || '').trim().slice(0, 120),
      description: String(item.description || '').trim().slice(0, 500),
      searchQueries: (Array.isArray(item.searchQueries) ? item.searchQueries : [])
        .map((query) => String(query || '').trim())
        .filter(Boolean)
        .slice(0, config.maxQueriesPerTask),
    }))
    .filter((item) => item.title && item.searchQueries.length > 0)
    .slice(0, config.maxTasks);

  // Last-resort guarantee: the pipeline needs at least one subtask.
  if (subtasks.length === 0) {
    subtasks.push({
      title: `Investigate: ${question.slice(0, 80)}`,
      description: 'Initial decomposition was unavailable; researching the question directly.',
      searchQueries: [question.slice(0, 120)],
    });
  }

  return subtasks;
};

/**
 * @param {object} research Lean research document.
 * @param {Tracer} tracer
 * @returns {Promise<Array>} Created task documents.
 */
const planResearch = async (research, tracer) => {
  const constraintNotes = [];
  if (research.constraints?.maxSources) {
    constraintNotes.push(`- Use at most ${research.constraints.maxSources} distinct sources in total.`);
  }
  if (research.constraints?.preferredSourceTypes?.length) {
    constraintNotes.push(
      `- Prefer these source types: ${research.constraints.preferredSourceTypes.join(', ')}.`
    );
  }
  if (research.constraints?.deadline) {
    constraintNotes.push(`- The user needs this by ${new Date(research.constraints.deadline).toDateString()}; favour recent sources.`);
  }

  const prompt = `Research question:
${research.question}

${constraintNotes.join('\n') || '- No extra constraints were provided.'}`;

  await tracer.log('planning', 'Decomposing the research question into subtasks…');

  const { data, meta } = await llm.call({
    purpose: 'plan',
    system: SYSTEM,
    prompt,
    context: {
      question: research.question,
      subtaskCount: 4,
    },
  });

  const subtasks = sanitiseSubtasks(data, research.question);

  const docs = await Task.insertMany(
    subtasks.map((subtask, index) => ({
      researchId: research._id,
      title: subtask.title,
      description: subtask.description,
      searchQueries: subtask.searchQueries,
      order: index,
      status: 'pending',
      origin: 'initial',
    }))
  );

  await tracer.log(
    'planning',
    `Created ${docs.length} subtasks via ${meta.provider}.`,
    { taskIds: docs.map((doc) => doc._id.toString()) }
  );

  return docs;
};

module.exports = { planResearch, sanitiseSubtasks };
