const express = require("express");
const router = express.Router();
const kpiController = require("../controllers/kpicontroller");
const { authenticateToken } = require("../middlewares/auth");

// ✅ Tất cả routes yêu cầu đăng nhập
router.use(authenticateToken);

// 🟢 Tạo KPI
router.post("/", kpiController.createKpi);

// 🟡 Cập nhật KPI
router.put("/:id", kpiController.updateKpi);

// 🔍 Lấy danh sách KPI
router.get("/", kpiController.getKpis);

// 🔍 Lấy chi tiết KPI
router.get("/:id", kpiController.getKpiById);

// ❌ Xóa KPI
router.delete("/:id", kpiController.deleteKpi);

// 📊 Tính KPI tự động từ tasks
router.post("/calculate", kpiController.calculateAndSaveKpi);

// 📊 Lấy KPI Dashboard của project
router.get("/project/:projectId/dashboard", kpiController.getProjectKpiDashboard);

module.exports = router;
