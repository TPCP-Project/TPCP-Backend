const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Goal title is required"],
    },
    target: {
      type: Number,
      required: [true, "Target value is required"],
      min: 0,
    },
    actual: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
    },
    weight: {
      type: Number,
      required: [true, "Weight is required"],
      min: 1,
      max: 100,
    },
    progress: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const kpiSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    month: {
      type: String,
      required: [true, "Month is required"],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"],
    },
    goals: {
      type: [goalSchema],
      default: [],
    },
    taskMetrics: {
      totalTasksAssigned: { type: Number, default: 0 },
      tasksCompleted: { type: Number, default: 0 },
      tasksInProgress: { type: Number, default: 0 },
      tasksBlocked: { type: Number, default: 0 },
      tasksOverdue: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      onTimeRate: { type: Number, default: 0 },
      averageCompletionTime: { type: Number, default: 0 },
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["Pending", "InProgress", "Completed", "Good", "Warning", "Critical"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// 🧮 Tự động tính tiến độ cho goals
kpiSchema.pre("save", function (next) {
  if (this.goals && this.goals.length > 0) {
    this.goals.forEach((goal) => {
      if (goal.target > 0) {
        goal.progress = Math.min((goal.actual / goal.target) * 100, 100);
      } else {
        goal.progress = 0;
      }
    });
  }
  next();
});

// 🎯 Method để tính overall score
kpiSchema.methods.calculateOverallScore = function() {
  const weights = {
    completionRate: 0.4,    // 40% - Completion rate
    onTimeRate: 0.3,        // 30% - On-time completion
    blockedPenalty: -0.1,   // -10% - Penalty for blocked tasks
  };

  let score = 0;

  // Calculate from taskMetrics
  if (this.taskMetrics) {
    score += (this.taskMetrics.completionRate || 0) * weights.completionRate;
    score += (this.taskMetrics.onTimeRate || 0) * weights.onTimeRate;

    // Penalty for blocked tasks
    if (this.taskMetrics.totalTasksAssigned > 0) {
      const blockedRatio = (this.taskMetrics.tasksBlocked / this.taskMetrics.totalTasksAssigned) * 100;
      score += blockedRatio * weights.blockedPenalty;
    }
  }

  this.overallScore = Math.max(0, Math.min(100, Math.round(score)));

  // Update status based on score
  if (this.overallScore >= 70) {
    this.status = "Good";
  } else if (this.overallScore >= 50) {
    this.status = "Warning";
  } else {
    this.status = "Critical";
  }

  return this.overallScore;
};

// 🔑 Compound unique index để support multiple projects
kpiSchema.index({ employeeId: 1, projectId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Kpi", kpiSchema);
