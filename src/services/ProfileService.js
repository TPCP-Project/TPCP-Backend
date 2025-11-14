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
        .populate("user_id", "name username email avatar accountStatus");

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
          .populate("user_id", "name username email avatar accountStatus");
      }

      // Convert to plain object
      return profile.toObject({ virtuals: true });
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
        .populate("user_id", "name username email avatar accountStatus");

      if (!profile) {
        throw new Error("Profile không tồn tại hoặc không public");
      }

      // Tăng số lượt xem
      await Profile.findByIdAndUpdate(profile._id, {
        $inc: { profile_views: 1 },
      });

      // Convert to plain object
      const profileObj = profile.toObject({ virtuals: true });

      // Lọc thông tin theo cài đặt riêng tư
      const filteredProfile = this.filterProfileByPrivacy(profileObj);

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

      // Tìm profile hiện tại
      let profile = await Profile.findOne({ user_id: userId });

      // Nếu chưa có profile, tạo mới
      if (!profile) {
        profile = await Profile.create({
          user_id: userId,
          full_name: user.name || user.username,
          ...updateData
        });
      } else {
        // Chuẩn bị update object với $set và $unset
        const updateObject = { $set: {} };
        const unsetFields = {};

        Object.keys(updateData).forEach((key) => {
          if (updateData[key] !== undefined) {
            // Xử lý nested objects (address, occupation, education, etc.)
            if (typeof updateData[key] === 'object' && !Array.isArray(updateData[key]) && updateData[key] !== null) {
              // Merge với object hiện tại
              const currentValue = profile[key]?.toObject?.() || profile[key] || {};
              const mergedValue = { ...currentValue, ...updateData[key] };
              Object.keys(mergedValue).forEach((nestedKey) => {
                if (mergedValue[nestedKey] === '' || mergedValue[nestedKey] === null) {
                  unsetFields[`${key}.${nestedKey}`] = '';
                } else {
                  updateObject.$set[`${key}.${nestedKey}`] = mergedValue[nestedKey];
                }
              });
            } else {
              // Nếu giá trị là empty string, unset field thay vì set
              if (updateData[key] === '' || updateData[key] === null) {
                unsetFields[key] = '';
              } else {
                updateObject.$set[key] = updateData[key];
              }
            }
          }
        });

        // Cập nhật last_updated
        updateObject.$set.last_updated = new Date();

        // Thêm $unset nếu có fields cần xóa
        if (Object.keys(unsetFields).length > 0) {
          updateObject.$unset = unsetFields;
        }

        // Sử dụng findOneAndUpdate để tránh conflict với text index
        profile = await Profile.findOneAndUpdate(
          { user_id: userId },
          updateObject,
          { new: true, runValidators: true }
        );
      }

      // Kiểm tra completion
      const isCompleted = this.checkProfileCompletion(profile);
      if (profile.is_completed !== isCompleted) {
        profile = await Profile.findByIdAndUpdate(
          profile._id,
          { is_completed: isCompleted },
          { new: true }
        );
      }

      // Populate và trả về
      const updatedProfile = await Profile.findById(profile._id)
        .populate("user_id", "name username email avatar accountStatus");

      return updatedProfile.toObject({ virtuals: true });
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
        .limit(limit);

      // Convert to plain objects và lọc theo privacy settings
      const filteredProfiles = profiles.map((profile) =>
        this.filterProfileByPrivacy(profile.toObject({ virtuals: true }))
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
