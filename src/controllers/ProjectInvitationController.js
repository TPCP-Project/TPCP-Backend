const ProjectInvitationService = require("../services/ProjectInvitationService");

class ProjectInvitationController {
  /**
   * Tạo mã mời tham gia project
   * @route POST /api/projects/:projectId/invitations
   */
  async createInviteCode(req, res) {
    try {
      const { projectId } = req.params;
      const { expiryDays } = req.body;
      const userId = req.user._id;

      const result = await ProjectInvitationService.createInviteCode(
        projectId,
        userId,
        expiryDays
      );

      return res.status(201).json({
        success: true,
        message: "Đã tạo mã mời thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in createInviteCode:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể tạo mã mời",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Gửi lời mời tham gia project qua email
   * @route POST /api/projects/invitations/send
   */
  async sendInvitation(req, res) {
    try {
      const { inviteCode, email } = req.body;
      const userId = req.user._id;

      const result = await ProjectInvitationService.sendInvitation(
        inviteCode,
        email,
        userId
      );

      return res.status(200).json({
        success: true,
        message: result.message || "Đã gửi lời mời thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in sendInvitation:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể gửi lời mời",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Tham gia project bằng mã mời
   * @route POST /api/projects/join
   */
  async joinByInviteCode(req, res) {
    try {
      const { inviteCode } = req.body;
      const userId = req.user._id;

      const result = await ProjectInvitationService.joinByInviteCode(
        inviteCode,
        userId
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in joinByInviteCode:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể tham gia project",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy danh sách yêu cầu tham gia đang chờ xử lý
   * @route GET /api/projects/:projectId/join-requests
   */
  async getPendingRequests(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const requests = await ProjectInvitationService.getPendingRequests(
        projectId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách yêu cầu thành công",
        data: requests,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getPendingRequests:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách yêu cầu",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Phê duyệt yêu cầu tham gia
   * @route PUT /api/projects/join-requests/:requestId/approve
   */
  async approveJoinRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user._id;

      const result = await ProjectInvitationService.approveJoinRequest(
        requestId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in approveJoinRequest:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể phê duyệt yêu cầu",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Từ chối yêu cầu tham gia
   * @route PUT /api/projects/join-requests/:requestId/reject
   */
  async rejectJoinRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;
      const userId = req.user._id;

      const result = await ProjectInvitationService.rejectJoinRequest(
        requestId,
        userId,
        reason
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in rejectJoinRequest:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể từ chối yêu cầu",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Vô hiệu hóa mã mời
   * @route PUT /api/projects/invitations/:inviteCode/deactivate
   */
  async deactivateInviteCode(req, res) {
    try {
      const { inviteCode } = req.params;
      const userId = req.user._id;

      const result = await ProjectInvitationService.deactivateInviteCode(
        inviteCode,
        userId
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in deactivateInviteCode:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể vô hiệu hóa mã mời",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy danh sách mã mời của project
   * @route GET /api/projects/:projectId/invitations
   */
  async getProjectInvitations(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const invitations = await ProjectInvitationService.getProjectInvitations(
        projectId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách mã mời thành công",
        data: invitations,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getProjectInvitations:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách mã mời",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Xóa các yêu cầu tham gia đã quá hạn (API nội bộ, chỉ admin mới gọi được)
   * @route DELETE /api/admin/projects/join-requests/cleanup
   */
  async cleanupExpiredRequests(req, res) {
    try {
      const result = await ProjectInvitationService.cleanupExpiredRequests();
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in cleanupExpiredRequests:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể xóa yêu cầu hết hạn",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new ProjectInvitationController();
