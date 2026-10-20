const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

// Index for listing & filtering by status
researchSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Research', researchSchema);
