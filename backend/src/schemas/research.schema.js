const { z } = require('zod');
const mongoose = require('mongoose');

// ---------- Helpers ----------

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

// ---------- Research schemas ----------

const createResearchSchema = z.object({
  body: z.object({
    question: z
      .string({ required_error: 'question is required' })
      .trim()
      .min(1, 'question must not be empty'),
    constraints: z
      .object({
        deadline: z.coerce.date().optional(),
        budget: z.number().min(0, 'budget must be non-negative').optional(),
        preferredSourceTypes: z.array(z.string().trim()).optional(),
        maxSources: z.number().int().min(1, 'maxSources must be at least 1').optional(),
      })
      .optional(),
  }),
});

const researchIdParam = z.object({
  params: z.object({
    id: objectId,
  }),
});

const researchRunSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

const researchIdParamAlt = z.object({
  params: z.object({
    researchId: objectId,
  }),
});

// ---------- Task schemas ----------

const createTaskSchema = z.object({
  params: z.object({
    researchId: objectId,
  }),
  body: z.object({
    title: z
      .string({ required_error: 'title is required' })
      .trim()
      .min(1, 'title must not be empty'),
    description: z.string().trim().optional(),
    order: z
      .number({ required_error: 'order is required' })
      .int('order must be an integer')
      .min(0, 'order must be non-negative'),
    searchQueries: z.array(z.string().trim().min(1)).optional(),
    origin: z.enum(['initial', 'followup', 'manual']).optional(),
    parentTaskId: objectId.optional(),
    spawnedAtIteration: z.number().int().min(0).optional(),
  }),
});

// ---------- Evidence schemas ----------

const createEvidenceSchema = z.object({
  params: z.object({
    researchId: objectId,
  }),
  body: z.object({
    title: z
      .string({ required_error: 'title is required' })
      .trim()
      .min(1, 'title must not be empty'),
    taskId: objectId.optional(),
    url: z.string().url('Invalid URL').optional(),
    sourceType: z
      .enum(['official', 'academic', 'news', 'blog', 'forum', 'documentation', 'other'])
      .optional(),
    snippet: z.string().optional(),
    extractedFacts: z
      .array(
        z.object({
          claim: z.string().min(1, 'claim is required'),
          supportingText: z.string().optional(),
        })
      )
      .optional(),
    qualityScore: z.number().min(0).max(1).optional(),
    retrievedAt: z.coerce.date().optional(),
  }),
});

// ---------- ToolCall schemas ----------

const createToolCallSchema = z.object({
  params: z.object({
    researchId: objectId,
  }),
  body: z.object({
    toolName: z
      .string({ required_error: 'toolName is required' })
      .trim()
      .min(1, 'toolName must not be empty'),
    taskId: objectId.optional(),
    input: z.any().optional(),
    outputSummary: z.string().optional(),
    status: z.enum(['pending', 'running', 'succeeded', 'failed']).optional(),
    durationMs: z.number().min(0).optional(),
    errorMessage: z.string().optional(),
  }),
});

// ---------- Report schemas ----------

const upsertReportSchema = z.object({
  params: z.object({
    researchId: objectId,
  }),
  body: z.object({
    executiveSummary: z.string().optional(),
    sections: z
      .array(
        z.object({
          heading: z.string().min(1, 'heading is required'),
          content: z.string().min(1, 'content is required'),
          evidenceIds: z.array(objectId).optional().default([]),
        })
      )
      .optional(),
    recommendation: z.string().optional(),
    confidenceScore: z.number().min(0).max(1).optional(),
    limitations: z.array(z.string()).optional(),
    conflicts: z
      .array(
        z.object({
          claim: z.string().min(1, 'claim is required'),
          description: z.string().min(1, 'description is required'),
          evidenceIds: z.array(objectId).optional().default([]),
        })
      )
      .optional(),
    verificationStatus: z.enum(['pending', 'verified', 'needs_review']).optional(),
    // Agent synthesis output (additive — manual upserts may omit all of these)
    title: z.string().optional(),
    markdown: z.string().optional(),
    references: z
      .array(
        z.object({
          index: z.number().int().min(1),
          evidenceId: objectId.optional(),
          title: z.string().optional(),
          url: z.string().optional(),
          sourceType: z.string().optional(),
          qualityScore: z.number().min(0).max(1).optional(),
        })
      )
      .optional(),
    comparisonTable: z
      .object({
        headers: z.array(z.string()),
        rows: z.array(z.array(z.string())),
      })
      .optional(),
    citationCoverage: z.number().min(0).max(1).optional(),
  }),
});

module.exports = {
  objectId,
  createResearchSchema,
  researchIdParam,
  researchIdParamAlt,
  researchRunSchema,
  createTaskSchema,
  createEvidenceSchema,
  createToolCallSchema,
  upsertReportSchema,
};
