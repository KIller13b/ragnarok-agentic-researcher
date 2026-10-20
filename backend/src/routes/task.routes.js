const { Router } = require('express');
const ctrl = require('../controllers/task.controller');
const validate = require('../middlewares/validate.middleware');
const {
  researchIdParamAlt,
  createTaskSchema,
  createEvidenceSchema,
  createToolCallSchema,
} = require('../schemas/research.schema');

const router = Router({ mergeParams: true });

// Tasks
router
  .route('/:researchId/tasks')
  .get(validate(researchIdParamAlt), ctrl.listTasks)
  .post(validate(createTaskSchema), ctrl.createTask);

// Evidence
router
  .route('/:researchId/evidence')
  .get(validate(researchIdParamAlt), ctrl.listEvidence)
  .post(validate(createEvidenceSchema), ctrl.createEvidence);

// Tool Calls
router
  .route('/:researchId/tool-calls')
  .get(validate(researchIdParamAlt), ctrl.listToolCalls)
  .post(validate(createToolCallSchema), ctrl.createToolCall);

module.exports = router;
