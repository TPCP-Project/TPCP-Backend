const Comment = require("../models/comment");
const Task = require("../models/task");
const ProjectMember = require("../models/projectMember");

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

    // 🔒 Kiểm tra membership trong project
    const membership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        message: "Bạn không phải thành viên của dự án này",
      });
    }

    // Owner/Admin có thể comment bất kỳ task nào, member chỉ comment task của mình
    const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";
    const isAssignedEmployee = task.assignedTo?.toString() === user._id.toString();

    if (!isOwnerOrAdmin && !isAssignedEmployee) {
      return res.status(403).json({
        message: "Bạn chỉ có thể bình luận vào task được giao cho bạn",
      });
    }

    const comment = await Comment.create({
      task: taskId,
      author: user._id,
      content: content.trim(),
    });

    const populated = await comment.populate("author", "username email");

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

    // Kiểm tra membership trong project
    const membership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        message: "Bạn không phải thành viên của dự án này",
      });
    }

    // Owner/Admin có thể xem comment của bất kỳ task nào
    // Member chỉ xem comment của task được giao cho mình
    const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";
    const isAssignedEmployee = task.assignedTo?.toString() === user._id.toString();

    if (!isOwnerOrAdmin && !isAssignedEmployee) {
      return res.status(403).json({
        message: "Bạn chỉ có thể xem bình luận của task được giao cho bạn",
      });
    }

    const comments = await Comment.find({ task: taskId })
      .populate("author", "username email")
      .sort({ createdAt: -1 });

    res.json({ data: comments });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
