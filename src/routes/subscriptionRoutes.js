const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { authenticateToken } = require("../middlewares/auth");

/* Tạo URL thanh toán cho gói Pro */
router.post(
  "/create-payment",
  authenticateToken,
  subscriptionController.createPayment
);

/* Xử lý kết quả thanh toán từ VNPay (public route) */
router.get("/payment-return", subscriptionController.handlePaymentReturn);

/* Kiểm tra trạng thái subscription */
router.get(
  "/status",
  authenticateToken,
  subscriptionController.getSubscriptionStatus
);

/* Gia hạn subscription */
router.post(
  "/renew",
  authenticateToken,
  subscriptionController.renewSubscription
);

/* Hủy subscription */
router.post(
  "/cancel",
  authenticateToken,
  subscriptionController.cancelSubscription
);

/* Lấy lịch sử thanh toán */
router.get(
  "/payment-history",
  authenticateToken,
  subscriptionController.getPaymentHistory
);

/* Mock payment success - CHỈ DÙNG TRONG DEVELOPMENT */
router.get("/mock-payment-success", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const User = require("../models/user");
    const Customer = require("../models/Customer");

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/payment/failed?error=User not found`
      );
    }

    let customer = await Customer.findOne({ ownerId: userId });

    const mockPaymentInfo = {
      orderId: `MOCK_${Date.now()}`,
      transactionNo: `MOCK_TXN_${Date.now()}`,
      amount: 1500000,
      payDate: new Date().toISOString(),
      paymentMethod: "mock_vnpay",
    };

    if (!customer) {
      customer = new Customer({
        email: user.email,
        businessName: user.name || `Business ${userId}`,
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        ownerId: userId,
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentInfo: mockPaymentInfo,
      });
    } else {
      customer.subscriptionPlan = "pro";
      customer.subscriptionStatus = "active";
      customer.subscriptionExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      customer.paymentInfo = mockPaymentInfo;
    }

    await customer.save();
    console.log(`[Mock Payment] ✅ Activated Pro for user: ${userId}`);

    return res.redirect(
      `${process.env.CLIENT_URL}/payment/success?customerId=${customer._id}`
    );
  } catch (error) {
    console.error("[Mock Payment] Error:", error);
    return res.redirect(
      `${process.env.CLIENT_URL}/payment/failed?error=${encodeURIComponent(
        error.message
      )}`
    );
  }
});

module.exports = router;
