const mongoose = require('mongoose');
const Research = require('../models/research.model');
const Task = require('../models/task.model');
const Evidence = require('../models/evidence.model');
const ToolCall = require('../models/tool-call.model');
const Report = require('../models/report.model');
const ApiError = require('../utils/ApiError');

/**
 * Create a new research session.
 * The session starts in `queued` status — no AI work happens here.
 */
const createResearch = async ({ question, constraints }) => {
  const research = await Research.create({ question, constraints });

  // ──────────────────────────────────────────────────────────
  // TODO: Agent integration placeholder
  //
  // After the research document is persisted you would
  // eventually kick off the autonomous agent pipeline here:
  //
  //   await agentService.startResearch(research._id);
  //
  // That service would transition the status through
  //   queued → planning → researching → evaluating →
  //   generating_report → completed | failed
  //
  // For now the record stays in "queued" until the agent
  // service is implemented.
  // ──────────────────────────────────────────────────────────

  return research;
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
  listResearch,
  findResearchById,
  deleteResearch,
};
