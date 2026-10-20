const mongoose = require('mongoose');

const extractedFactSchema = new mongoose.Schema(
  {
    claim: { type: String, required: true },
    supportingText: { type: String },
  },
  { _id: false }
);

const evidenceSchema = new mongoose.Schema(
  {
    researchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Research',
      required: [true, 'researchId is required'],
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    title: {
      type: String,
      required: [true, 'Evidence title is required'],
      trim: true,
    },
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid URL format',
      },
    },
    sourceType: {
      type: String,
      enum: ['official', 'academic', 'news', 'blog', 'forum', 'documentation', 'other'],
    },
    snippet: { type: String },
    extractedFacts: [extractedFactSchema],
    qualityScore: {
      type: Number,
      min: [0, 'qualityScore must be at least 0'],
      max: [1, 'qualityScore must be at most 1'],
    },
    retrievedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Evidence', evidenceSchema);
