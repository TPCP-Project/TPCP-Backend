const crypto = require("crypto");
const Project = require("../models/project");
const ProjectMember = require("../models/projectMember");
const ProjectInvitation = require("../models/ProjectInvitation");
const ProjectJoinRequest = require("../models/ProjectJoinRequest");
const User = require("../models/user");
const {
  sendProjectInvitation,
  sendJoinRequestApproved,
  sendJoinRequestRejected,
  sendJoinRequestNotification,
} = require("../config/projectEmail");

class ProjectInvitationService {
  /**
   * Tạo mã mời tham gia project
   * @param {string} projectId - ID của project
   * @param {string} userId - ID của người tạo mã mời
   * @param {number} expiryDays - Số ngày hết hạn (mặc định 30 ngày)
   * @returns {Promise<Object>} - Thông tin mã mời
   */
  async createInviteCode(projectId, userId, expiryDays = 30) {
    // Kiểm tra project tồn tại
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project không tồn tại");
    }

    // Kiểm tra người dùng có quyền tạo mã mời không
    const membership = await ProjectMember.findOne({
      project_id: projectId,
      user_id: userId,
      status: "active",
    });

    if (!membership) {
      throw new Error("Bạn không phải là thành viên của project này");
    }

    if (membership.role !== "owner" && !membership.permissions.canInvite) {
      throw new Error("Bạn không có quyền tạo mã mời cho project này");
    }

    // Tạo mã mời ngẫu nhiên
    const inviteCode = crypto.randomBytes(6).toString("hex");

    // Tính ngày hết hạn
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Lưu mã mời vào database
    const invitation = await ProjectInvitation.create({
      project_id: projectId,
      invite_code: inviteCode,
      created_by: userId,
      expiry_date: expiryDate,
      is_active: true,
    });

