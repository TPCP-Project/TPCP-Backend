const mongoose = require("mongoose");

// Subtask schema
const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const taskSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["TO_DO", "DRAFTING", "IN_REVIEW", "APPROVED", "BLOCKED"],
      default: "TO_DO",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    sprint: {
      type: String,
      trim: true,
    },
    labels: [{
      type: String,
      trim: true,
    }],
    subtasks: [subtaskSchema],
    attachments: [{
      filename: String,
      originalName: String,
      url: String,
      size: Number,
      mimetype: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      }
    }],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    isOverdue: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for KPI queries
taskSchema.index({ assignedTo: 1, status: 1, completedAt: 1 });
taskSchema.index({ projectId: 1, sprint: 1 });
taskSchema.index({ projectId: 1, status: 1 });

// Auto-update isOverdue field
taskSchema.pre('save', function(next) {
  if (this.dueDate && this.status !== 'APPROVED' && this.status !== 'Done') {
    this.isOverdue = new Date() > this.dueDate;
  } else {
    this.isOverdue = false;
  }

  // Set completedAt when task is marked as APPROVED
  if (this.status === 'APPROVED' && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

module.exports = mongoose.model("Task", taskSchema);
