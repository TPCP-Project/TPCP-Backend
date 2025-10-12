const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatParticipantSchema = new Schema(
  {
    // Conversation
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    // User tham gia
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Vai trò trong conversation
    role: {
      type: String,
      enum: ["admin", "moderator", "member"],
      default: "member",
      index: true,
    },

    // Quyền hạn
    permissions: {
      can_send_messages: { type: Boolean, default: true },
      can_send_files: { type: Boolean, default: true },
      can_invite_members: { type: Boolean, default: false },
      can_remove_members: { type: Boolean, default: false },
      can_edit_conversation: { type: Boolean, default: false },
      can_delete_messages: { type: Boolean, default: false },
      can_pin_messages: { type: Boolean, default: false },
    },

    // Trạng thái tham gia
    status: {
      type: String,
      enum: ["active", "muted", "left", "removed"],
      default: "active",
      index: true,
    },

    // Thời gian tham gia
    joined_at: {
      type: Date,
      default: Date.now,
    },

    // Người mời tham gia
    invited_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Thời gian rời khỏi
    left_at: Date,

    // Lý do rời khỏi
    left_reason: String,

    // Cài đặt cá nhân
    settings: {
      notifications: {
        message_notifications: { type: Boolean, default: true },
        mention_notifications: { type: Boolean, default: true },
        sound_notifications: { type: Boolean, default: true },
        email_notifications: { type: Boolean, default: false },
      },
      privacy: {
        show_online_status: { type: Boolean, default: true },
        show_read_receipts: { type: Boolean, default: true },
        show_typing_status: { type: Boolean, default: true },
      },
    },

    // Thống kê
    stats: {
      total_messages_sent: { type: Number, default: 0 },
      last_message_at: Date,
      last_seen_at: { type: Date, default: Date.now },
      unread_count: { type: Number, default: 0 },
    },

    // Metadata
    metadata: {
      is_muted: { type: Boolean, default: false },
      muted_until: Date,
      mute_reason: String,
    },
  },
  { timestamps: true }
);

// Index kết hợp để đảm bảo mỗi user chỉ tham gia một lần trong conversation
chatParticipantSchema.index(
  {
    conversation_id: 1,
    user_id: 1,
  },
  { unique: true }
);

// Index cho tìm kiếm
chatParticipantSchema.index({
  conversation_id: 1,
  status: 1,
});

chatParticipantSchema.index({
  user_id: 1,
  status: 1,
});

// Middleware để cập nhật conversation stats
chatParticipantSchema.post("save", async function () {
  if (this.isNew && this.status === "active") {
    const Conversation = require("./conversation");
    await Conversation.findByIdAndUpdate(this.conversation_id, {
      $inc: { "stats.total_participants": 1 },
    });
  }
});

chatParticipantSchema.post("findOneAndUpdate", async function () {
  if (this.status === "left" || this.status === "removed") {
    const Conversation = require("./conversation");
    await Conversation.findByIdAndUpdate(this.conversation_id, {
      $inc: { "stats.total_participants": -1 },
    });
  }
});

module.exports = mongoose.model("ChatParticipant", chatParticipantSchema);
