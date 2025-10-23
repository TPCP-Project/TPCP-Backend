const express = require("express");
const router = new express.Router();
const ProjectController = require("../controllers/projectController");
const { authenticateToken, requireVerified } = require("../middlewares/auth");

// === ROUTES QUẢN LÝ PROJECT ===

/* Tạo project mới */
router.post("/projects", authenticateToken, requireVerified, (req, res) => {
  ProjectController.createProject(req, res);
});

/* Lấy danh sách project của user */
router.get("/projects", authenticateToken, requireVerified, (req, res) => {
  ProjectController.getUserProjects(req, res);
});

/* Lấy thông tin chi tiết project */
router.get(
  "/projects/:projectId",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectController.getProjectById(req, res);
  }
);

/* Cập nhật thông tin project */
router.put(
  "/projects/:projectId",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectController.updateProject(req, res);
  }
);

/* Xóa project */
router.delete(
  "/projects/:projectId",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectController.deleteProject(req, res);
  }
);

/* Lấy danh sách thành viên của project */
router.get(
  "/projects/:projectId/members",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectController.getProjectMembers(req, res);
  }
);

/* Rời khỏi project */
router.delete(
  "/projects/:projectId/leave",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProjectController.leaveProject(req, res);
  }
);

module.exports = router;
