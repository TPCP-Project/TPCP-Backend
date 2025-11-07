const Customer = require("../models/Customer");

/**
 * Middleware kiểm tra subscription Pro
 * Chỉ cho phép user có subscription active sử dụng các tính năng premium
 */
const requireProSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Tìm customer của user
    const customer = await Customer.findOne({ ownerId: userId });

    if (!customer) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần đăng ký gói Pro để sử dụng tính năng này",
        code: "NO_SUBSCRIPTION",
        action: "upgrade",
      });
    }

    // Kiểm tra subscription status
    if (customer.subscriptionStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "Gói đăng ký của bạn đã hết hạn hoặc bị hủy",
        code: "INACTIVE_SUBSCRIPTION",
        subscriptionStatus: customer.subscriptionStatus,
        action: "renew",
      });
    }

    // Kiểm tra subscription plan
    if (
      customer.subscriptionPlan !== "pro" &&
      customer.subscriptionPlan !== "enterprise"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần nâng cấp lên gói Pro để sử dụng tính năng này",
        code: "INSUFFICIENT_PLAN",
        currentPlan: customer.subscriptionPlan,
        action: "upgrade",
      });
    }

    // Kiểm tra hạn sử dụng
    if (
      customer.subscriptionExpiresAt &&
      customer.subscriptionExpiresAt < new Date()
    ) {
      // Cập nhật status thành expired
      customer.subscriptionStatus = "expired";
      await customer.save();

      return res.status(403).json({
        success: false,
        message: "Gói đăng ký của bạn đã hết hạn",
        code: "EXPIRED_SUBSCRIPTION",
        expiredAt: customer.subscriptionExpiresAt,
        action: "renew",
      });
    }

    // Thêm customer info vào request để sử dụng ở các middleware/controller khác
    req.customer = customer;
    req.customerId = customer._id.toString();

    next();
  } catch (error) {
    console.error("[Subscription Middleware] Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra subscription",
      error: error.message,
    });
  }
};

/**
 * Middleware kiểm tra subscription cơ bản (basic hoặc cao hơn)
 */
const requireBasicSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const customer = await Customer.findOne({ ownerId: userId });

    if (!customer) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần đăng ký để sử dụng tính năng này",
        code: "NO_SUBSCRIPTION",
        action: "subscribe",
      });
    }

    // Kiểm tra subscription status
    if (customer.subscriptionStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "Gói đăng ký của bạn không hoạt động",
        code: "INACTIVE_SUBSCRIPTION",
        subscriptionStatus: customer.subscriptionStatus,
        action: "renew",
      });
    }

    // Kiểm tra hạn sử dụng
    if (
      customer.subscriptionExpiresAt &&
      customer.subscriptionExpiresAt < new Date()
    ) {
      customer.subscriptionStatus = "expired";
      await customer.save();

      return res.status(403).json({
        success: false,
        message: "Gói đăng ký của bạn đã hết hạn",
        code: "EXPIRED_SUBSCRIPTION",
        expiredAt: customer.subscriptionExpiresAt,
        action: "renew",
      });
    }

    req.customer = customer;
    req.customerId = customer._id.toString();

    next();
  } catch (error) {
    console.error("[Subscription Middleware] Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra subscription",
      error: error.message,
    });
  }
};

/**
 * Middleware kiểm tra subscription cho Facebook integration
 * Yêu cầu Pro subscription + Facebook Page đã kết nối
 */
const requireFacebookIntegration = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const customer = await Customer.findOne({ ownerId: userId }).select(
      "+fbPageAccessToken"
    );

    if (!customer) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần đăng ký gói Pro để sử dụng tính năng Facebook",
        code: "NO_SUBSCRIPTION",
        action: "upgrade",
      });
    }

    // Kiểm tra subscription
    if (
      customer.subscriptionStatus !== "active" ||
      (customer.subscriptionPlan !== "pro" &&
        customer.subscriptionPlan !== "enterprise")
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần gói Pro để sử dụng tính năng Facebook",
        code: "INSUFFICIENT_PLAN",
        action: "upgrade",
      });
    }

    // Kiểm tra Facebook Page đã kết nối chưa
    if (!customer.fbPageId || !customer.fbPageAccessToken) {
      return res.status(403).json({
        success: false,
        message: "Bạn cần kết nối Facebook Page trước",
        code: "NO_FACEBOOK_CONNECTION",
        action: "connect_facebook",
      });
    }

    req.customer = customer;
    req.customerId = customer._id.toString();

    next();
  } catch (error) {
    console.error("[Facebook Integration Middleware] Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi kiểm tra Facebook integration",
      error: error.message,
    });
  }
};

/**
 * Middleware optional - không block request nhưng thêm thông tin subscription
 */
const addSubscriptionInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const customer = await Customer.findOne({ ownerId: userId });

    if (customer) {
      req.customer = customer;
      req.customerId = customer._id.toString();
      req.hasActiveSubscription =
        customer.subscriptionStatus === "active" &&
        customer.subscriptionExpiresAt > new Date();
    }

    next();
  } catch (error) {
    console.error("[Add Subscription Info] Error:", error);
    // Không block request, chỉ log error
    next();
  }
};

module.exports = {
  requireProSubscription,
  requireBasicSubscription,
  requireFacebookIntegration,
  addSubscriptionInfo,
};
