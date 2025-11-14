const Task = require("../models/task");
const User = require("../models/user");
const ProjectMember = require("../models/projectMember");

// 🟢 Lấy toàn bộ task (của các project user tham gia)
exports.getAllTasks = async (req, res) => {
  try {
    // Lấy tất cả projects mà user là member
    const memberships = await ProjectMember.find({
      user_id: req.user._id,
      status: "active"
    }).select("project_id");

    const projectIds = memberships.map(m => m.project_id);

    // Lấy tất cả tasks thuộc các projects đó
    const tasks = await Task.find({ projectId: { $in: projectIds } })
      .populate('projectId', 'name')
      .populate('createdBy', 'username email')
      .populate('assignedTo', 'username email')
      .sort({ createdAt: -1 });

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

// 🟢 Xóa task (chỉ owner/admin của project)
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Kiểm tra membership trong project
    const membership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: req.user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    // Chỉ owner/admin mới được xóa task
    if (membership.role !== "owner" && membership.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ owner hoặc admin của dự án mới có thể xóa task"
      });
    }

    await Task.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete Task Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Tạo task mới (chỉ owner/admin của project)
exports.createTask = async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      dueDate,
      assignedTo,
      status,
      priority,
      sprint,
      labels
    } = req.body;

    // Kiểm tra xem user có phải owner/admin của project không
    const membership = await ProjectMember.findOne({
      project_id: projectId,
      user_id: req.user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    // Chỉ owner hoặc admin mới được tạo task
    if (membership.role !== "owner" && membership.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ owner hoặc admin của dự án mới có thể tạo task"
      });
    }

    // Kiểm tra assignedTo có phải member của project không
    if (assignedTo) {
      const assigneeMembership = await ProjectMember.findOne({
        project_id: projectId,
        user_id: assignedTo,
        status: "active"
      });

      if (!assigneeMembership) {
        return res.status(400).json({
          success: false,
          message: "Người được giao không phải thành viên của dự án này"
        });
      }
    }

    const task = await Task.create({
      projectId,
      title,
      description,
      dueDate,
      assignedTo,
      status: status || "TO_DO",
      priority: priority || "Medium",
      sprint,
      labels: labels || [],
      subtasks: [],
      createdBy: req.user._id,
    });

    // Populate để trả về đầy đủ thông tin
    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .populate("projectId", "name");

    res.status(201).json({ success: true, message: "Task created", task: populatedTask });
  } catch (error) {
    console.error("Create Task Error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 🟢 Cập nhật task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status, priority, sprint, labels, assignedTo } = req.body;

    console.log('=== Update Task Request ===');
    console.log('Task ID:', id);
    console.log('Update data:', { title, description, dueDate, status, priority, sprint, labels, assignedTo });
    console.log('User:', req.user._id);

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    console.log('Task found, projectId:', task.projectId);

    // Kiểm tra membership trong project
    const membership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: req.user._id,
      status: "active"
    });

    console.log('Membership:', membership ? membership.role : 'Not found');

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    // Owner/Admin có thể update tất cả, member chỉ update status
    if (membership.role === "owner" || membership.role === "admin") {
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (sprint !== undefined) task.sprint = sprint;
      if (labels !== undefined) task.labels = labels;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
    } else {
      // Member chỉ có thể update status nếu task được assign cho họ
      if (task.assignedTo && task.assignedTo.toString() === req.user._id.toString()) {
        if (status) {
          task.status = status;
        } else {
          return res.status(403).json({
            success: false,
            message: "Bạn chỉ có thể cập nhật trạng thái của task được giao cho bạn"
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền cập nhật task này"
        });
      }
    }

    console.log('Saving task...');
    await task.save();
    console.log('Task saved successfully');

    const updatedTask = await Task.findById(id)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .populate("projectId", "name");

    res.status(200).json({ success: true, message: "Task updated", task: updatedTask });
  } catch (error) {
    console.error("Update Task Error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 🟢 Gán task cho thành viên (owner/admin của project)
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

    // Kiểm tra membership của người gán task
    const membership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: req.user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    // Chỉ owner/admin mới được gán task
    if (membership.role !== "owner" && membership.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ owner hoặc admin của dự án mới có thể gán task"
      });
    }

    // Kiểm tra user được gán có phải member của project không
    const assigneeMembership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: userId,
      status: "active"
    });

    if (!assigneeMembership) {
      return res.status(400).json({
        success: false,
        message: "User không phải thành viên của dự án này"
      });
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

// 🟢 Cập nhật trạng thái task (cho Kanban drag & drop)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Kiểm tra membership
    const membership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: req.user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    // Owner/admin có thể update bất kỳ task nào, member chỉ update task của mình
    if (membership.role !== "owner" && membership.role !== "admin") {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ có thể cập nhật trạng thái task được giao cho bạn"
        });
      }
    }

    task.status = status;
    await task.save();

    const updatedTask = await Task.findById(id)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .populate("projectId", "name");

    res.status(200).json({
      success: true,
      message: "Task status updated",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update Task Status Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Lấy tasks theo board (Kanban columns)
exports.getTasksByBoard = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sprint } = req.query;

    // Kiểm tra membership
    const membership = await ProjectMember.findOne({
      project_id: projectId,
      user_id: req.user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    // Build query
    const query = { projectId };
    if (sprint) {
      query.sprint = sprint;
    }

    // Lấy tất cả tasks
    const tasks = await Task.find(query)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });

    // Nhóm tasks theo status (columns)
    const columns = {
      TO_DO: [],
      DRAFTING: [],
      IN_REVIEW: [],
      APPROVED: [],
      BLOCKED: []
    };

    tasks.forEach(task => {
      if (columns[task.status]) {
        columns[task.status].push(task);
      }
    });

    res.status(200).json({
      success: true,
      columns,
      totalTasks: tasks.length
    });
  } catch (error) {
    console.error("Get Tasks Board Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Thêm subtask vào task
exports.addSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Subtask title is required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Kiểm tra quyền
    const membership = await ProjectMember.findOne({
      project_id: task.projectId,
      user_id: req.user._id,
      status: "active"
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    task.subtasks.push({ title, completed: false });
    await task.save();

    const updatedTask = await Task.findById(id)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .populate("projectId", "name");

    res.status(200).json({
      success: true,
      message: "Subtask added",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Add Subtask Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Cập nhật subtask
exports.updateSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;
    const { title, completed } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({ success: false, message: "Subtask not found" });
    }

    if (title !== undefined) subtask.title = title;
    if (completed !== undefined) subtask.completed = completed;

    await task.save();

    const updatedTask = await Task.findById(id)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .populate("projectId", "name");

    res.status(200).json({
      success: true,
      message: "Subtask updated",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update Subtask Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Xóa subtask
exports.deleteSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    task.subtasks.pull(subtaskId);
    await task.save();

    const updatedTask = await Task.findById(id)
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email")
      .populate("projectId", "name");

    res.status(200).json({
      success: true,
      message: "Subtask deleted",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Delete Subtask Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};