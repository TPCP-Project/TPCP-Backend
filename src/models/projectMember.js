const mongoose = require("mongoose");
const { Schema } = mongoose;

const projectMemberSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      required: true,
      default: "member",
      index: true,
    },
    permissions: {
      canInvite: { type: Boolean, default: true },
      canApproveMembers: { type: Boolean, default: false },
      canManageTasks: { type: Boolean, default: true },
    },
    invited_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    invitation_id: {
      type: Schema.Types.ObjectId,
      ref: "ProjectInvitation",
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

// Index kết hợp để đảm bảo mỗi user chỉ là member một lần trong project
projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model("ProjectMember", projectMemberSchema);
