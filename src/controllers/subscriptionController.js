const paymentService = require("../services/paymentService");
const Customer = require("../models/Customer");
const User = require("../models/user");

// Temporary storage for order mapping (should use Redis in production)
const orderMapping = new Map();

class SubscriptionController {
  /**
   * Tạo URL thanh toán cho gói Pro
   */
  async createPayment(req, res) {
    try {
      const userId = req.user.id;
      const { customerInfo = {}, returnUrl } = req.body;

      // Kiểm tra user đã có customer chưa
      const existingCustomer = await Customer.findOne({ ownerId: userId });
      if (
        existingCustomer &&
        existingCustomer.subscriptionStatus === "active"
      ) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã có tài khoản Pro đang hoạt động!",
          customerId: existingCustomer._id,
        });
      }

      // Tạo mã giao dịch
      const orderId = paymentService.generateOrderId();

      // 🔥 LƯU MAPPING orderId → userId
      orderMapping.set(orderId, userId);

      // Tạo URL thanh toán - LUÔN dùng backend return URL
      const paymentResult = await paymentService.createPaymentUrl({
        amount: 1500000,
        orderId,
        orderDescription: `Đăng ký gói Pro AI Chatbot - User ${userId}`,
        customerInfo: {
          ...customerInfo,
          // Fix IPv6 localhost issue
          ipAddr:
            req.ip === "::1"
              ? "127.0.0.1"
              : req.ip || req.connection.remoteAddress,
        },
        // QUAN TRỌNG: returnUrl phải là backend URL, không phải frontend
        returnUrl:
          process.env.VNPAY_RETURN_URL ||
          "http://localhost:4000/api/subscription/payment-return",
      });

      res.status(200).json({
        success: true,
        data: {
          paymentUrl: paymentResult.paymentUrl,
          orderId: paymentResult.txnRef,
          amount: paymentResult.amount,
          message: "Vui lòng thanh toán để kích hoạt tài khoản Pro",
        },
      });
    } catch (error) {
      console.error("[Subscription] Create payment error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Xử lý kết quả thanh toán từ VNPay
   */
  async handlePaymentReturn(req, res) {
    try {
      console.log("[Subscription] Payment return:", req.query);

      const verifyResult = await paymentService.verifyPayment(req.query);

      if (!verifyResult.success) {
        return res.redirect(
          `${process.env.CLIENT_URL}/payment/failed?error=${encodeURIComponent(
            verifyResult.message
          )}`
        );
      }

      const orderId = verifyResult.txnRef;
      const userId = this.getUserIdFromOrderId(orderId);

      if (!userId) {
        return res.redirect(
          `${process.env.CLIENT_URL}/payment/failed?error=Không tìm thấy thông tin đơn hàng`
        );
      }

      // Lấy thông tin user
      const user = await User.findById(userId);
      if (!user) {
        return res.redirect(
          `${process.env.CLIENT_URL}/payment/failed?error=Không tìm thấy user`
        );
      }

      // Kiểm tra đã tạo customer chưa
      let customer = await Customer.findOne({ ownerId: userId });

      if (!customer) {
        // Tạo customer mới
        customer = new Customer({
          email: user.email,
          businessName: user.name || `Business ${userId}`,
          subscriptionPlan: "pro",
          subscriptionStatus: "active",
          ownerId: userId,
          subscriptionExpiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ), // 30 ngày
          paymentInfo: {
            orderId,
            transactionNo: verifyResult.transactionNo,
            amount: verifyResult.amount,
            payDate: verifyResult.payDate,
            paymentMethod: "vnpay",
          },
        });

        await customer.save();
        console.log(`[Subscription] Created new customer: ${customer._id}`);
      } else {
        // Cập nhật subscription
        customer.subscriptionPlan = "pro";
        customer.subscriptionStatus = "active";
        customer.subscriptionExpiresAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        );
        customer.paymentInfo = {
          orderId,
          transactionNo: verifyResult.transactionNo,
          amount: verifyResult.amount,
          payDate: verifyResult.payDate,
          paymentMethod: "vnpay",
        };

        await customer.save();
        console.log(`[Subscription] Updated customer: ${customer._id}`);
      }

      // Xóa mapping sau khi xử lý xong
      orderMapping.delete(orderId);

      return res.redirect(
        `${process.env.CLIENT_URL}/payment/success?customerId=${customer._id}`
      );
    } catch (error) {
      console.error("[Subscription] Payment return error:", error);
      return res.redirect(
        `${process.env.CLIENT_URL}/payment/failed?error=${encodeURIComponent(
          error.message
        )}`
      );
    }
  }

  /**
   * Kiểm tra trạng thái subscription
   */
  async getSubscriptionStatus(req, res) {
    try {
      const userId = req.user.id;
      const customer = await Customer.findOne({ ownerId: userId });

      if (!customer) {
        return res.status(200).json({
          success: true,
          data: {
            hasSubscription: false,
            subscriptionPlan: null,
            subscriptionStatus: null,
            message: "Chưa có gói đăng ký",
          },
        });
      }

      const now = new Date();
      const isExpired =
        customer.subscriptionExpiresAt && customer.subscriptionExpiresAt < now;

      if (isExpired && customer.subscriptionStatus === "active") {
        customer.subscriptionStatus = "expired";
        await customer.save();
      }

      res.status(200).json({
        success: true,
        data: {
          hasSubscription: true,
          customerId: customer._id,
          subscriptionPlan: customer.subscriptionPlan,
          subscriptionStatus: customer.subscriptionStatus,
          subscriptionExpiresAt: customer.subscriptionExpiresAt,
          businessName: customer.businessName,
          isActive: customer.subscriptionStatus === "active",
          daysRemaining: customer.subscriptionExpiresAt
            ? Math.ceil(
                (customer.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24)
              )
            : 0,
        },
      });
    } catch (error) {
      console.error("[Subscription] Status error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Gia hạn subscription
   */
  async renewSubscription(req, res) {
    try {
      const userId = req.user.id;
      const customer = await Customer.findOne({ ownerId: userId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản",
        });
      }

      const orderId = paymentService.generateOrderId();

      // Lưu mapping cho renew
      orderMapping.set(orderId, userId);

      const paymentResult = await paymentService.createPaymentUrl({
        amount: 1500000,
        orderId,
        orderDescription: `Gia hạn gói Pro AI Chatbot - Customer ${customer._id}`,
        customerInfo: {
          ipAddr: req.ip || req.connection.remoteAddress,
        },
        returnUrl: `${process.env.CLIENT_URL}/payment/success`,
      });

      res.status(200).json({
        success: true,
        data: {
          paymentUrl: paymentResult.paymentUrl,
          orderId: paymentResult.txnRef,
          amount: paymentResult.amount,
          message: "Vui lòng thanh toán để gia hạn tài khoản",
        },
      });
    } catch (error) {
      console.error("[Subscription] Renew error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Hủy subscription
   */
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const customer = await Customer.findOne({ ownerId: userId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản",
        });
      }

      customer.subscriptionStatus = "cancelled";
      await customer.save();

      res.status(200).json({
        success: true,
        message: "Đã hủy gói đăng ký thành công",
      });
    } catch (error) {
      console.error("[Subscription] Cancel error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Lấy thông tin thanh toán
   */
  async getPaymentHistory(req, res) {
    try {
      const userId = req.user.id;
      const customer = await Customer.findOne({ ownerId: userId });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy tài khoản",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          customerId: customer._id,
          subscriptionPlan: customer.subscriptionPlan,
          subscriptionStatus: customer.subscriptionStatus,
          subscriptionExpiresAt: customer.subscriptionExpiresAt,
          paymentInfo: customer.paymentInfo,
          createdAt: customer.createdAt,
        },
      });
    } catch (error) {
      console.error("[Subscription] Payment history error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Helper: Lấy userId từ orderId
   */
  getUserIdFromOrderId(orderId) {
    return orderMapping.get(orderId) || null;
  }
}

module.exports = new SubscriptionController();
