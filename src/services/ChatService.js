const Conversation = require("../models/conversation");
const ChatMessage = require("../models/chatMessage");
const ChatParticipant = require("../models/chatParticipant");
const Project = require("../models/project");
const ProjectMember = require("../models/projectMember");
const User = require("../models/user");
const mongoose = require("mongoose");

class ChatService {
  //Tạo conversation cho project
  async createProjectConversation(projectId, userId, name, description) {
    try {
      // Kiểm tra project tồn tại
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error("Project không tồn tại");
      }

      // Kiểm tra user có phải member của project không
      const membership = await ProjectMember.findOne({
        project_id: projectId,
        user_id: userId,
        status: "active",
      });

      if (!membership) {
        throw new Error("Bạn không phải thành viên của project này");
      }

      // Tạo conversation
      const conversation = new Conversation({
        type: "project",
        project_id: projectId,
        name: name || `${project.name} Chat`,
        description: description || `Chat nhóm cho project ${project.name}`,
        created_by: userId,
      });

      await conversation.save();

      // Thêm tất cả members của project vào conversation
      const projectMembers = await ProjectMember.find({
        project_id: projectId,
        status: "active",
      });

      const participants = projectMembers.map((member) => ({
        conversation_id: conversation._id,
        user_id: member.user_id,
        role: member.role === "owner" ? "admin" : "member",
        permissions: {
          can_send_messages: true,
          can_send_files: true,
          can_invite_members:
            member.role === "owner" || member.role === "admin",
          can_remove_members: member.role === "owner",
          can_edit_conversation: member.role === "owner",
          can_delete_messages:
            member.role === "owner" || member.role === "admin",
          can_pin_messages: member.role === "owner" || member.role === "admin",
        },
      }));

      await ChatParticipant.insertMany(participants);

      // Populate conversation
      const populatedConversation = await Conversation.findById(
        conversation._id
      )
        .populate("project_id", "name description")
        .populate("created_by", "name username email avatar")
        .lean();

      return populatedConversation;
    } catch (error) {
      throw new Error(`Không thể tạo conversation: ${error.message}`);
    }
  }

  // Tạo conversation 1vs1

  async createDirectConversation(userId, targetUserId) {
    try {
      // Kiểm tra target user tồn tại
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw new Error("Người dùng không tồn tại");
      }

      // Kiểm tra conversation đã tồn tại chưa
      // Tìm tất cả conversation type="direct" mà userId tham gia
      const userParticipations = await ChatParticipant.find({
        user_id: userId,
        status: "active",
      }).select("conversation_id");

      const conversationIds = userParticipations.map((p) => p.conversation_id);

      // Tìm conversation type="direct" có cả 2 users tham gia
      for (const conversationId of conversationIds) {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          type: "direct",
          status: "active",
        });

        if (conversation) {
          // Kiểm tra target user có tham gia conversation này không
          const targetParticipant = await ChatParticipant.findOne({
            conversation_id: conversation._id,
            user_id: targetUserId,
            status: "active",
          });

          if (targetParticipant) {
            // Conversation đã tồn tại, populate và trả về
            const populatedConversation = await Conversation.findById(
              conversation._id
            )
              .populate("created_by", "name username email avatar")
              .lean();

            return populatedConversation;
          }
        }
      }

      // Tạo conversation mới
      console.log("🔵 Creating new direct conversation...", {
        userId,
        targetUserId,
        targetUserName: targetUser.name,
      });

      const conversation = new Conversation({
        type: "direct",
        name: `Chat với ${targetUser.name}`,
        created_by: userId,
      });

      await conversation.save();
      console.log("✅ Conversation saved to DB:", conversation._id.toString());

      // Thêm cả 2 user vào conversation
      const participants = [
        {
          conversation_id: conversation._id,
          user_id: userId,
          role: "admin",
          permissions: {
            can_send_messages: true,
            can_send_files: true,
            can_invite_members: false,
            can_remove_members: false,
            can_edit_conversation: true,
            can_delete_messages: true,
            can_pin_messages: false,
          },
        },
        {
          conversation_id: conversation._id,
          user_id: targetUserId,
          role: "admin",
          permissions: {
            can_send_messages: true,
            can_send_files: true,
            can_invite_members: false,
            can_remove_members: false,
            can_edit_conversation: true,
            can_delete_messages: true,
            can_pin_messages: false,
          },
        },
      ];

      const insertedParticipants = await ChatParticipant.insertMany(participants);
      console.log("✅ Participants created:", insertedParticipants.length);

      // NOTE: Không cần cập nhật stats manually vì có hook tự động

      // Populate conversation
      const populatedConversation = await Conversation.findById(
        conversation._id
      )
        .populate("created_by", "name username email avatar")
        .lean();

      console.log("✅ Returning conversation:", populatedConversation._id);
      return populatedConversation;
    } catch (error) {
      console.error("❌ Error creating direct conversation:", error);
      throw new Error(`Không thể tạo conversation: ${error.message}`);
    }
  }

  // Lấy danh sách conversation của user

  async getUserConversations(userId, type = null, page = 1, limit = 20) {
    try {
      const query = { status: "active" };
      if (type) {
        query.type = type;
      }

      // Tìm conversations mà user tham gia
      const userConversations = await ChatParticipant.find({
        user_id: userId,
        status: "active",
      }).select("conversation_id");

      const conversationIds = userConversations.map((p) => p.conversation_id);

      const conversations = await Conversation.find({
        _id: { $in: conversationIds },
        ...query,
      })
        .populate("project_id", "name description")
        .populate("created_by", "name username email avatar")
        .sort({ "stats.last_message_at": -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Thêm thông tin participant cho mỗi conversation
      const conversationsWithParticipants = await Promise.all(
        conversations.map(async (conversation) => {
          const participant = await ChatParticipant.findOne({
            conversation_id: conversation._id,
            user_id: userId,
          }).lean();

          return {
            ...conversation,
            userRole: participant?.role,
            userPermissions: participant?.permissions,
            unreadCount: participant?.stats?.unread_count || 0,
          };
        })
      );

      const totalConversations = await Conversation.countDocuments({
        _id: { $in: conversationIds },
        ...query,
      });

      return {
        conversations: conversationsWithParticipants,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalConversations / limit),
          totalConversations,
          hasNext: page < Math.ceil(totalConversations / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Không thể lấy danh sách conversation: ${error.message}`);
    }
  }

  // Lấy thông tin chi tiết conversation

  async getConversationById(conversationId, userId) {
    try {
      // Kiểm tra user có tham gia conversation không
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: userId,
        status: "active",
      });

      if (!participant) {
        throw new Error("Bạn không có quyền truy cập conversation này");
      }

      const conversation = await Conversation.findById(conversationId)
        .populate("project_id", "name description")
        .populate("created_by", "name username email avatar")
        .lean();

      if (!conversation) {
        throw new Error("Conversation không tồn tại");
      }

      return {
        ...conversation,
        userRole: participant.role,
        userPermissions: participant.permissions,
      };
    } catch (error) {
      throw new Error(`Không thể lấy thông tin conversation: ${error.message}`);
    }
  }

  // Lấy danh sách messages trong conversation

  async getConversationMessages(
    conversationId,
    userId,
    page = 1,
    limit = 50,
    before = null
  ) {
    try {
      // Kiểm tra user có tham gia conversation không
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: userId,
        status: "active",
      });

      if (!participant) {
        throw new Error("Bạn không có quyền truy cập conversation này");
      }

      const query = { conversation_id: conversationId };
      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      const messages = await ChatMessage.find(query)
        .populate("sender_id", "name username email avatar")
        .populate("reply_to", "content sender_id")
        .populate("read_by.user_id", "name username avatar")
        .populate("reactions.user_id", "name username avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Đánh dấu messages là đã đọc
      const messageIds = messages.map((m) => m._id);
      await ChatMessage.updateMany(
        { _id: { $in: messageIds } },
        {
          $addToSet: {
            read_by: {
              user_id: userId,
              read_at: new Date(),
            },
          },
        }
      );

      // Cập nhật unread count
      await ChatParticipant.findByIdAndUpdate(participant._id, {
        $set: { "stats.unread_count": 0, "stats.last_seen_at": new Date() },
      });

      return {
        messages: messages.reverse(), // Đảo ngược để hiển thị từ cũ đến mới
        pagination: {
          currentPage: page,
          hasMore: messages.length === limit,
        },
      };
    } catch (error) {
      throw new Error(`Không thể lấy danh sách messages: ${error.message}`);
    }
  }

  /**
   * Gửi message
   */
  async sendMessage(
    conversationId,
    userId,
    content,
    messageType = "text",
    replyTo = null,
    attachments = []
  ) {
    try {
      // Kiểm tra user có tham gia conversation không
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: userId,
        status: "active",
      });

      if (!participant) {
        throw new Error(
          "Bạn không có quyền gửi message trong conversation này"
        );
      }

      if (!participant.permissions.can_send_messages) {
        throw new Error("Bạn không có quyền gửi message");
      }

      // Tạo message
      const message = new ChatMessage({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: messageType,
        reply_to: replyTo,
        attachments,
      });

      await message.save();

      // Populate message
      const populatedMessage = await ChatMessage.findById(message._id)
        .populate("sender_id", "name username email avatar")
        .populate("reply_to", "content sender_id")
        .lean();

      // Emit Socket.IO event for real-time updates
      const SocketManager = require("../config/socket");
      if (global.socketManager) {
        global.socketManager.sendMessageToConversation(
          conversationId,
          "new_message",
          {
            conversationId,
            message: populatedMessage,
          }
        );
      }

      return populatedMessage;
    } catch (error) {
      throw new Error(`Không thể gửi message: ${error.message}`);
    }
  }

  //Cập nhật message

  async updateMessage(messageId, userId, content) {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        throw new Error("Message không tồn tại");
      }

      if (message.sender_id.toString() !== userId.toString()) {
        throw new Error("Bạn chỉ có thể chỉnh sửa message của mình");
      }

      message.content = content;
      message.metadata.is_edited = true;
      message.metadata.edited_at = new Date();
      message.metadata.edit_count += 1;

      await message.save();

      return message;
    } catch (error) {
      throw new Error(`Không thể cập nhật message: ${error.message}`);
    }
  }

  // Xóa message

  async deleteMessage(messageId, userId) {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        throw new Error("Message không tồn tại");
      }

      if (message.sender_id.toString() !== userId.toString()) {
        throw new Error("Bạn chỉ có thể xóa message của mình");
      }

      message.status = "deleted";
      message.content = "Message đã bị xóa";
      await message.save();

      return {
        message: "Xóa message thành công",
      };
    } catch (error) {
      throw new Error(`Không thể xóa message: ${error.message}`);
    }
  }

  //Đánh dấu đã đọc messages

  async markAsRead(conversationId, userId) {
    try {
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: userId,
        status: "active",
      });

      if (!participant) {
        throw new Error("Bạn không có quyền truy cập conversation này");
      }

      // Cập nhật unread count
      await ChatParticipant.findByIdAndUpdate(participant._id, {
        $set: {
          "stats.unread_count": 0,
          "stats.last_seen_at": new Date(),
        },
      });

      return {
        message: "Đánh dấu đã đọc thành công",
      };
    } catch (error) {
      throw new Error(`Không thể đánh dấu đã đọc: ${error.message}`);
    }
  }

  //Thêm reaction cho message

  async addReaction(messageId, userId, emoji) {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        throw new Error("Message không tồn tại");
      }

      // Kiểm tra user đã reaction chưa
      const existingReaction = message.reactions.find(
        (r) => r.user_id.toString() === userId.toString() && r.emoji === emoji
      );

      if (existingReaction) {
        throw new Error("Bạn đã reaction emoji này rồi");
      }

      message.reactions.push({
        user_id: userId,
        emoji: emoji,
      });

      await message.save();

      return message;
    } catch (error) {
      throw new Error(`Không thể thêm reaction: ${error.message}`);
    }
  }

  // Xóa reaction

  async removeReaction(messageId, userId, emoji) {
    try {
      const message = await ChatMessage.findById(messageId);
      if (!message) {
        throw new Error("Message không tồn tại");
      }

      message.reactions = message.reactions.filter(
        (r) =>
          !(r.user_id.toString() === userId.toString() && r.emoji === emoji)
      );

      await message.save();

      return message;
    } catch (error) {
      throw new Error(`Không thể xóa reaction: ${error.message}`);
    }
  }

  //Lấy danh sách participants trong conversation

  async getConversationParticipants(conversationId, userId) {
    try {
      // Kiểm tra user có tham gia conversation không
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: userId,
        status: "active",
      });

      if (!participant) {
        throw new Error("Bạn không có quyền truy cập conversation này");
      }

      const participants = await ChatParticipant.find({
        conversation_id: conversationId,
        status: "active",
      })
        .populate("user_id", "name username email avatar")
        .sort({ role: 1, joined_at: 1 })
        .lean();

      return {
        participants: participants.map((p) => ({
          ...p,
          user: p.user_id,
        })),
      };
    } catch (error) {
      throw new Error(`Không thể lấy danh sách participants: ${error.message}`);
    }
  }

  //Rời khỏi conversation

  async leaveConversation(conversationId, userId) {
    try {
      const participant = await ChatParticipant.findOne({
        conversation_id: conversationId,
        user_id: userId,
        status: "active",
      });

      if (!participant) {
        throw new Error("Bạn không tham gia conversation này");
      }

      // Cập nhật status thành left
      await ChatParticipant.findByIdAndUpdate(participant._id, {
        status: "left",
        left_at: new Date(),
      });

      return {
        message: "Rời khỏi conversation thành công",
      };
    } catch (error) {
      throw new Error(`Không thể rời khỏi conversation: ${error.message}`);
    }
  }
}

module.exports = new ChatService();
