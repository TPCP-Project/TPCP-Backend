const mongoose = require("mongoose");

const subscriptionPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "VND",
      enum: ["VND", "USD"],
    },
    duration: {
      value: {
        type: Number,
        required: true,
        min: 1,
      },
      unit: {
        type: String,
        enum: ["days", "months", "years"],
        default: "months",
      },
    },
    features: [
      {
        name: String,
        value: String,
        enabled: { type: Boolean, default: true },
      },
    ],
    limits: {
      maxProjects: { type: Number, default: 5 },
      maxMembers: { type: Number, default: 10 },
      maxStorage: { type: Number, default: 1024 }, // MB
      maxTasks: { type: Number, default: 100 },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SubscriptionPackage",
  subscriptionPackageSchema
);
