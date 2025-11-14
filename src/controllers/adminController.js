const User = require("../models/user");
const Purchase = require("../models/purchase");
const SubscriptionPackage = require("../models/subscriptionPackage");
const AdminNotification = require("../models/adminNotification");
const nodemailer = require("nodemailer");

// Middleware để check admin role
exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Chỉ admin mới có quyền truy cập",
    });
  }
  next();
};

//USER MANAGEMENT

// Lấy danh sách tất cả users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, accountStatus, search } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (accountStatus) filter.accountStatus = accountStatus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách users",
      error: error.message,
    });
  }
};

// Lấy chi tiết user
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    // Lấy thông tin purchases của user
    const purchases = await Purchase.find({ userId })
      .populate("packageId", "name price duration")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        user,
        purchases,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin user",
      error: error.message,
    });
  }
};

// Cập nhật role user
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["admin", "manager", "employee"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role không hợp lệ",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, select: "-passwordHash" }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật role thành công",
      data: { user },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật role",
      error: error.message,
    });
  }
};

// Ban/Unban user
exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ban, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    user.isBanned = ban;
    user.accountStatus = ban ? "banned" : "active";

    if (ban) {
      user.banReason = reason || "Vi phạm chính sách";
      user.bannedBy = req.user._id;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: ban ? "Đã ban user" : "Đã unban user",
      data: { user },
    });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi ban/unban user",
      error: error.message,
    });
  }
};

