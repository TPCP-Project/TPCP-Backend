const mongoose = require("mongoose");
const { Schema } = mongoose;

const profileSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Thông tin cá nhân
    full_name: {
      type: String,
      required: true,
      trim: true,
    },

    phone_number: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // Kiểm tra format số điện thoại Việt Nam
          return !v || /^(\+84|84|0)[1-9][0-9]{8,9}$/.test(v);
        },
        message: "Số điện thoại không hợp lệ",
      },
    },

    date_of_birth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    // Địa chỉ
    address: {
      street: { type: String, trim: true },
      ward: { type: String, trim: true },
      district: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true, default: "Vietnam" },
      postal_code: { type: String, trim: true },
    },

    // Thông tin nghề nghiệp
    occupation: {
      job_title: { type: String, trim: true },
      company: { type: String, trim: true },
      industry: { type: String, trim: true },
      experience_years: { type: Number, min: 0 },
    },

    // Thông tin học vấn
    education: {
      degree: { type: String, trim: true },
      school: { type: String, trim: true },
      graduation_year: { type: Number },
    },

    // Kỹ năng và sở thích
    skills: [
      {
        name: { type: String, trim: true },
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
          default: "beginner",
        },
      },
    ],

    interests: [
      {
        type: String,
        trim: true,
      },
    ],

    // Thông tin xã hội
    social_links: {
      website: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
    },

    // Avatar và hình ảnh
    avatar: {
      url: { type: String, default: "" },
      filename: String,
      mimetype: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },

    cover_image: {
      url: { type: String, default: "" },
      filename: String,
      mimetype: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },

    // Thông tin bổ sung
    bio: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    // Cài đặt riêng tư
    privacy_settings: {
      show_phone: { type: Boolean, default: false },
      show_email: { type: Boolean, default: true },
      show_address: { type: Boolean, default: false },
      show_social_links: { type: Boolean, default: true },
      show_occupation: { type: Boolean, default: true },
    },

    // Trạng thái profile
    is_public: {
      type: Boolean,
      default: true,
      index: true,
    },

    is_completed: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Thống kê
    profile_views: {
      type: Number,
      default: 0,
    },

    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index để tìm kiếm
profileSchema.index({
  full_name: "text",
  bio: "text",
  "occupation.job_title": "text",
  "occupation.company": "text",
});

// Middleware để cập nhật last_updated
profileSchema.pre("save", function (next) {
  this.last_updated = new Date();
  next();
});

// Virtual để tính completion percentage
profileSchema.virtual("completion_percentage").get(function () {
  const fields = [
    "full_name",
    "phone_number",
    "date_of_birth",
    "gender",
    "address.street",
    "occupation.job_title",
    "bio",
  ];

  let completed = 0;
  fields.forEach((field) => {
    const value = field.split(".").reduce((obj, key) => obj?.[key], this);
    if (value && value.toString().trim() !== "") {
      completed++;
    }
  });

  return Math.round((completed / fields.length) * 100);
});

// Đảm bảo virtual fields được include trong JSON
profileSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Profile", profileSchema);
