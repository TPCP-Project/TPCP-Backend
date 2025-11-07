const express = require("express");
const router = express.Router();

const taskController = require("../controllers/taskcontroller");
const commentController = require("../controllers/commentController");
const { authenticateToken, requireManager } = require("../middlewares/auth");

//* === ROUTES QUẢN LÝ TASKS === *//

// 🟢 GET TOÀN BỘ TASKS
router.get("/tasks", authenticateToken, taskController.getAllTasks);

// 🟡 GET CHI TIẾT TASK THEO ID
router.get("/tasks/:id", authenticateToken, taskController.getTaskById);

// 🟢 CREATE TASK MỚI (Owner/Admin của project)
router.post("/tasks", authenticateToken, taskController.createTask);

// 🟡 UPDATE TASK (Owner/Admin hoặc member được assign)
router.put("/tasks/:id", authenticateToken, taskController.updateTask);

// 🔴 DELETE TASK (Owner/Admin của project)
router.delete("/tasks/:id", authenticateToken, taskController.deleteTask);

// 🟢 GÁN TASK CHO THÀNH VIÊN (Owner/Admin của project)
router.put("/tasks/:id/assign", authenticateToken, taskController.assignTask);

// 🟢 CẬP NHẬT TRẠNG THÁI TASK (Drag & Drop Kanban)
router.put("/tasks/:id/status", authenticateToken, taskController.updateTaskStatus);

// 🟢 LẤY TASKS THEO BOARD (Kanban Columns)
router.get("/tasks/board/:projectId", authenticateToken, taskController.getTasksByBoard);

// 🟢 QUẢN LÝ SUBTASKS
router.post("/tasks/:id/subtasks", authenticateToken, taskController.addSubtask);
router.put("/tasks/:id/subtasks/:subtaskId", authenticateToken, taskController.updateSubtask);
router.delete("/tasks/:id/subtasks/:subtaskId", authenticateToken, taskController.deleteSubtask);

// ===========================================================
// 💬 COMMENT ROUTES (Manager hoặc nhân viên được giao task)
// ===========================================================

// 🟢 Thêm bình luận vào task
router.post(
  "/tasks/:taskId/comments",
  authenticateToken,
  commentController.addComment
);

// 🟡 Lấy danh sách bình luận của task
router.get(
  "/tasks/:taskId/comments",
  authenticateToken,
  commentController.getCommentsByTask
);

module.exports = router;