// Gửi email cảnh báo cho user
exports.sendWarningEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { subject, message } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return res.status(501).json({
        success: false,
        message:
          "Email service chưa được cấu hình. Vui lòng cấu hình EMAIL_USER và EMAIL_PASSWORD trong .env",
      });
    }

    // Configure email transporter (same pattern as projectEmail.js)
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: `"LPCP Admin" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: subject || "⚠️ Cảnh báo từ hệ thống",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EF4444;">⚠️ Cảnh báo từ hệ thống</h2>
            <p>Xin chào <strong>${user.name}</strong>,</p>
            <p>${message}</p>
            <br>
            <p>Trân trọng,</p>
            <p><strong>Đội ngũ quản trị LPCP</strong></p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
        success: true,
        message: "Đã gửi email cảnh báo thành công",
      });
    } catch (emailError) {
      console.error("Nodemailer error:", emailError);
      res.status(500).json({
        success: false,
        message: "Lỗi khi gửi email. Vui lòng kiểm tra cấu hình email.",
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error("Send warning email error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi gửi email",
      error: error.message,
    });
  }
};

//PACKAGE MANAGEMENT

// 📦 Tạo gói subscription
exports.createPackage = async (req, res) => {
  try {
    const packageData = req.body;
    packageData.createdBy = req.user._id;

    const newPackage = new SubscriptionPackage(packageData);
    await newPackage.save();

    res.status(201).json({
      success: true,
      message: "Tạo gói subscription thành công",
      data: { package: newPackage },
    });
  } catch (error) {
    console.error("Create package error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo gói",
      error: error.message,
    });
  }
};

// 📦 Lấy danh sách packages
exports.getAllPackages = async (req, res) => {
  try {
    const { isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const packages = await SubscriptionPackage.find(filter).sort({ price: 1 });

    res.status(200).json({
      success: true,
      data: { packages },
    });
  } catch (error) {
    console.error("Get all packages error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách gói",
      error: error.message,
    });
  }
};

// 🔧 Cập nhật package
exports.updatePackage = async (req, res) => {
  try {
    const { packageId } = req.params;
    const updates = req.body;

    const package = await SubscriptionPackage.findByIdAndUpdate(
      packageId,
      updates,
      { new: true, runValidators: true }
    );

    if (!package) {
      return res.status(404).json({
        success: false,
        message: "Package không tồn tại",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật package thành công",
      data: { package },
    });
  } catch (error) {
    console.error("Update package error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật package",
      error: error.message,
    });
  }
};

// ❌ Xóa package
exports.deletePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    const package = await SubscriptionPackage.findByIdAndDelete(packageId);

    if (!package) {
      return res.status(404).json({
        success: false,
        message: "Package không tồn tại",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa package thành công",
    });
  } catch (error) {
    console.error("Delete package error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa package",
      error: error.message,
    });
  }
};

// =================== PURCHASE MANAGEMENT ===================

// 💰 Lấy danh sách purchases
exports.getAllPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const Customer = require("../models/Customer");

    const filter = {};
    if (status) {
      // Map purchase status to subscription status
      filter.subscriptionStatus = status === "completed" ? "active" : status;
    }
    if (userId) filter.ownerId = userId;

    // Query Customer collection instead of Purchase
    const customers = await Customer.find(filter)
      .populate("ownerId", "name email username")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Customer.countDocuments(filter);

    // Transform Customer data to match Purchase format expected by frontend
    const purchases = customers.map((customer) => ({
      _id: customer._id,
      userId: customer.ownerId,
      packageId: {
        name: customer.subscriptionPlan,
        price: customer.paymentInfo?.amount || 0,
        duration: { value: 30, unit: "days" },
      },
      amount: customer.paymentInfo?.amount || 0,
      status:
        customer.subscriptionStatus === "active"
          ? "completed"
          : customer.subscriptionStatus,
      paymentMethod: customer.paymentInfo?.paymentMethod || "vnpay",
      transactionId:
        customer.paymentInfo?.transactionNo || customer.paymentInfo?.orderId,
      startDate: customer.createdAt,
      endDate: customer.subscriptionExpiresAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        purchases,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all purchases error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách purchases",
      error: error.message,
    });
  }
};

// 🔧 Cập nhật trạng thái purchase
exports.updatePurchaseStatus = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { status, notes } = req.body;
    const Customer = require("../models/Customer");

    // Find customer by ID (purchaseId is actually customerId)
    const customer = await Customer.findById(purchaseId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Purchase không tồn tại",
      });
    }

    // Map purchase status to subscription status
    if (status === "completed") {
      customer.subscriptionStatus = "active";
    } else if (status === "pending") {
      customer.subscriptionStatus = "pending";
    } else if (status === "failed") {
      customer.subscriptionStatus = "cancelled";
    } else if (status === "refunded") {
      customer.subscriptionStatus = "cancelled";
    } else {
      customer.subscriptionStatus = status;
    }

    // Note: Customer schema doesn't have notes field, but we can save it anyway
    if (notes && !customer.notes) {
      customer.notes = notes;
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật purchase thành công",
      data: {
        purchase: {
          _id: customer._id,
          status:
            customer.subscriptionStatus === "active"
              ? "completed"
              : customer.subscriptionStatus,
          notes: notes || customer.notes,
        },
      },
    });
  } catch (error) {
    console.error("Update purchase status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật purchase",
      error: error.message,
    });
  }
};

// =================== NOTIFICATIONS ===================

// 🔔 Lấy thông báo admin
exports.getAdminNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;

    const filter = {};
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const notifications = await AdminNotification.find(filter)
      .populate("relatedUser", "name email")
      .populate("relatedPurchase")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AdminNotification.countDocuments(filter);
    const unreadCount = await AdminNotification.countDocuments({
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông báo",
      error: error.message,
    });
  }
};

// ✅ Đánh dấu đã đọc thông báo
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await AdminNotification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
        readBy: req.user._id,
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification không tồn tại",
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu đã đọc",
      data: { notification },
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật notification",
      error: error.message,
    });
  }
};

// 📊 Dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const Customer = require("../models/Customer");

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ accountStatus: "active" });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Query Customer collection instead of Purchase
    const totalPurchases = await Customer.countDocuments();
    const pendingPurchases = await Customer.countDocuments({
      subscriptionStatus: "pending",
    });
    const completedPurchases = await Customer.countDocuments({
      subscriptionStatus: "active",
    });

    const totalRevenue = await Customer.aggregate([
      {
        $match: {
          subscriptionStatus: "active",
          "paymentInfo.amount": { $exists: true },
        },
      },
      { $group: { _id: null, total: { $sum: "$paymentInfo.amount" } } },
    ]);

    const activeSubscriptions = await Customer.countDocuments({
      subscriptionStatus: "active",
      subscriptionExpiresAt: { $gte: new Date() },
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
        },
        purchases: {
          total: totalPurchases,
          pending: pendingPurchases,
          completed: completedPurchases,
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
        },
        subscriptions: {
          active: activeSubscriptions,
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê",
      error: error.message,
    });
  }
};
