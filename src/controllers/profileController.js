const ProfileService = require("../services/ProfileService");

class ProfileController {
  /**
   * Lấy thông tin profile của user hiện tại
   * @route GET /api/profile
   */
  async getMyProfile(req, res) {
    try {
      const userId = req.user._id;
      const result = await ProfileService.getProfileByUserId(userId);

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin profile thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getMyProfile:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy thông tin profile",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy thông tin profile của user khác (public)
   * @route GET /api/profile/:userId
   */
  async getProfileById(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user._id;

      const result = await ProfileService.getPublicProfile(
        userId,
        currentUserId
      );

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin profile thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getProfileById:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy thông tin profile",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Tạo hoặc cập nhật profile
   * @route PUT /api/profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updateData = req.body;

      const result = await ProfileService.updateProfile(userId, updateData);

      return res.status(200).json({
        success: true,
        message: "Cập nhật profile thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in updateProfile:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể cập nhật profile",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Cập nhật avatar
   * @route PUT /api/profile/avatar
   */
  async updateAvatar(req, res) {
    try {
      const userId = req.user._id;
      const { avatar } = req.body;

      const result = await ProfileService.updateAvatar(userId, avatar);

      return res.status(200).json({
        success: true,
        message: "Cập nhật avatar thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in updateAvatar:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể cập nhật avatar",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Cập nhật cover image
   * @route PUT /api/profile/cover
   */
  async updateCoverImage(req, res) {
    try {
      const userId = req.user._id;
      const { cover_image } = req.body;

      const result = await ProfileService.updateCoverImage(userId, cover_image);

      return res.status(200).json({
        success: true,
        message: "Cập nhật ảnh bìa thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in updateCoverImage:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể cập nhật ảnh bìa",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Cập nhật cài đặt riêng tư
   * @route PUT /api/profile/privacy
   */
  async updatePrivacySettings(req, res) {
    try {
      const userId = req.user._id;
      const { privacy_settings } = req.body;

      const result = await ProfileService.updatePrivacySettings(
        userId,
        privacy_settings
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật cài đặt riêng tư thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in updatePrivacySettings:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể cập nhật cài đặt riêng tư",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Tìm kiếm profile
   * @route GET /api/profile/search
   */
  async searchProfiles(req, res) {
    try {
      const { q, page = 1, limit = 10, filters = {} } = req.query;
      const currentUserId = req.user._id;

      const result = await ProfileService.searchProfiles(
        q,
        currentUserId,
        parseInt(page),
        parseInt(limit),
        filters
      );

      return res.status(200).json({
        success: true,
        message: "Tìm kiếm profile thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in searchProfiles:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể tìm kiếm profile",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Lấy thống kê profile
   * @route GET /api/profile/stats
   */
  async getProfileStats(req, res) {
    try {
      const userId = req.user._id;
      const result = await ProfileService.getProfileStats(userId);

      return res.status(200).json({
        success: true,
        message: "Lấy thống kê profile thành công",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getProfileStats:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy thống kê profile",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Xóa profile
   * @route DELETE /api/profile
   */
  async deleteProfile(req, res) {
    try {
      const userId = req.user._id;
      const result = await ProfileService.deleteProfile(userId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in deleteProfile:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể xóa profile",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new ProfileController();
