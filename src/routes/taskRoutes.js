const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const taskController = require("../controllers/taskcontroller");
const commentController = require("../controllers/commentController");
const { authenticateToken, requireManager } = require("../middlewares/auth");

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Đảm bảo folder uploads/ tồn tại
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Chấp nhận hầu hết các loại file
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

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

// 🟢 QUẢN LÝ FILE ATTACHMENTS
router.post("/tasks/:id/attachments", authenticateToken, upload.single('file'), taskController.uploadAttachment);
router.delete("/tasks/:id/attachments/:attachmentId", authenticateToken, taskController.deleteAttachment);

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
