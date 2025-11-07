const express = require("express");
const router = express.Router();
const kpiController = require("../controllers/kpicontroller");
const { authenticateToken } = require("../middlewares/auth");

// 🔐 Bảo vệ tất cả route
router.use(authenticateToken);

// 🟢 Tạo KPI
router.post("/kpi", kpiController.createKpi);

// 🟡 Cập nhật KPI
router.put("/kpi/:id", kpiController.updateKpi);

// 🔍 Lấy danh sách KPI
router.get("/kpi", kpiController.getKpis);

// 🔍 Lấy chi tiết KPI
router.get("/kpi/:id", kpiController.getKpiById);

// ❌ Xóa KPI
router.delete("/kpi/:id", kpiController.deleteKpi);

module.exports = router;
