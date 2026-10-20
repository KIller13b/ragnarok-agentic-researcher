const { Router } = require('express');
const ctrl = require('../controllers/report.controller');
const validate = require('../middlewares/validate.middleware');
const { researchIdParamAlt, upsertReportSchema } = require('../schemas/research.schema');

const router = Router({ mergeParams: true });

router
  .route('/:researchId/report')
  .get(validate(researchIdParamAlt), ctrl.getReport)
  .put(validate(upsertReportSchema), ctrl.upsertReport);

module.exports = router;
