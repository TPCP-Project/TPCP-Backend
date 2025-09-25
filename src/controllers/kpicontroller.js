const Kpi = require("../models/kpi");
const User = require("../models/user");
const Task = require("../models/task");
const ProjectMember = require("../models/projectMember");

//  Tạo KPI (Manager)
exports.createKpi = async (req, res) => {
  try {
    if (req.user.role !== "manager")
      return res.status(403).json({ message: "Only Manager can create KPI" });

    const employee = await User.findById(req.body.employeeId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const newKpi = new Kpi({
      employeeId: req.body.employeeId,
      month: req.body.month,
      goals: req.body.goals,
    });

    await newKpi.save();
    res.status(201).json({ message: "KPI created successfully", kpiId: newKpi._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

//  Cập nhật KPI
exports.updateKpi = async (req, res) => {
  try {
    if (req.user.role !== "manager")
      return res.status(403).json({ message: "Only Manager can update KPI" });

    const kpi = await Kpi.findById(req.params.id);
    if (!kpi) return res.status(404).json({ message: "KPI not found" });

    if (req.body.month) kpi.month = req.body.month;
    if (req.body.goals) kpi.goals = req.body.goals;

    await kpi.save();
    res.json({ message: "KPI updated successfully", kpiId: kpi._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

//  Lấy danh sách KPI
exports.getKpis = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "employee") {
      filter.employeeId = req.user._id;
    } else if (req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }
    if (req.query.month) filter.month = req.query.month;

    const list = await Kpi.find(filter)
      .populate("employeeId", "name email role")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

//  Lấy chi tiết KPI
exports.getKpiById = async (req, res) => {
  try {
    const kpi = await Kpi.findById(req.params.id).populate("employeeId", "name email role");
    if (!kpi) return res.status(404).json({ message: "KPI not found" });

    if (
      req.user.role === "employee" &&
      kpi.employeeId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(kpi);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

//  Xóa KPI
exports.deleteKpi = async (req, res) => {
  try {
    if (req.user.role !== "manager")
      return res.status(403).json({ message: "Only Manager can delete KPI" });

    const deleted = await Kpi.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "KPI not found" });

    res.json({ message: "KPI deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

//  Tính KPI tự động từ tasks
exports.calculateKpiFromTasks = async (userId, projectId, month) => {
  try {
    // Parse month (format: "YYYY-MM")
    const [year, monthNum] = month.split('-');
    const startDate = new Date(year, parseInt(monthNum) - 1, 1);
    const endDate = new Date(year, parseInt(monthNum), 0, 23, 59, 59);

    // Lấy tất cả tasks assigned cho user trong tháng
    const tasks = await Task.find({
      assignedTo: userId,
      projectId: projectId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Tính metrics
    const totalTasksAssigned = tasks.length;
    const tasksCompleted = tasks.filter(t => t.status === 'APPROVED').length;
    const tasksInProgress = tasks.filter(t => t.status === 'DRAFTING' || t.status === 'IN_REVIEW' || t.status === 'TO_DO').length;
    const tasksBlocked = tasks.filter(t => t.status === 'BLOCKED').length;
    const tasksOverdue = tasks.filter(t => t.isOverdue).length;

    // Tính completion rate
    const completionRate = totalTasksAssigned > 0
      ? Math.round((tasksCompleted / totalTasksAssigned) * 100)
      : 0;

    // Tính on-time rate (tasks completed before due date)
    const completedTasks = tasks.filter(t => t.status === 'APPROVED' && t.completedAt);
    const onTimeTasks = completedTasks.filter(t => {
      if (!t.dueDate) return true; // No due date = always on time
      return new Date(t.completedAt) <= new Date(t.dueDate);
    });
    const onTimeRate = completedTasks.length > 0
      ? Math.round((onTimeTasks.length / completedTasks.length) * 100)
      : 0;

    // Tính average completion time
    let totalCompletionTime = 0;
    completedTasks.forEach(t => {
      if (t.completedAt && t.createdAt) {
        const days = Math.ceil((new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24));
        totalCompletionTime += days;
      }
    });
    const averageCompletionTime = completedTasks.length > 0
      ? Math.round(totalCompletionTime / completedTasks.length)
      : 0;

    return {
      totalTasksAssigned,
      tasksCompleted,
      tasksInProgress,
      tasksBlocked,
      tasksOverdue,
      completionRate,
      onTimeRate,
      averageCompletionTime,
    };
  } catch (error) {
    console.error('Error calculating KPI from tasks:', error);
    throw error;
  }
};

//  API: Tính và lưu KPI cho user
exports.calculateAndSaveKpi = async (req, res) => {
  try {
    const { userId, projectId, month } = req.body;

    if (!userId || !projectId || !month) {
      return res.status(400).json({
        success: false,
        message: "userId, projectId, and month are required"
      });
    }

    // Tính task metrics
    const taskMetrics = await exports.calculateKpiFromTasks(userId, projectId, month);

    // Tìm hoặc tạo KPI document
    let kpi = await Kpi.findOne({ employeeId: userId, projectId, month });

    if (!kpi) {
      kpi = new Kpi({
        employeeId: userId,
        projectId,
        month,
        taskMetrics,
        goals: []
      });
    } else {
      kpi.taskMetrics = taskMetrics;
    }

    // Tính overall score
    kpi.calculateOverallScore();

    await kpi.save();

    const populatedKpi = await Kpi.findById(kpi._id)
      .populate('employeeId', 'name email username')
      .populate('projectId', 'name');

    res.status(200).json({
      success: true,
      message: "KPI calculated successfully",
      kpi: populatedKpi
    });
  } catch (error) {
    console.error('Calculate and save KPI error:', error);
    res.status(500).json({
      success: false,
      message: "Error calculating KPI",
      error: error.message
    });
  }
};

//  API: Lấy KPI của project (all members)
exports.getProjectKpiDashboard = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { month } = req.query;

    console.log('=== KPI Dashboard Request ===');
    console.log('ProjectId:', projectId);
    console.log('Month:', month);
    console.log('User:', req.user._id);

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "month query parameter is required (format: YYYY-MM)"
      });
    }

    // Kiểm tra user có quyền xem project KPI không
    const membership = await ProjectMember.findOne({
      project_id: projectId,
      user_id: req.user._id,
      status: "active"
    });

    console.log('Membership found:', membership ? 'Yes' : 'No');

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này"
      });
    }

    // Lấy tất cả members của project
    const members = await ProjectMember.find({
      project_id: projectId,
      status: "active"
    }).populate('user_id', 'name email username');

    console.log('Total members found:', members.length);

    // Tính KPI cho từng member
    const kpiData = [];
    for (const member of members) {
      try {
        console.log(`Processing member: ${member.user_id._id}`);

        const taskMetrics = await exports.calculateKpiFromTasks(member.user_id._id, projectId, month);
        console.log('Task metrics:', taskMetrics);

        // Tìm hoặc tạo KPI
        let kpi = await Kpi.findOne({
          employeeId: member.user_id._id,
          projectId,
          month
        });

        if (!kpi) {
          console.log('Creating new KPI document');
          kpi = new Kpi({
            employeeId: member.user_id._id,
            projectId,
            month,
            taskMetrics,
            goals: []
          });
        } else {
          console.log('Updating existing KPI document');
          kpi.taskMetrics = taskMetrics;
        }

        kpi.calculateOverallScore();
        await kpi.save();
        console.log('KPI saved. Score:', kpi.overallScore, 'Status:', kpi.status);

        kpiData.push({
          employee: {
            _id: member.user_id._id,
            name: member.user_id.name,
            email: member.user_id.email,
            username: member.user_id.username
          },
          role: member.role,
          kpi: {
            taskMetrics: kpi.taskMetrics,
            overallScore: kpi.overallScore,
            status: kpi.status
          }
        });
      } catch (memberError) {
        console.error(`Error processing member ${member.user_id._id}:`, memberError);
        throw memberError;
      }
    }

    // Sort by overall score (descending)
    kpiData.sort((a, b) => b.kpi.overallScore - a.kpi.overallScore);

    console.log('=== KPI Dashboard Success ===');
    console.log('Total KPI records:', kpiData.length);

    res.status(200).json({
      success: true,
      data: {
        projectId,
        month,
        members: kpiData
      }
    });
  } catch (error) {
    console.error('Get project KPI dashboard error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Error getting project KPI dashboard",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
