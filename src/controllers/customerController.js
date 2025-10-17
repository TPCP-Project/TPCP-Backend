const Customer = require("../models/Customer");

class CustomerController {
  /**
   * Create a new customer
   * POST /api/customers
   */
  async create(req, res) {
    try {
      const {
        ownerId,
        email,
        businessName,
        subscriptionPlan,
        subscriptionStatus,
        fbPageId,
        fbPageAccessToken,
        chatbotSettings,
      } = req.body;

      if (!ownerId || !email) {
        return res.status(400).json({
          success: false,
          message: "ownerId and email are required",
        });
      }

      const existing = await Customer.findOne({ email });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Customer with this email already exists",
        });
      }

      const customer = await Customer.create({
        ownerId,
        email,
        businessName,
        subscriptionPlan,
        subscriptionStatus,
        fbPageId,
        fbPageAccessToken,
        chatbotSettings,
      });

      return res.status(201).json({ success: true, data: customer });
    } catch (error) {
      console.error("[Customer] Create error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new CustomerController();
