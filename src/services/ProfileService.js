const Profile = require("../models/profile");
const User = require("../models/user");
const mongoose = require("mongoose");

class ProfileService {
  /**
   * Lấy profile của user theo userId
   */
  async getProfileByUserId(userId) {
    try {
      let profile = await Profile.findOne({ user_id: userId })
        .populate("user_id", "name username email avatar accountStatus")
        .lean();

      // Nếu chưa có profile, tạo mới
      if (!profile) {
        const user = await User.findById(userId);
        if (!user) {
          throw new Error("Không tìm thấy user");
        }

        profile = await Profile.create({
          user_id: userId,
          full_name: user.name || user.username,
        });

        profile = await Profile.findById(profile._id)
          .populate("user_id", "name username email avatar accountStatus")
          .lean();
      }

      return profile;
    } catch (error) {
      throw new Error(`Không thể lấy profile: ${error.message}`);
    }
  }

  /**
   * Lấy profile public của user khác
   */
  async getPublicProfile(userId, currentUserId) {
    try {
      const profile = await Profile.findOne({
        user_id: userId,
        is_public: true,
      })
        .populate("user_id", "name username email avatar accountStatus")
        .lean();

      if (!profile) {
        throw new Error("Profile không tồn tại hoặc không public");
      }

      // Tăng số lượt xem
      await Profile.findByIdAndUpdate(profile._id, {
        $inc: { profile_views: 1 },
      });

      // Lọc thông tin theo cài đặt riêng tư
      const filteredProfile = this.filterProfileByPrivacy(profile);

      return filteredProfile;
    } catch (error) {
      throw new Error(`Không thể lấy profile: ${error.message}`);
    }
  }

