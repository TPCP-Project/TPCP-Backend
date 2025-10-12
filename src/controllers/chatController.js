const ChatService = require("../services/ChatService");

class ChatController {
  /**
   * Tạo conversation cho project
   * @route POST /api/chat/project/:projectId/conversation
   */
  async createProjectConversation(req, res) {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;
      const userId = req.user._id;

      const result = await ChatService.createProjectConversation(
        projectId,
        userId,
        name,
        description
      );

      return res.status(201).json({
        success: true,
        message: "Tạo conversation cho project thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in createProjectConversation:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể tạo conversation",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Tạo conversation 1vs1
   * @route POST /api/chat/direct
   */
  async createDirectConversation(req, res) {
    try {
      const { targetUserId } = req.body;
      const userId = req.user._id;

      const result = await ChatService.createDirectConversation(
        userId,
        targetUserId
      );

      return res.status(201).json({
        success: true,
        message: "Tạo conversation 1vs1 thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in createDirectConversation:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể tạo conversation",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy danh sách conversation của user
   * @route GET /api/chat/conversations
   */
  async getUserConversations(req, res) {
    try {
      const userId = req.user._id;
      const { type, page = 1, limit = 20 } = req.query;

      const result = await ChatService.getUserConversations(
        userId,
        type,
        parseInt(page),
        parseInt(limit)
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách conversation thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getUserConversations:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách conversation",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy thông tin chi tiết conversation
   * @route GET /api/chat/conversations/:conversationId
   */
  async getConversationById(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;

      const result = await ChatService.getConversationById(
        conversationId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin conversation thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getConversationById:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy thông tin conversation",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy danh sách messages trong conversation
   * @route GET /api/chat/conversations/:conversationId/messages
   */
  async getConversationMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50, before } = req.query;
      const userId = req.user._id;

      const result = await ChatService.getConversationMessages(
        conversationId,
        userId,
        parseInt(page),
        parseInt(limit),
        before
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách messages thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getConversationMessages:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách messages",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Gửi message
   * @route POST /api/chat/conversations/:conversationId/messages
   */
  async sendMessage(req, res) {
    try {
      const { conversationId } = req.params;
      const {
        content,
        message_type = "text",
        reply_to,
        attachments,
      } = req.body;
      const userId = req.user._id;

      const result = await ChatService.sendMessage(
        conversationId,
        userId,
        content,
        message_type,
        reply_to,
        attachments
      );

      return res.status(201).json({
        success: true,
        message: "Gửi message thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in sendMessage:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể gửi message",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Cập nhật message
   * @route PUT /api/chat/messages/:messageId
   */
  async updateMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { content } = req.body;
      const userId = req.user._id;

      const result = await ChatService.updateMessage(
        messageId,
        userId,
        content
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật message thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in updateMessage:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể cập nhật message",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Xóa message
   * @route DELETE /api/chat/messages/:messageId
   */
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user._id;

      const result = await ChatService.deleteMessage(messageId, userId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in deleteMessage:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể xóa message",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Đánh dấu đã đọc messages
   * @route PUT /api/chat/conversations/:conversationId/read
   */
  async markAsRead(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;

      const result = await ChatService.markAsRead(conversationId, userId);

      return res.status(200).json({
        success: true,
        message: "Đánh dấu đã đọc thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in markAsRead:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể đánh dấu đã đọc",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Thêm reaction cho message
   * @route POST /api/chat/messages/:messageId/reactions
   */
  async addReaction(req, res) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user._id;

      const result = await ChatService.addReaction(messageId, userId, emoji);

      return res.status(200).json({
        success: true,
        message: "Thêm reaction thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in addReaction:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể thêm reaction",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Xóa reaction
   * @route DELETE /api/chat/messages/:messageId/reactions
   */
  async removeReaction(req, res) {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user._id;

      const result = await ChatService.removeReaction(messageId, userId, emoji);

      return res.status(200).json({
        success: true,
        message: "Xóa reaction thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in removeReaction:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể xóa reaction",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy danh sách participants trong conversation
   * @route GET /api/chat/conversations/:conversationId/participants
   */
  async getConversationParticipants(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;

      const result = await ChatService.getConversationParticipants(
        conversationId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách participants thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getConversationParticipants:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách participants",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Rời khỏi conversation
   * @route DELETE /api/chat/conversations/:conversationId/leave
   */
  async leaveConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;

      const result = await ChatService.leaveConversation(
        conversationId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in leaveConversation:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể rời khỏi conversation",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new ChatController();
