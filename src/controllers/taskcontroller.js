const Task = require("../models/task");
const User = require("../models/user");

// 🟢 Lấy toàn bộ task
exports.getAllTasks = async (req, res) => {
  try {
    let tasks;

    if (req.user.role === 'manager') {
      tasks = await Task.find()
        .populate('projectId', 'name')
        .populate('createdBy', 'username email')
        .populate('assignedTo', 'username email')
        .sort({ createdAt: -1 });
    } else {
      // Nhân viên chỉ thấy task được giao
      tasks = await Task.find({ assignedTo: req.user._id })
        .populate('projectId', 'name')
        .populate('createdBy', 'username email')
        .populate('assignedTo', 'username email')
        .sort({ createdAt: -1 });
    }

    res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error('Get Tasks Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 🟢 Lấy chi tiết task theo ID
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("createdBy", "username email")
      .populate("projectId", "name")
      .populate("assignedTo", "username email"); // ✅ thêm dòng này

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.status(200).json({ success: true, task });
  } catch (error) {
    console.error("Get Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Xóa task (chỉ manager)
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (req.user.role !== "manager") {
      return res.status(403).json({ success: false, message: "Only manager can delete tasks" });
    }

    await Task.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Manager tạo task mới
exports.createTask = async (req, res) => {
  try {
    const { projectId, title, description, dueDate } = req.body;

    const task = await Task.create({
      projectId,
      title,
      description,
      dueDate,
      createdBy: req.user._id,
      status: "In_Progress",
    });

    res.status(201).json({ success: true, message: "Task created", task });
  } catch (error) {
    console.error("Create Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Cập nhật task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (req.user.role === "manager") {
      task.title = title || task.title;
      task.description = description || task.description;
      task.dueDate = dueDate || task.dueDate;
      task.status = status || task.status;
    } else {
      if (status) task.status = status;
      else return res.status(403).json({ success: false, message: "You can only update the status" });
    }

    await task.save();
    res.status(200).json({ success: true, message: "Task updated", task });
  } catch (error) {
    console.error("Update Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Manager gán task cho thành viên
exports.assignTask = async (req, res) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // (Optional) kiểm tra user tồn tại
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Gán nhân viên
    task.assignedTo = userId;
    await task.save();

    // ✅ Populate lại task để frontend có username/email
    const updatedTask = await Task.findById(id)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .populate("projectId", "name");

    res.status(200).json({
      success: true,
      message: "Task assigned successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Assign Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};