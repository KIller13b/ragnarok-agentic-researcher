const mongoose = require('mongoose');

// ── Live agent observability streams ──────────────────────────────────────
// `agentLog` is the agent's running "thoughts" feed (what the dashboard
// streams); `reflectionLog` records each reflection pass, i.e. the gaps,
// conflicts and follow-up subtasks the agent found. Both are capped with
// $slice at write time so they can never grow unbounded.

const agentLogEntrySchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    phase: { type: String },
    message: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reflectionLogEntrySchema = new mongoose.Schema(
  {
    iteration: { type: Number },
    gapsFound: { type: Number },
    conflictsFound: { type: Number },
    followupsSpawned: { type: Number },
    confidence: { type: Number },
    gapDetails: [{ type: String }],
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const researchSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Research question is required'],
      trim: true,
    },
    constraints: {
      deadline: { type: Date },
      budget: { type: Number, min: [0, 'Budget cannot be negative'] },
      preferredSourceTypes: [{ type: String, trim: true }],
      maxSources: { type: Number, min: [1, 'maxSources must be at least 1'] },
    },
    status: {
      type: String,
      enum: [
        'queued',
        'planning',
        'researching',
        'evaluating',
        'generating_report',
        'completed',
        'failed',
      ],
      default: 'queued',
    },
    errorMessage: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    // ── Agent observability ───────────────────────────────────────────────
    agentLog: [agentLogEntrySchema],
    reflectionLog: [reflectionLogEntrySchema],
  },
  { timestamps: true }
);

// Index for listing & filtering by status
researchSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Research', researchSchema);
