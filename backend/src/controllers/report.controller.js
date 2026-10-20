const Report = require('../models/report.model');
const Research = require('../models/research.model');
const Evidence = require('../models/evidence.model');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/v1/research/:researchId/report
 */
const getReport = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    const report = await Report.findOne({ researchId }).lean();
    if (!report) throw new ApiError(404, 'Report not found for this research session');

    return res.json({
      success: true,
      message: 'Report fetched',
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/research/:researchId/report
 * Create or replace the report for a research session.
 */
const upsertReport = async (req, res, next) => {
  try {
    const { researchId } = req.params;
    const research = await Research.findById(researchId);
    if (!research) throw new ApiError(404, 'Research session not found');

    // Collect all evidenceIds referenced in sections and conflicts
    const referencedIds = new Set();
    (req.body.sections || []).forEach((s) =>
      (s.evidenceIds || []).forEach((id) => referencedIds.add(id))
    );
    (req.body.conflicts || []).forEach((c) =>
      (c.evidenceIds || []).forEach((id) => referencedIds.add(id))
    );

    // Verify that every referenced evidence belongs to this research session
    if (referencedIds.size > 0) {
      const ids = [...referencedIds];
      const count = await Evidence.countDocuments({
        _id: { $in: ids },
        researchId,
      });
      if (count !== ids.length) {
        throw new ApiError(
          400,
          'One or more evidenceIds do not belong to this research session'
        );
      }
    }

    const reportData = {
      ...req.body,
      researchId,
      generatedAt: new Date(),
    };

    const report = await Report.findOneAndUpdate(
      { researchId },
      { $set: reportData },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({
      success: true,
      message: 'Report saved',
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReport,
  upsertReport,
};
