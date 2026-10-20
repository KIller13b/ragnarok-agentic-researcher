const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true },
    content: { type: String, required: true },
    evidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }],
    // Which reference numbers ([1], [2]…) back this section. The agent
    // injects the markers into `content` from these indexes, so the frontend
    // can map a citation marker straight back to its Evidence document.
    citationIndexes: [{ type: Number }],
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

const referenceSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' },
    title: { type: String },
    url: { type: String },
    sourceType: { type: String },
    qualityScore: { type: Number },
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
    title: { type: String },
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
    // ── Agent synthesis output ────────────────────────────────────────────
    // `markdown` is the fully rendered report with [1]…[n] citation markers
    // injected by the agent (never authored by the LLM). `references` maps
    // each marker back to the exact Evidence document it points at.
    markdown: { type: String },
    references: [referenceSchema],
    comparisonTable: {
      headers: [{ type: String }],
      rows: [[{ type: String }]],
    },
    citationCoverage: {
      type: Number,
      min: [0, 'citationCoverage must be at least 0'],
      max: [1, 'citationCoverage must be at most 1'],
    },
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
