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

// 🟢 CREATE TASK MỚI (Manager)
router.post("/tasks", authenticateToken, requireManager, taskController.createTask);

// 🟡 UPDATE TASK (Manager)
router.put("/tasks/:id", authenticateToken, requireManager, taskController.updateTask);

// 🔴 DELETE TASK (Manager)
router.delete("/tasks/:id", authenticateToken, requireManager, taskController.deleteTask);

// 🟢 GÁN TASK CHO THÀNH VIÊN (Manager)
router.put("/tasks/:id/assign", authenticateToken, requireManager, taskController.assignTask);

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