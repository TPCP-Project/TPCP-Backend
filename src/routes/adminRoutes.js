const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticateToken } = require("../middlewares/auth");

// ============== PUBLIC ROUTES (không cần admin) ===================
// Lấy danh sách packages (public - cho trang pricing)
router.get("/packages/public", adminController.getAllPackages);

// Tất cả routes còn lại yêu cầu đăng nhập và role admin
router.use(authenticateToken);
router.use(adminController.requireAdmin);

// =================== USER MANAGEMENT ===================
router.get("/users", adminController.getAllUsers);
router.get("/users/:userId", adminController.getUserDetails);
router.put("/users/:userId/role", adminController.updateUserRole);
router.put("/users/:userId/ban", adminController.banUser);
router.post("/users/:userId/send-warning", adminController.sendWarningEmail);

// =================== PACKAGE MANAGEMENT ===================
router.post("/packages", adminController.createPackage);
router.get("/packages", adminController.getAllPackages);
router.put("/packages/:packageId", adminController.updatePackage);
router.delete("/packages/:packageId", adminController.deletePackage);

// =================== PURCHASE MANAGEMENT ===================
router.get("/purchases", adminController.getAllPurchases);
router.put(
  "/purchases/:purchaseId/status",
  adminController.updatePurchaseStatus
);

// =================== NOTIFICATIONS ===================
router.get("/notifications", adminController.getAdminNotifications);
router.put(
  "/notifications/:notificationId/read",
  adminController.markNotificationAsRead
);

// =================== DASHBOARD ===================
router.get("/dashboard/stats", adminController.getDashboardStats);

module.exports = router;
