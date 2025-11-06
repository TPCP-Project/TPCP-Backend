const Comment = require("../models/comment");
const Task = require("../models/task");

// 🟢 Thêm bình luận vào task
exports.addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const user = req.user;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task không tồn tại" });

    // 🔒 Chỉ cho phép Manager hoặc nhân viên được giao task
    const isManager = user.role?.toLowerCase() === "manager";
    const isAssignedEmployee = task.assignedTo?.toString() === user._id.toString();

    if (!isManager && !isAssignedEmployee) {
      return res.status(403).json({
        message: "Chỉ Manager hoặc nhân viên được giao task mới có thể bình luận",
      });
    }

    const comment = await Comment.create({
      task: taskId,
      author: user._id,
      content: content.trim(),
    });

    const populated = await comment.populate("author", "name role");

    res.status(201).json({
      message: "Bình luận thành công",
      data: populated,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 🟡 Lấy danh sách bình luận theo task
exports.getCommentsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = req.user;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task không tồn tại" });

    const isManager = user.role?.toLowerCase() === "manager";
    const isAssignedEmployee = task.assignedTo?.toString() === user._id.toString();

    if (!isManager && !isAssignedEmployee) {
      return res.status(403).json({
        message: "Không có quyền xem bình luận của task này",
      });
    }

    const comments = await Comment.find({ task: taskId })
      .populate("author", "name role")
      .sort({ createdAt: -1 });

    res.json({ data: comments });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
