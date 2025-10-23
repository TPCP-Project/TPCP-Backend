const ProjectService = require("../services/ProjectService");

class ProjectController {
  //Tạo project mới
  async createProject(req, res) {
    try {
      const { name, description, auto_approve_members, settings } = req.body;
      const userId = req.user._id;

      const result = await ProjectService.createProject(
        userId,
        name,
        description,
        auto_approve_members,
        settings
      );

      return res.status(201).json({
        success: true,
        message: "Tạo project thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in createProject:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể tạo project",
        timestamp: new Date().toISOString(),
      });
    }
  }

  //Lấy danh sách project của user
  async getUserProjects(req, res) {
    try {
      const userId = req.user._id;
      const { status, page = 1, limit = 10 } = req.query;

      const result = await ProjectService.getUserProjects(
        userId,
        status,
        parseInt(page),
        parseInt(limit)
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách project thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getUserProjects:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách project",
        timestamp: new Date().toISOString(),
      });
    }
  }

  //Lấy thông tin chi tiết project
  async getProjectById(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const result = await ProjectService.getProjectById(projectId, userId);

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin project thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getProjectById:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy thông tin project",
        timestamp: new Date().toISOString(),
      });
    }
  }

  //Cập nhật thông tin project
  async updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const { name, description, status, auto_approve_members, settings } =
        req.body;
      const userId = req.user._id;

      const result = await ProjectService.updateProject(projectId, userId, {
        name,
        description,
        status,
        auto_approve_members,
        settings,
      });

      return res.status(200).json({
        success: true,
        message: "Cập nhật project thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in updateProject:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể cập nhật project",
        timestamp: new Date().toISOString(),
      });
    }
  }

  //Xóa project
  async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const result = await ProjectService.deleteProject(projectId, userId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in deleteProject:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể xóa project",
        timestamp: new Date().toISOString(),
      });
    }
  }

  //Lấy danh sách thành viên của project
  async getProjectMembers(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const result = await ProjectService.getProjectMembers(projectId, userId);

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách thành viên thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getProjectMembers:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách thành viên",
        timestamp: new Date().toISOString(),
      });
    }
  }

  //Rời khỏi project
  async leaveProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user._id;

      const result = await ProjectService.leaveProject(projectId, userId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in leaveProject:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể rời khỏi project",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new ProjectController();
