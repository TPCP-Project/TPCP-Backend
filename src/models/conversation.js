const mongoose = require("mongoose");
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    // Loại conversation
    type: {
      type: String,
      enum: ["project", "direct"],
      required: true,
      index: true,
    },

    // Thông tin project (chỉ cho type: "project")
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },

    // Tên conversation
    name: {
      type: String,
      trim: true,
    },

    // Mô tả conversation
    description: {
      type: String,
      trim: true,
    },

    // Avatar conversation
    avatar: {
      url: { type: String, default: "" },
      filename: String,
      mimetype: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },

    // Người tạo conversation
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Cài đặt conversation
    settings: {
      allow_member_invite: { type: Boolean, default: true },
      allow_file_sharing: { type: Boolean, default: true },
      allow_message_edit: { type: Boolean, default: true },
      allow_message_delete: { type: Boolean, default: true },
      message_retention_days: { type: Number, default: 30 },
    },

    // Trạng thái conversation
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
      index: true,
    },

    // Thống kê
    stats: {
      total_messages: { type: Number, default: 0 },
      total_participants: { type: Number, default: 0 },
      last_message_at: { type: Date },
      last_message_by: { type: Schema.Types.ObjectId, ref: "User" },
    },

    // Metadata
    metadata: {
      is_encrypted: { type: Boolean, default: false },
      encryption_key: String,
    },
  },
  { timestamps: true }
);

// Index cho tìm kiếm
conversationSchema.index({
  type: 1,
  project_id: 1,
  status: 1,
});

// Index cho text search
conversationSchema.index({
  name: "text",
  description: "text",
});

// Middleware để cập nhật stats
conversationSchema.pre("save", function (next) {
  if (this.isModified("stats.total_participants")) {
    this.stats.total_participants = Math.max(0, this.stats.total_participants);
  }
  next();
});

module.exports = mongoose.model("Conversation", conversationSchema);
