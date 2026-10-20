const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true },
    content: { type: String, required: true },
    evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
  },
  { _id: false }
);

const conflictSchema = new mongoose.Schema(
  {
    claim: { type: String, required: true },
    description: { type: String, required: true },
    evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    researchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Research',
      required: [true, 'researchId is required'],
      unique: true,
    },
    executiveSummary: { type: String },
    sections: [sectionSchema],
    recommendation: { type: String },
    confidenceScore: {
      type: Number,
      min: [0, 'confidenceScore must be at least 0'],
      max: [1, 'confidenceScore must be at most 1'],
    },
    limitations: [{ type: String }],
    conflicts: [conflictSchema],
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'needs_review'],
      default: 'pending',
    },
    generatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
