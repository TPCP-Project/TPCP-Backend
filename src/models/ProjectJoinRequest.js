const mongoose = require("mongoose");
const { Schema } = mongoose;

const projectJoinRequestSchema = new Schema(
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
    invitation_id: {
      type: Schema.Types.ObjectId,
      ref: "ProjectInvitation",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
    request_date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processed_date: {
      type: Date,
    },
    processed_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Tạo index kết hợp để đảm bảo mỗi user chỉ có một request chờ duyệt trong mỗi project
projectJoinRequestSchema.index(
  { project_id: 1, user_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("ProjectJoinRequest", projectJoinRequestSchema);
