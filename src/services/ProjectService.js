const Project = require("../models/project");
const ProjectMember = require("../models/projectMember");
const mongoose = require("mongoose");

class ProjectService {
  //Tạo project mới
  async createProject(
    userId,
    name,
    description,
    auto_approve_members = false,
    settings = {}
  ) {
    try {
      /* Tạo project mới */
      const project = new Project({
        name,
        description,
        owner_id: userId,
        auto_approve_members,
        settings: {
          allowInvitationByMembers: settings.allowInvitationByMembers ?? true,
          requireApprovalForJoining: settings.requireApprovalForJoining ?? true,
          autoDeletePendingRequests: settings.autoDeletePendingRequests ?? 5,
          ...settings,
        },
      });

      await project.save();

      /* Tự động thêm owner làm member với role owner */
      const projectMember = new ProjectMember({
        project_id: project._id,
        user_id: userId,
        role: "owner",
        permissions: {
          canInvite: true,
          canApproveMembers: true,
          canManageTasks: true,
        },
        joined_at: new Date(),
      });

      await projectMember.save();

      /* Populate thông tin user */
      const populatedProject = await Project.findById(project._id)
        .populate("owner_id", "name email avatar")
        .lean();

      return {
        project: populatedProject,
        message: "Tạo project thành công",
      };
    } catch (error) {
      throw new Error(`Không thể tạo project: ${error.message}`);
    }
  }

  //Lấy danh sách project của user
  async getUserProjects(userId, status = null, page = 1, limit = 10) {
    try {
      const query = {};

      /* Nếu có filter theo status */
      if (status) {
        query.status = status;
      }

      /* Tìm các project mà user là member */
      const userProjects = await ProjectMember.find({
        user_id: userId,
        status: "active",
      }).select("project_id role");

      const projectIds = userProjects.map((pm) => pm.project_id);

      /* Query projects với pagination */
      const projects = await Project.find({
        _id: { $in: projectIds },
        ...query,
      })
        .populate("owner_id", "name email avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      /* Thêm thông tin role của user trong từng project */
      const projectsWithRole = projects.map((project) => {
        const memberInfo = userProjects.find(
          (pm) => pm.project_id.toString() === project._id.toString()
        );
        return {
          ...project,
          userRole: memberInfo ? memberInfo.role : null,
        };
      });

      /* Đếm tổng số projects */
      const totalProjects = await Project.countDocuments({
        _id: { $in: projectIds },
        ...query,
      });

      return {
        projects: projectsWithRole,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalProjects / limit),
          totalProjects,
          hasNext: page < Math.ceil(totalProjects / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Không thể lấy danh sách project: ${error.message}`);
    }
  }

  //Lấy thông tin chi tiết project
  async getProjectById(projectId, userId) {
    try {
      /* Kiểm tra user có phải member của project không */
      const membership = await ProjectMember.findOne({
        project_id: projectId,
        user_id: userId,
        status: "active",
      });

      if (!membership) {
        throw new Error("Bạn không có quyền truy cập project này");
      }

      const project = await Project.findById(projectId)
        .populate("owner_id", "name email avatar")
        .lean();

      if (!project) {
        throw new Error("Project không tồn tại");
      }

      return {
        ...project,
        userRole: membership.role,
        userPermissions: membership.permissions,
      };
    } catch (error) {
      throw new Error(`Không thể lấy thông tin project: ${error.message}`);
    }
  }

  //Cập nhật thông tin project
  async updateProject(projectId, userId, updateData) {
    try {
      /* Kiểm tra quyền owner hoặc admin */
      const membership = await ProjectMember.findOne({
        project_id: projectId,
        user_id: userId,
        status: "active",
        role: { $in: ["owner", "admin"] },
      });

      if (!membership) {
        throw new Error("Bạn không có quyền cập nhật project này");
      }

      const project = await Project.findByIdAndUpdate(
        projectId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("owner_id", "name email avatar");

      if (!project) {
        throw new Error("Project không tồn tại");
      }

      return {
        project,
        message: "Cập nhật project thành công",
      };
    } catch (error) {
      throw new Error(`Không thể cập nhật project: ${error.message}`);
    }
  }

  //Xóa project
  async deleteProject(projectId, userId) {
    try {
      /* Chỉ owner mới có thể xóa project */
      const membership = await ProjectMember.findOne({
        project_id: projectId,
        user_id: userId,
        status: "active",
        role: "owner",
      });

      if (!membership) {
        throw new Error("Chỉ chủ project mới có thể xóa project");
      }

      /* Xóa tất cả members của project */
      await ProjectMember.deleteMany({ project_id: projectId });

      /* Xóa project */
      await Project.findByIdAndDelete(projectId);

      return {
        message: "Xóa project thành công",
      };
    } catch (error) {
      throw new Error(`Không thể xóa project: ${error.message}`);
    }
  }

  //Lấy danh sách thành viên của project
  async getProjectMembers(projectId, userId) {
    try {
      /* Kiểm tra user có phải member của project không */
      const membership = await ProjectMember.findOne({
        project_id: projectId,
        user_id: userId,
        status: "active",
      });

      if (!membership) {
        throw new Error("Bạn không có quyền truy cập project này");
      }

      const members = await ProjectMember.find({
        project_id: projectId,
        status: "active",
      })
        .populate("user_id", "name email avatar")
        .populate("invited_by", "name email")
        .sort({ role: 1, joined_at: 1 })
        .lean();

      return {
        members: members.map((member) => ({
          ...member,
          user: member.user_id,
          invitedBy: member.invited_by,
        })),
      };
    } catch (error) {
      throw new Error(`Không thể lấy danh sách thành viên: ${error.message}`);
    }
  }

  //Rời khỏi project
  async leaveProject(projectId, userId) {
    try {
      const membership = await ProjectMember.findOne({
        project_id: projectId,
        user_id: userId,
        status: "active",
      });

      if (!membership) {
        throw new Error("Bạn không phải thành viên của project này");
      }

      /* Owner không thể rời khỏi project */
      if (membership.role === "owner") {
        throw new Error(
          "Chủ project không thể rời khỏi project. Hãy chuyển quyền sở hữu hoặc xóa project."
        );
      }

      /* Cập nhật status thành inactive */
      await ProjectMember.findByIdAndUpdate(membership._id, {
        status: "inactive",
      });

      return {
        message: "Rời khỏi project thành công",
      };
    } catch (error) {
      throw new Error(`Không thể rời khỏi project: ${error.message}`);
    }
  }
}

module.exports = new ProjectService();
