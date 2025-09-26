const express = require("express");
const router = new express.Router();
const ProjectInvitationController = require("../controllers/ProjectInvitationController");
const {
  authenticateToken,
  requireVerified,
  requireAdmin,
} = require("../middlewares/auth");

// === ROUTES LIÊN QUAN ĐẾN INVITE CODE ===

// Tạo mã mời cho project
router.post(
  "/projects/:projectId/invitations",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.createInviteCode(req, res);
  }
);

// Gửi lời mời qua email
router.post(
  "/projects/invitations/send",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.sendInvitation(req, res);
  }
);

// Tham gia project bằng mã mời
router.post(
  "/projects/join",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.joinByInviteCode(req, res);
  }
);

// Lấy danh sách mã mời của project
router.get(
  "/projects/:projectId/invitations",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.getProjectInvitations(req, res);
  }
);

// Vô hiệu hóa mã mời
router.put(
  "/projects/invitations/:inviteCode/deactivate",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.deactivateInviteCode(req, res);
  }
);

// === ROUTES LIÊN QUAN ĐẾN YÊU CẦU THAM GIA ===

// Lấy danh sách yêu cầu tham gia đang chờ xử lý
router.get(
  "/projects/:projectId/join-requests",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.getPendingRequests(req, res);
  }
);

// Phê duyệt yêu cầu tham gia
router.put(
  "/projects/join-requests/:requestId/approve",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.approveJoinRequest(req, res);
  }
);

// Từ chối yêu cầu tham gia
router.put(
  "/projects/join-requests/:requestId/reject",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectInvitationController.rejectJoinRequest(req, res);
  }
);

// === ROUTES QUẢN TRỊ ===

// Xóa các yêu cầu tham gia đã quá hạn (chỉ admin)
router.delete(
  "/admin/projects/join-requests/cleanup",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    ProjectInvitationController.cleanupExpiredRequests(req, res);
  }
);

module.exports = router;
