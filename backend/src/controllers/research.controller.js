const researchService = require('../services/research.service');

/**
 * POST /api/v1/research
 */
const createResearch = async (req, res, next) => {
  try {
    const research = await researchService.createResearch(req.body);
    return res.status(201).json({
      success: true,
      message: 'Research session created',
      data: research,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/research
 */
const listResearch = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const { status } = req.query;

    const result = await researchService.listResearch({ page, limit, status });
    return res.json({
      success: true,
      message: 'Research sessions fetched',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/research/:id
 */
const getResearch = async (req, res, next) => {
  try {
    const research = await researchService.findResearchById(req.params.id);
    return res.json({
      success: true,
      message: 'Research session fetched',
      data: research,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/research/:id
 */
const deleteResearch = async (req, res, next) => {
  try {
    await researchService.deleteResearch(req.params.id);
    return res.json({
      success: true,
      message: 'Research session and related data deleted',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createResearch,
  listResearch,
  getResearch,
  deleteResearch,
};
