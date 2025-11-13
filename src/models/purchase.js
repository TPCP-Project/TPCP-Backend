const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPackage",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "VND",
      enum: ["VND", "USD"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "momo", "vnpay", "paypal", "credit_card"],
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    // Admin notification
    adminNotified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: {
      type: Date,
    },
    // Payment details
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Tự động set startDate và endDate khi purchase completed
purchaseSchema.pre("save", async function (next) {
  if (this.isModified("status") && this.status === "completed" && !this.startDate) {
    this.startDate = new Date();

    // Tính endDate dựa trên package duration
    const SubscriptionPackage = mongoose.model("SubscriptionPackage");
    const package = await SubscriptionPackage.findById(this.packageId);

    if (package) {
      const start = new Date(this.startDate);
      let end = new Date(start);

      switch (package.duration.unit) {
        case "days":
          end.setDate(end.getDate() + package.duration.value);
          break;
        case "months":
          end.setMonth(end.getMonth() + package.duration.value);
          break;
        case "years":
          end.setFullYear(end.getFullYear() + package.duration.value);
          break;
      }

      this.endDate = end;
      this.isActive = true;
    }
  }

  next();
});

module.exports = mongoose.model("Purchase", purchaseSchema);
