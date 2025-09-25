const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true }, /*  không nên unique */
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: {
      url: { type: String, default: "" },
      filename: String,
      mimetype: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },

    isVerified: { type: Boolean, default: false },
    isUnlimited: { type: Boolean, default: false },

    // Trạng thái tài khoản (thay vì status===inactive rời rạc) 
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "inactive",
      index: true,
    },

    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
      required: true,
    },

    // Ban info 
    isBanned: { type: Boolean, default: false, index: true },
    bannedAt: Date,
    banReason: String,
    bannedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Email verify 
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // Password reset 
    passwordResetToken: String,
    passwordResetExpires: Date,

    subscription_id: { type: String },
  },
  { timestamps: true }
);

// Virtual: reverse relation to customers owned by this user 
userSchema.virtual("customers", {
  ref: "Customer",
  localField: "_id",
  foreignField: "ownerId",
});

userSchema.pre("save", function (next) {
  if (this.isBanned && !this.bannedAt) this.bannedAt = new Date();
  if (!this.isBanned) {
    this.bannedAt = null;
    this.banReason = null;
    this.bannedBy = null;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
