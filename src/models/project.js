const mongoose = require("mongoose");
const { Schema } = mongoose;

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
      index: true,
    },
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    auto_approve_members: {
      type: Boolean,
      default: false,
    },
    // Đây là một trường mới để lưu trữ các cài đặt dành riêng cho project
    settings: {
      allowInvitationByMembers: { type: Boolean, default: true },
      requireApprovalForJoining: { type: Boolean, default: true },
      autoDeletePendingRequests: { type: Number, default: 5 }, // Số ngày tự động xóa request chờ duyệt
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
