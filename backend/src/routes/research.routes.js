const { Router } = require('express');
const ctrl = require('../controllers/research.controller');
const validate = require('../middlewares/validate.middleware');
const { createResearchSchema, researchIdParam } = require('../schemas/research.schema');

const router = Router();

router
  .route('/')
  .post(validate(createResearchSchema), ctrl.createResearch)
  .get(ctrl.listResearch);

router
  .route('/:id')
  .get(validate(researchIdParam), ctrl.getResearch)
  .delete(validate(researchIdParam), ctrl.deleteResearch);

module.exports = router;
