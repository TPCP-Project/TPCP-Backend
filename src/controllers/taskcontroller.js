const Task = require("../models/task");
const User = require("../models/user");
const Kpi = require("../models/kpi"); // ✅ thêm

// 🟢 Lấy toàn bộ task
exports.getAllTasks = async (req, res) => {
  try {
    let tasks;

    if (req.user.role === "manager") {
      tasks = await Task.find()
        .populate("projectId", "name")
        .populate("createdBy", "username email")
        .populate("assignedTo", "username email")
        .sort({ createdAt: -1 });
    } else {
      // Nhân viên chỉ thấy task được giao
      tasks = await Task.find({ assignedTo: req.user._id })
        .populate("projectId", "name")
        .populate("createdBy", "username email")
        .populate("assignedTo", "username email")
        .sort({ createdAt: -1 });
    }

    res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error("Get Tasks Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Lấy chi tiết task theo ID
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate("createdBy", "username email")
      .populate("projectId", "name")
      .populate("assignedTo", "username email");

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
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    if (req.user.role !== "manager") {
      return res
        .status(403)
        .json({ success: false, message: "Only manager can delete tasks" });
    }

    await Task.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Manager tạo task mới
exports.createTask = async (req, res) => {
  try {
    const { projectId, title, description, dueDate, kpiId } = req.body;

    const task = await Task.create({
      projectId,
      title,
      description,
      dueDate,
      createdBy: req.user._id,
      status: "In_Progress",
      kpiId, // ✅ liên kết KPI nếu có
    });

    res.status(201).json({ success: true, message: "Task created", task });
  } catch (error) {
    console.error("Create Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Cập nhật task (và tự động cập nhật KPI)
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;

    const task = await Task.findById(id);
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    // ✅ Quyền cập nhật
    if (req.user.role === "manager") {
      task.title = title || task.title;
      task.description = description || task.description;
      task.dueDate = dueDate || task.dueDate;
      task.status = status || task.status;
    } else {
      if (status) task.status = status;
      else
        return res.status(403).json({
          success: false,
          message: "You can only update the status",
        });
    }

    await task.save();

    // ✅ Nếu task liên kết KPI và chuyển sang Done → cập nhật KPI
    if (task.kpiId && status === "Done") {
      const kpi = await Kpi.findById(task.kpiId);
      if (kpi) {
        const totalTasks = await Task.countDocuments({ kpiId: task.kpiId });
        const completedTasks = await Task.countDocuments({
          kpiId: task.kpiId,
          status: "Done",
        });

        const progress = Math.round((completedTasks / totalTasks) * 100);

        // Cập nhật goal đầu tiên (nếu có)
        if (kpi.goals?.length > 0) {
          kpi.goals[0].actual = completedTasks;
          kpi.goals[0].progress = progress;
        }

        kpi.status =
          progress >= 100
            ? "Completed"
            : progress > 0
            ? "InProgress"
            : "Pending";

        await kpi.save();
        console.log(`🔁 KPI ${kpi._id} updated: ${progress}%`);
      }
    }

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
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    task.assignedTo = userId;
    await task.save();

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
