const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    // Conversation chứa message này
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    // Người gửi message
    sender_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Nội dung message
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Loại message
    message_type: {
      type: String,
      enum: ["text", "image", "file", "system", "announcement"],
      default: "text",
      index: true,
    },

    // File đính kèm
    attachments: [
      {
        filename: { type: String, required: true },
        original_name: { type: String, required: true },
        url: { type: String, required: true },
        mimetype: { type: String, required: true },
        size: { type: Number, required: true },
        uploaded_at: { type: Date, default: Date.now },
      },
    ],

    // Message được reply
    reply_to: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },

    // Message được forward
    forwarded_from: {
      message_id: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
      conversation_id: { type: Schema.Types.ObjectId, ref: "Conversation" },
      sender_name: String,
    },

    // Trạng thái message
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "deleted"],
      default: "sent",
      index: true,
    },

    // Thời gian đọc
    read_by: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: "User" },
        read_at: { type: Date, default: Date.now },
      },
    ],

    // Reactions
    reactions: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String, required: true },
        reacted_at: { type: Date, default: Date.now },
      },
    ],

    // Mentions
    mentions: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: "User" },
        username: String,
        position: { type: Number, required: true },
      },
    ],

    // Metadata
    metadata: {
      is_edited: { type: Boolean, default: false },
      edited_at: Date,
      edit_count: { type: Number, default: 0 },
      is_pinned: { type: Boolean, default: false },
      pinned_by: { type: Schema.Types.ObjectId, ref: "User" },
      pinned_at: Date,
    },

    // Encryption (nếu cần)
    encryption: {
      is_encrypted: { type: Boolean, default: false },
      encrypted_content: String,
    },
  },
  { timestamps: true }
);

// Index cho tìm kiếm
chatMessageSchema.index({
  conversation_id: 1,
  created_at: -1,
});

chatMessageSchema.index({
  sender_id: 1,
  created_at: -1,
});

chatMessageSchema.index({
  message_type: 1,
  status: 1,
});

// Index cho text search
chatMessageSchema.index({
  content: "text",
});

// Virtual để lấy số lượng reactions
chatMessageSchema.virtual("reaction_count").get(function () {
  return this.reactions.length;
});

// Virtual để lấy số lượng đã đọc
chatMessageSchema.virtual("read_count").get(function () {
  return this.read_by.length;
});

// Middleware để cập nhật conversation stats
chatMessageSchema.post("save", async function () {
  if (this.isNew) {
    const Conversation = require("./conversation");
    await Conversation.findByIdAndUpdate(this.conversation_id, {
      $inc: { "stats.total_messages": 1 },
      $set: {
        "stats.last_message_at": this.createdAt,
        "stats.last_message_by": this.sender_id,
      },
    });
  }
});

// Đảm bảo virtual fields được include trong JSON
chatMessageSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
