const Kpi = require("../models/kpi");
const User = require("../models/user");

// 🟢 Tạo KPI (Manager)
exports.createKpi = async (req, res) => {
  try {
    const { employeeId, month, goals } = req.body;
    if (req.user.role !== "manager")
      return res.status(403).json({ message: "Only Manager can create KPI" });

    const employee = await User.findById(employeeId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const newKpi = new Kpi({ employeeId, month, goals });
    await newKpi.save();

    res.status(201).json({ message: "KPI created successfully", kpiId: newKpi._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 🟡 Cập nhật KPI (Manager)
exports.updateKpi = async (req, res) => {
  try {
    if (req.user.role !== "manager")
      return res.status(403).json({ message: "Only Manager can update KPI" });

    const kpi = await Kpi.findById(req.params.id);
    if (!kpi) return res.status(404).json({ message: "KPI not found" });

    if (req.body.month) kpi.month = req.body.month;
    if (req.body.goals) kpi.goals = req.body.goals;
    if (req.body.status) kpi.status = req.body.status;

    await kpi.save();
    res.json({ message: "KPI updated successfully", kpiId: kpi._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 🔍 Lấy danh sách KPI
exports.getKpis = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "employee") filter.employeeId = req.user._id;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.month) filter.month = req.query.month;

    const list = await Kpi.find(filter)
      .populate("employeeId", "name email role")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 🔍 Lấy chi tiết KPI
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

// ❌ Xóa KPI
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
