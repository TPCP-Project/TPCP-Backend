const express = require("express");
const router = new express.Router();
const ChatController = require("../controllers/chatController");
const { authenticateToken, requireVerified } = require("../middlewares/auth");

// ROUTES QUẢN LÝ CONVERSATION

// Tạo conversation cho project
router.post(
  "/chat/project/:projectId/conversation",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.createProjectConversation(req, res);
  }
);

// Tạo conversation 1vs1
router.post("/chat/direct", authenticateToken, requireVerified, (req, res) => {
  ChatController.createDirectConversation(req, res);
});

// Lấy danh sách conversation của user
router.get(
  "/chat/conversations",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.getUserConversations(req, res);
  }
);

// Lấy thông tin chi tiết conversation
router.get(
  "/chat/conversations/:conversationId",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.getConversationById(req, res);
  }
);

// Lấy danh sách participants trong conversation
router.get(
  "/chat/conversations/:conversationId/participants",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.getConversationParticipants(req, res);
  }
);

// Rời khỏi conversation
router.delete(
  "/chat/conversations/:conversationId/leave",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.leaveConversation(req, res);
  }
);

//ROUTES QUẢN LÝ MESSAGES

// Lấy danh sách messages trong conversation
router.get(
  "/chat/conversations/:conversationId/messages",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.getConversationMessages(req, res);
  }
);

// Gửi message
router.post(
  "/chat/conversations/:conversationId/messages",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.sendMessage(req, res);
  }
);

// Cập nhật message
router.put(
  "/chat/messages/:messageId",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.updateMessage(req, res);
  }
);

// Xóa message
router.delete(
  "/chat/messages/:messageId",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.deleteMessage(req, res);
  }
);

// Đánh dấu đã đọc messages
router.put(
  "/chat/conversations/:conversationId/read",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.markAsRead(req, res);
  }
);

//ROUTES QUẢN LÝ REACTIONS

// Thêm reaction cho message
router.post(
  "/chat/messages/:messageId/reactions",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.addReaction(req, res);
  }
);

// Xóa reaction
router.delete(
  "/chat/messages/:messageId/reactions",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ChatController.removeReaction(req, res);
  }
);

module.exports = router;