  /**
   * Cập nhật profile
   */
  async updateProfile(userId, updateData) {
    try {
      // Kiểm tra user tồn tại
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Không tìm thấy user");
      }

      // Tìm hoặc tạo profile
      let profile = await Profile.findOne({ user_id: userId });

      if (!profile) {
        profile = new Profile({
          user_id: userId,
          full_name: user.name || user.username,
        });
      }

      // Cập nhật dữ liệu
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          profile[key] = updateData[key];
        }
      });

      // Kiểm tra completion
      profile.is_completed = this.checkProfileCompletion(profile);

      await profile.save();

      // Populate và trả về
      const updatedProfile = await Profile.findById(profile._id)
        .populate("user_id", "name username email avatar accountStatus")
        .lean();

      return updatedProfile;
    } catch (error) {
      throw new Error(`Không thể cập nhật profile: ${error.message}`);
    }
  }

  /**
   * Cập nhật avatar
   */
  async updateAvatar(userId, avatarData) {
    try {
      const profile = await Profile.findOneAndUpdate(
        { user_id: userId },
        {
          $set: { avatar: avatarData },
          $set: { last_updated: new Date() },
        },
        { new: true, upsert: true }
      ).populate("user_id", "name username email avatar accountStatus");

      return profile;
    } catch (error) {
      throw new Error(`Không thể cập nhật avatar: ${error.message}`);
    }
  }

  /**
   * Cập nhật cover image
   */
  async updateCoverImage(userId, coverImageData) {
    try {
      const profile = await Profile.findOneAndUpdate(
        { user_id: userId },
        {
          $set: { cover_image: coverImageData },
          $set: { last_updated: new Date() },
        },
        { new: true, upsert: true }
      ).populate("user_id", "name username email avatar accountStatus");

      return profile;
    } catch (error) {
      throw new Error(`Không thể cập nhật ảnh bìa: ${error.message}`);
    }
  }

  /**
   * Cập nhật cài đặt riêng tư
   */
  async updatePrivacySettings(userId, privacySettings) {
    try {
      const profile = await Profile.findOneAndUpdate(
        { user_id: userId },
        {
          $set: { privacy_settings: privacySettings },
          $set: { last_updated: new Date() },
        },
        { new: true, upsert: true }
      ).populate("user_id", "name username email avatar accountStatus");

      return profile;
    } catch (error) {
      throw new Error(`Không thể cập nhật cài đặt riêng tư: ${error.message}`);
    }
  }

  /**
   * Tìm kiếm profile
   */
  async searchProfiles(
    query,
    currentUserId,
    page = 1,
    limit = 10,
    filters = {}
  ) {
    try {
      const searchQuery = { is_public: true };

      // Text search
      if (query) {
        searchQuery.$text = { $search: query };
      }

      // Filters
      if (filters.gender) {
        searchQuery.gender = filters.gender;
      }

      if (filters.city) {
        searchQuery["address.city"] = new RegExp(filters.city, "i");
      }

      if (filters.occupation) {
        searchQuery["occupation.job_title"] = new RegExp(
          filters.occupation,
          "i"
        );
      }

      // Loại trừ user hiện tại
      searchQuery.user_id = { $ne: currentUserId };

      const profiles = await Profile.find(searchQuery)
        .populate("user_id", "name username email avatar accountStatus")
        .sort({
          score: { $meta: "textScore" },
          profile_views: -1,
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Lọc thông tin theo privacy settings
      const filteredProfiles = profiles.map((profile) =>
        this.filterProfileByPrivacy(profile)
      );

      // Đếm tổng số
      const totalProfiles = await Profile.countDocuments(searchQuery);

      return {
        profiles: filteredProfiles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalProfiles / limit),
          totalProfiles,
          hasNext: page < Math.ceil(totalProfiles / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Không thể tìm kiếm profile: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê profile
   */
  async getProfileStats(userId) {
    try {
      const profile = await Profile.findOne({ user_id: userId });

      if (!profile) {
        throw new Error("Profile không tồn tại");
      }

      const stats = {
        profile_views: profile.profile_views || 0,
        completion_percentage: profile.completion_percentage || 0,
        is_completed: profile.is_completed || false,
        is_public: profile.is_public || false,
        last_updated: profile.last_updated,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      };

      return stats;
    } catch (error) {
      throw new Error(`Không thể lấy thống kê profile: ${error.message}`);
    }
  }

  /**
   * Xóa profile
   */
  async deleteProfile(userId) {
    try {
      const profile = await Profile.findOneAndDelete({ user_id: userId });

      if (!profile) {
        throw new Error("Profile không tồn tại");
      }

      return {
        message: "Xóa profile thành công",
      };
    } catch (error) {
      throw new Error(`Không thể xóa profile: ${error.message}`);
    }
  }

  /**
   * Lọc thông tin profile theo cài đặt riêng tư
   */
  filterProfileByPrivacy(profile) {
    const privacy = profile.privacy_settings || {};
    const filtered = { ...profile };

    if (!privacy.show_phone) {
      delete filtered.phone_number;
    }

    if (!privacy.show_email) {
      if (filtered.user_id) {
        delete filtered.user_id.email;
      }
    }

    if (!privacy.show_address) {
      delete filtered.address;
    }

    if (!privacy.show_social_links) {
      delete filtered.social_links;
    }

    if (!privacy.show_occupation) {
      delete filtered.occupation;
    }

    return filtered;
  }

  /**
   * Kiểm tra profile đã hoàn thành chưa
   */
  checkProfileCompletion(profile) {
    const requiredFields = [
      "full_name",
      "phone_number",
      "date_of_birth",
      "gender",
      "address.street",
      "occupation.job_title",
      "bio",
    ];

    let completed = 0;
    requiredFields.forEach((field) => {
      const value = field.split(".").reduce((obj, key) => obj?.[key], profile);
      if (value && value.toString().trim() !== "") {
        completed++;
      }
    });

    const completionPercentage = Math.round(
      (completed / requiredFields.length) * 100
    );
    return completionPercentage >= 80; // 80% trở lên là completed
  }
}

module.exports = new ProfileService();
