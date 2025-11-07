const mongoose = require("mongoose");

// Subtask schema
const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// Task schema
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
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    subtasks: [subtaskSchema],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    dueDate: Date,
    completedAt: Date,
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

// ✅ Define indexes (for KPI and reporting queries)
taskSchema.index({ assignedTo: 1, status: 1, completedAt: 1 });
taskSchema.index({ projectId: 1, sprint: 1 });
taskSchema.index({ projectId: 1, status: 1 });

// ✅ Middleware: Auto-update isOverdue + completedAt
taskSchema.pre("save", function (next) {
  // Auto-check overdue
  if (this.dueDate && this.status !== "APPROVED" && this.status !== "Done") {
    this.isOverdue = new Date() > this.dueDate;
  } else {
    this.isOverdue = false;
  }

  // Auto-set completedAt
  if (this.status === "APPROVED" && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

// ✅ Export model ONCE (after schema setup)
module.exports = mongoose.model("Task", taskSchema);
