const express = require("express");
const router = new express.Router();
const ProfileController = require("../controllers/profileController");
const { authenticateToken, requireVerified } = require("../middlewares/auth");

// === ROUTES QUẢN LÝ PROFILE ===

// Lấy thông tin profile của user hiện tại
router.get("/profile", authenticateToken, requireVerified, (req, res) => {
  ProfileController.getMyProfile(req, res);
});

// Lấy thông tin profile của user khác (public)
router.get(
  "/profile/:userId",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProfileController.getProfileById(req, res);
  }
);

// Cập nhật profile
router.put("/profile", authenticateToken, requireVerified, (req, res) => {
  ProfileController.updateProfile(req, res);
});

// Cập nhật avatar
router.put(
  "/profile/avatar",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProfileController.updateAvatar(req, res);
  }
);

// Cập nhật cover image
router.put("/profile/cover", authenticateToken, requireVerified, (req, res) => {
  ProfileController.updateCoverImage(req, res);
});

// Cập nhật cài đặt riêng tư
router.put(
  "/profile/privacy",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProfileController.updatePrivacySettings(req, res);
  }
);

// Tìm kiếm profile
router.get(
  "/profile/search",
  authenticateToken,
  requireVerified,
  (req, res) => {
    ProfileController.searchProfiles(req, res);
  }
);

// Lấy thống kê profile
router.get("/profile/stats", authenticateToken, requireVerified, (req, res) => {
  ProfileController.getProfileStats(req, res);
});

// Xóa profile
router.delete("/profile", authenticateToken, requireVerified, (req, res) => {
  ProfileController.deleteProfile(req, res);
});

module.exports = router;
