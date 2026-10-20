const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    researchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Research',
      required: [true, 'researchId is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    order: {
      type: Number,
      required: [true, 'Task order is required'],
      min: [0, 'Order cannot be negative'],
    },
    resultSummary: { type: String },
  },
  { timestamps: true }
);

// Compound index to fetch tasks for a research session in order
taskSchema.index({ researchId: 1, order: 1 });

module.exports = mongoose.model('Task', taskSchema);
