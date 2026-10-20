const mongoose = require('mongoose');
const Research = require('../models/research.model');
const Task = require('../models/task.model');
const Evidence = require('../models/evidence.model');
const ToolCall = require('../models/tool-call.model');
const Report = require('../models/report.model');
const ApiError = require('../utils/ApiError');
const agent = require('../agent/agent.service');
const agentConfig = require('../agent/config');

/**
 * Create a new research session.
 * The session starts in `queued` and the agent pipeline takes it from there:
 *   queued → planning → researching ⇄ evaluating → generating_report → completed
 *
 * The agent runs asynchronously (fire-and-forget) so this endpoint returns
 * immediately and the frontend can poll the live status.
 */
const createResearch = async ({ question, constraints }) => {
  const research = await Research.create({ question, constraints });

  if (agentConfig.autoStart) {
    // setImmediate: let the HTTP response flush before the agent starts
    // issuing LLM / search calls on the event loop.
    setImmediate(() => {
      agent.startResearch(research._id).catch((err) => {
        console.error(`[agent] failed to start for ${research._id}:`, err.message);
      });
    });
  } else {
    console.warn(`[agent] AGENT_ENABLED=false — session ${research._id} stays queued.`);
  }

  return research;
};

/**
 * Manually (re)start the agent for an existing session.
 * Used by the dashboard's "Run agent" / retry controls.
 */
const runResearch = async (id) => {
  const research = await Research.findById(id).lean();
  if (!research) throw new ApiError(404, 'Research session not found');

  if (agent.isRunning(id)) {
    throw new ApiError(409, 'Agent is already running for this session');
  }

  // A completed session may only be re-run after clearing its derived data.
  if (research.status === 'completed') {
    throw new ApiError(409, 'Session already completed — delete and start a new research session');
  }

  setImmediate(() => {
    agent.startResearch(id).catch((err) => {
      console.error(`[agent] failed to start for ${id}:`, err.message);
    });
  });

  return { queued: true };
};

/**
 * List research sessions with pagination and optional status filter.
 */
const listResearch = async ({ page = 1, limit = 10, status } = {}) => {
  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Research.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Research.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
};

/**
 * Find a single research session by ID.
 * Throws 404 if not found.
 */
const findResearchById = async (id) => {
  const research = await Research.findById(id).lean();
  if (!research) throw new ApiError(404, 'Research session not found');
  return research;
};

/**
 * Live activity feed for a session (status + agent log + reflection log).
 */
const findActivityById = async (id) => {
  const research = await Research.findById(id)
    .select('status errorMessage startedAt completedAt updatedAt agentLog reflectionLog')
    .lean();
  if (!research) throw new ApiError(404, 'Research session not found');
  return research;
};

/**
 * Delete a research session and all related data.
 * Uses a transaction when replica-set / Atlas is available;
 * falls back to sequential deletes otherwise.
 */
const deleteResearch = async (id) => {
  const research = await Research.findById(id);
  if (!research) throw new ApiError(404, 'Research session not found');

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await Report.deleteMany({ researchId: id }, { session });
    await ToolCall.deleteMany({ researchId: id }, { session });
    await Evidence.deleteMany({ researchId: id }, { session });
    await Task.deleteMany({ researchId: id }, { session });
    await Research.findByIdAndDelete(id, { session });

    await session.commitTransaction();
  } catch (txErr) {
    await session.abortTransaction().catch(() => {});

    // Standalone MongoDB doesn't support transactions — fall back
    if (
      txErr.message &&
      (txErr.message.includes('Transaction') || txErr.codeName === 'IllegalOperation')
    ) {
      await Report.deleteMany({ researchId: id });
      await ToolCall.deleteMany({ researchId: id });
      await Evidence.deleteMany({ researchId: id });
      await Task.deleteMany({ researchId: id });
      await Research.findByIdAndDelete(id);
    } else {
      throw txErr;
    }
  } finally {
    session.endSession();
  }
};

module.exports = {
  createResearch,
  runResearch,
  listResearch,
  findResearchById,
  findActivityById,
  deleteResearch,
};
