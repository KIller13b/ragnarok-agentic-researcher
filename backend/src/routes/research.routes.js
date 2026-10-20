const { Router } = require('express');
const ctrl = require('../controllers/research.controller');
const validate = require('../middlewares/validate.middleware');
const { createResearchSchema, researchIdParam, researchRunSchema } = require('../schemas/research.schema');

const router = Router();

router
  .route('/')
  .post(validate(createResearchSchema), ctrl.createResearch)
  .get(ctrl.listResearch);

router
  .route('/:id')
  .get(validate(researchIdParam), ctrl.getResearch)
  .delete(validate(researchIdParam), ctrl.deleteResearch);

// Manually (re)start the agent for a session — demo recovery + retry control.
router.post('/:id/run', validate(researchRunSchema), ctrl.runResearch);

// Live agent feed (status + thoughts + reflection passes) for polling.
router.get('/:id/activity', validate(researchIdParam), ctrl.getActivity);

module.exports = router;
