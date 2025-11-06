const express = require("express");
const router = express.Router();

const taskController = require("../controllers/taskcontroller");
const { authenticateToken, requireManager } = require("../middlewares/auth");
//* === ROUTES QUẢN LÝ TASKS === *//

// GET TOÀN BỘ TASKS
router.get("/tasks", authenticateToken, taskController.getAllTasks);

// GET CHI TIẾT TASK THEO ID
router.get("/tasks/:id", authenticateToken, taskController.getTaskById);

// CREATE TASK MỚI
router.post("/tasks", authenticateToken, requireManager, taskController.createTask);

// UPDATE TASK
router.put("/tasks/:id", authenticateToken, requireManager, taskController.updateTask);

// DELETE TASK
router.delete("/tasks/:id", authenticateToken, requireManager, taskController.deleteTask);

// // 🟡 Gán task
// router.put("/tasks/:id/assign", authenticateToken, requireManager, taskController.assignTask);

// // 🟢 Cập nhật trạng thái task
// router.put("/tasks/:id/status", authenticateToken, taskController.updateTaskStatus);

module.exports = router;
