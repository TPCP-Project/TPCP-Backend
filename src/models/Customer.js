const mongoose = require("mongoose");
const { Schema } = mongoose;

const customerSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: { type: String, required: true, unique: true, index: true },
    businessName: { type: String },
    subscriptionPlan: {
      type: String,
      enum: ["basic", "pro", "enterprise"],
      default: "basic"
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "pending",
      index: true,
    },
    subscriptionExpiresAt: { 
      type: Date,
      index: true 
    },
    paymentInfo: {
      orderId: { type: String },
      transactionNo: { type: String },
      amount: { type: Number },
      payDate: { type: String },
      paymentMethod: { type: String, default: "vnpay" }
    },
    fbPageId: { type: String },
    // Consider encrypting at app/service layer or via mongoose-field-encryption
    fbPageAccessToken: { type: String, select: false },
    chatbotSettings: {
      tone: { type: String, default: "professional" },
      greeting: { type: String },
      language: { type: String, default: "vi" },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
