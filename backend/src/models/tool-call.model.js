const mongoose = require('mongoose');

const toolCallSchema = new mongoose.Schema(
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
    toolName: {
      type: String,
      required: [true, 'toolName is required'],
      trim: true,
    },
    input: { type: mongoose.Schema.Types.Mixed },
    outputSummary: { type: String },
    status: {
      type: String,
      enum: ['pending', 'running', 'succeeded', 'failed'],
      default: 'pending',
    },
    durationMs: {
      type: Number,
      min: [0, 'durationMs cannot be negative'],
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Compound index for filtered listing
toolCallSchema.index({ researchId: 1, status: 1 });

module.exports = mongoose.model('ToolCall', toolCallSchema);
