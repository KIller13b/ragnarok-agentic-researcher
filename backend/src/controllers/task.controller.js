const Task = require('../models/task.model');
const Evidence = require('../models/evidence.model');
const ToolCall = require('../models/tool-call.model');
const Research = require('../models/research.model');
const ApiError = require('../utils/ApiError');

// ────────── Tasks ──────────

/**
 * GET /api/v1/research/:researchId/tasks
 */
const listTasks = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    const tasks = await Task.find({ researchId }).sort({ order: 1 }).lean();
    return res.json({
      success: true,
      message: 'Tasks fetched',
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/research/:researchId/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    const task = await Task.create({ researchId, ...req.body });
    return res.status(201).json({
      success: true,
      message: 'Task created',
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// ────────── Evidence ──────────

/**
 * GET /api/v1/research/:researchId/evidence
 */
const listEvidence = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    const filter = { researchId };
    if (req.query.sourceType) filter.sourceType = req.query.sourceType;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Evidence.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Evidence.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: 'Evidence fetched',
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/research/:researchId/evidence
 */
const createEvidence = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    const evidence = await Evidence.create({ researchId, ...req.body });
    return res.status(201).json({
      success: true,
      message: 'Evidence created',
      data: evidence,
    });
  } catch (err) {
    next(err);
  }
};

// ────────── Tool Calls ──────────

/**
 * GET /api/v1/research/:researchId/tool-calls
 */
const listToolCalls = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    const filter = { researchId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.toolName) filter.toolName = req.query.toolName;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      ToolCall.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ToolCall.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: 'Tool calls fetched',
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/research/:researchId/tool-calls
 */
const createToolCall = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    const toolCall = await ToolCall.create({ researchId, ...req.body });
    return res.status(201).json({
      success: true,
      message: 'Tool call created',
      data: toolCall,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTasks,
  createTask,
  listEvidence,
  createEvidence,
  listToolCalls,
  createToolCall,
};