    return {
      invitation_id: invitation._id,
      project_id: projectId,
      project_name: project.name,
      invite_code: inviteCode,
      created_by: userId,
      expiry_date: expiryDate,
    };
  }

  /**
   * Gửi lời mời tham gia project qua email
   * @param {string} inviteCode - Mã mời
   * @param {string} email - Email người được mời
   * @param {string} inviterId - ID người mời
   * @returns {Promise<Object>} - Kết quả gửi lời mời
   */
  async sendInvitation(inviteCode, email, inviterId) {
    // Tìm mã mời
    const invitation = await ProjectInvitation.findOne({
      invite_code: inviteCode,
      is_active: true,
      expiry_date: { $gt: new Date() },
    });

    if (!invitation) {
      throw new Error("Mã mời không hợp lệ hoặc đã hết hạn");
    }

    // Tìm project
    const project = await Project.findById(invitation.project_id);
    if (!project) {
      throw new Error("Project không tồn tại");
    }

    // Tìm người được mời
    const invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) {
      throw new Error("Không tìm thấy người dùng với email này");
    }

    // Kiểm tra xem người dùng đã là thành viên của project chưa
    const existingMembership = await ProjectMember.findOne({
      project_id: project._id,
      user_id: invitee._id,
      status: "active",
    });

    if (existingMembership) {
      throw new Error("Người dùng này đã là thành viên của project");
    }

    // Kiểm tra xem có yêu cầu tham gia pending nào không
    const pendingRequest = await ProjectJoinRequest.findOne({
      project_id: project._id,
      user_id: invitee._id,
      status: "pending",
    });

    if (pendingRequest) {
      throw new Error("Người dùng này đã có yêu cầu tham gia đang chờ xử lý");
    }

    // Tìm thông tin người mời
    const inviter = await User.findById(inviterId);
    if (!inviter) {
      throw new Error("Không tìm thấy thông tin người mời");
    }

    // Gửi email mời
    await sendProjectInvitation(
      invitee.email,
      invitee.username,
      inviter.name,
      project.name,
      inviteCode
    );

    return {
      message: "Đã gửi lời mời tham gia project thành công",
      to: invitee.email,
      project_name: project.name,
    };
  }
  async joinByInviteCode(inviteCode, userId) {
    // Tìm mã mời
    const invitation = await ProjectInvitation.findOne({
      invite_code: inviteCode,
      is_active: true,
      expiry_date: { $gt: new Date() },
    });

    if (!invitation) {
      throw new Error("Mã mời không hợp lệ hoặc đã hết hạn");
    }

    // Tìm project
    const project = await Project.findById(invitation.project_id);
    if (!project) {
      throw new Error("Project không tồn tại");
    }

    // Tìm người dùng
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    // Kiểm tra xem người dùng đã là thành viên của project chưa
    const existingMembership = await ProjectMember.findOne({
      project_id: project._id,
      user_id: userId,
    });

    if (existingMembership && existingMembership.status === "active") {
      throw new Error("Bạn đã là thành viên của project này");
    }

    // Kiểm tra xem có yêu cầu tham gia pending nào không
    let pendingRequest = await ProjectJoinRequest.findOne({
      project_id: project._id,
      user_id: userId,
      status: "pending",
    });

    if (pendingRequest) {
      return {
        message: "Yêu cầu tham gia của bạn đang chờ được phê duyệt",
        request_id: pendingRequest._id,
        project_name: project.name,
      };
    }
    await ProjectJoinRequest.deleteMany({
      project_id: project._id,
      user_id: userId,
      status: { $in: ["accepted", "rejected"] },
    });
    // Tạo yêu cầu tham gia mới
    pendingRequest = await ProjectJoinRequest.create({
      project_id: project._id,
      user_id: userId,
      invitation_id: invitation._id,
      status: "pending",
      request_date: new Date(),
    });

    if (project.auto_approve_members) {
      console.log("🔄 Auto-approving join request...", {
        requestId: pendingRequest._id.toString(),
        projectId: project._id.toString(),
        userId: userId.toString(),
        ownerId: project.owner_id.toString(),
      });

      const result = await this.approveJoinRequest(
        pendingRequest._id.toString(),
        project.owner_id.toString()
      );

      console.log("✅ Auto-approve result:", result);
      return result;
    }

    // Gửi thông báo cho chủ project
    const owner = await User.findById(project.owner_id);
    if (owner) {
      await sendJoinRequestNotification(
        owner.email,
        owner.name,
        user.name,
        project.name
      );
    }

    return {
      message: "Yêu cầu tham gia đã được gửi và đang chờ phê duyệt",
      request_id: pendingRequest._id,
      project_name: project.name,
    };
  }
  /**
   * Lấy danh sách yêu cầu tham gia đang chờ xử lý cho project
   * @param {string} projectId - ID của project
   * @param {string} userId - ID của người gọi API (để kiểm tra quyền)
   * @returns {Promise<Array>} - Danh sách yêu cầu tham gia
   */
  async getPendingRequests(projectId, userId) {
    // Kiểm tra project tồn tại
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project không tồn tại");
    }

    // Kiểm tra người dùng có quyền xem danh sách yêu cầu không
    const membership = await ProjectMember.findOne({
      project_id: projectId,
      user_id: userId,
      status: "active",
    });

    if (!membership) {
      throw new Error("Bạn không phải là thành viên của project này");
    }

    if (
      membership.role !== "owner" &&
      membership.role !== "admin" &&
      !membership.permissions.canApproveMembers
    ) {
      throw new Error(
        "Bạn không có quyền xem danh sách yêu cầu tham gia project"
      );
    }

    // Lấy danh sách yêu cầu đang chờ xử lý
    const pendingRequests = await ProjectJoinRequest.find({
      project_id: projectId,
      status: "pending",
    })
      .populate("user_id", "name username email")
      .sort({ request_date: 1 });

    return pendingRequests;
  }

  /**
   * Phê duyệt yêu cầu tham gia project
   * @param {string} requestId - ID của yêu cầu tham gia
   * @param {string} approverId - ID của người phê duyệt
   * @returns {Promise<Object>} - Kết quả phê duyệt
   */
  async approveJoinRequest(requestId, approverId) {
    // Tìm yêu cầu tham gia
    const request = await ProjectJoinRequest.findById(requestId);
    if (!request) {
      throw new Error("Không tìm thấy yêu cầu tham gia");
    }

    if (request.status !== "pending") {
      throw new Error("Yêu cầu này đã được xử lý trước đó");
    }

    // Tìm project
    const project = await Project.findById(request.project_id);
    if (!project) {
      throw new Error("Project không tồn tại");
    }

    const isOwner = project.owner_id.toString() === approverId.toString();
    // Kiểm tra người dùng có quyền phê duyệt không
    if (!isOwner) {
      // Chỉ kiểm tra quyền nếu KHÔNG phải owner
      const approverMembership = await ProjectMember.findOne({
        project_id: project._id,
        user_id: approverId,
        status: "active",
      });

      if (!approverMembership) {
        throw new Error("Bạn không phải là thành viên của project này");
      }

      if (
        approverMembership.role !== "admin" &&
        !approverMembership.permissions.canApproveMembers
      ) {
        throw new Error(
          "Bạn không có quyền phê duyệt yêu cầu tham gia project"
        );
      }
    }

    // Kiểm tra xem người dùng đã là thành viên của project chưa
    const existingMembership = await ProjectMember.findOne({
      project_id: project._id,
      user_id: request.user_id,
    });

    if (existingMembership && existingMembership.status === "active") {
      // Cập nhật trạng thái yêu cầu
      request.status = "accepted";
      request.processed_date = new Date();
      request.processed_by = approverId;
      await request.save();

      return {
        message: "Người dùng này đã là thành viên của project",
        already_member: true,
        project_name: project.name,
      };
    }

    // Nếu đã có membership nhưng inactive, cập nhật lại status
    if (existingMembership && existingMembership.status === "inactive") {
      existingMembership.status = "active";
      existingMembership.joined_at = new Date();
      existingMembership.invited_by = request.invitation_id
        ? (await ProjectInvitation.findById(request.invitation_id))?.created_by
        : null;
      await existingMembership.save();
    } else {
      // Tạo membership mới
      await ProjectMember.create({
        project_id: project._id,
        user_id: request.user_id,
        role: "member",
        invited_by: request.invitation_id
          ? (
              await ProjectInvitation.findById(request.invitation_id)
            )?.created_by
          : null,
        invitation_id: request.invitation_id,
        joined_at: new Date(),
        status: "active",
      });
    }

    // Cập nhật trạng thái yêu cầu
    request.status = "accepted";
    request.processed_date = new Date();
    request.processed_by = approverId;
    await request.save();

    // Gửi email thông báo cho người dùng
    const user = await User.findById(request.user_id);
    const approver = await User.findById(approverId);

    if (user && approver) {
      await sendJoinRequestApproved(
        user.email,
        user.name,
        project.name,
        approver.name
      );
    }

    return {
      message: "Đã phê duyệt yêu cầu tham gia project thành công",
      project_id: project._id,
      project_name: project.name,
      user_id: request.user_id,
    };
  }

  /**
   * Từ chối yêu cầu tham gia project
   * @param {string} requestId - ID của yêu cầu tham gia
   * @param {string} rejecterId - ID của người từ chối
   * @param {string} reason - Lý do từ chối (không bắt buộc)
   * @returns {Promise<Object>} - Kết quả từ chối
   */
  async rejectJoinRequest(requestId, rejecterId, reason = null) {
    // Tìm yêu cầu tham gia
    const request = await ProjectJoinRequest.findById(requestId);
    if (!request) {
      throw new Error("Không tìm thấy yêu cầu tham gia");
    }

    if (request.status !== "pending") {
      throw new Error("Yêu cầu này đã được xử lý trước đó");
    }

    // Tìm project
    const project = await Project.findById(request.project_id);
    if (!project) {
      throw new Error("Project không tồn tại");
    }

    // Kiểm tra người dùng có quyền từ chối không
    const rejecterMembership = await ProjectMember.findOne({
      project_id: project._id,
      user_id: rejecterId,
      status: "active",
    });

    if (!rejecterMembership) {
      throw new Error("Bạn không phải là thành viên của project này");
    }

    if (
      rejecterMembership.role !== "owner" &&
      rejecterMembership.role !== "admin" &&
      !rejecterMembership.permissions.canApproveMembers
    ) {
      throw new Error("Bạn không có quyền từ chối yêu cầu tham gia project");
    }

    // Cập nhật trạng thái yêu cầu
    request.status = "rejected";
    request.processed_date = new Date();
    request.processed_by = rejecterId;
    await request.save();

    // Gửi email thông báo cho người dùng
    const user = await User.findById(request.user_id);

    if (user) {
      await sendJoinRequestRejected(
        user.email,
        user.name,
        project.name,
        reason
      );
    }

    return {
      message: "Đã từ chối yêu cầu tham gia project",
      project_id: project._id,
      project_name: project.name,
      user_id: request.user_id,
    };
  }

  /**
   * Kiểm tra và xóa các yêu cầu tham gia đã quá hạn
   * Hàm này nên được gọi bởi một cronjob
   * @returns {Promise<Object>} - Kết quả xóa yêu cầu quá hạn
   */
  async cleanupExpiredRequests() {
    // Lấy tất cả các project để kiểm tra cài đặt
    const projects = await Project.find({
      "settings.autoDeletePendingRequests": { $gt: 0 },
    });

    let totalDeleted = 0;

    for (const project of projects) {
      // Tính ngày hết hạn dựa trên cài đặt của project
      const expiryDays = project.settings.autoDeletePendingRequests || 5;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - expiryDays);

      // Xóa các yêu cầu quá hạn
      const result = await ProjectJoinRequest.deleteMany({
        project_id: project._id,
        status: "pending",
        request_date: { $lt: expiryDate },
      });

      totalDeleted += result.deletedCount;
    }

    return {
      message: `Đã xóa ${totalDeleted} yêu cầu tham gia đã quá hạn`,
      total_deleted: totalDeleted,
    };
  }

  /**
   * Vô hiệu hóa một mã mời
   * @param {string} inviteCode - Mã mời cần vô hiệu hóa
   * @param {string} userId - ID người dùng thực hiện hành động
   * @returns {Promise<Object>} - Kết quả vô hiệu hóa
   */
  async deactivateInviteCode(inviteCode, userId) {
    // Tìm mã mời
    const invitation = await ProjectInvitation.findOne({
      invite_code: inviteCode,
    });

    if (!invitation) {
      throw new Error("Không tìm thấy mã mời");
    }

    // Kiểm tra quyền
    const membership = await ProjectMember.findOne({
      project_id: invitation.project_id,
      user_id: userId,
      status: "active",
    });

    if (!membership) {
      throw new Error("Bạn không phải là thành viên của project này");
    }

    if (
      membership.role !== "owner" &&
      membership.role !== "admin" &&
      invitation.created_by.toString() !== userId
    ) {
      throw new Error("Bạn không có quyền vô hiệu hóa mã mời này");
    }

    // Vô hiệu hóa mã mời
    invitation.is_active = false;
    await invitation.save();

    return {
      message: "Đã vô hiệu hóa mã mời thành công",
      invite_code: inviteCode,
    };
  }

  /**
   * Lấy danh sách mã mời của một project
   * @param {string} projectId - ID của project
   * @param {string} userId - ID người dùng thực hiện hành động
   * @returns {Promise<Array>} - Danh sách mã mời
   */
  async getProjectInvitations(projectId, userId) {
    // Kiểm tra project tồn tại
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project không tồn tại");
    }

    // Kiểm tra quyền
    const membership = await ProjectMember.findOne({
      project_id: projectId,
      user_id: userId,
      status: "active",
    });

    if (!membership) {
      throw new Error("Bạn không phải là thành viên của project này");
    }

    if (
      membership.role !== "owner" &&
      membership.role !== "admin" &&
      !membership.permissions.canInvite
    ) {
      throw new Error("Bạn không có quyền xem danh sách mã mời");
    }

    // Lấy danh sách mã mời
    const invitations = await ProjectInvitation.find({
      project_id: projectId,
    })
      .populate("created_by", "name username email")
      .sort({ createdAt: -1 });

    return invitations;
  }
}

module.exports = new ProjectInvitationService();
