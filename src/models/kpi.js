const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    target: { type: Number, required: true, min: 0 },
    actual: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true },
    weight: { type: Number, required: true, min: 1, max: 100 },
    progress: { type: Number, default: 0 },
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
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM format"],
    },
    goals: {
      type: [goalSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one goal is required",
      },
    },
    status: {
      type: String,
      enum: ["Pending", "InProgress", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// 🧮 Tự động tính tiến độ trung bình
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

module.exports = mongoose.model("Kpi", kpiSchema);
