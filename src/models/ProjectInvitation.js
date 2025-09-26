const mongoose = require("mongoose");
const { Schema } = mongoose;

const projectInvitationSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    invite_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiry_date: {
      type: Date,
      required: true,
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Tự động tạo index cho trường invite_code để tìm kiếm nhanh
projectInvitationSchema.index({ invite_code: 1 });

module.exports = mongoose.model("ProjectInvitation", projectInvitationSchema);
