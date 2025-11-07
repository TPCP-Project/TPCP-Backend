const Customer = require("../models/Customer");
const cryptoService = require("../services/cryptoService");

class FacebookManualConnectController {
  /**
   * Manually connect a Facebook Page by saving pageId and encrypted pageAccessToken
   * POST /api/facebook/manual-connect
   */
  async manualConnect(req, res) {
    try {
      const { customerId, fbPageId, fbPageAccessToken } = req.body;

      if (!customerId || !fbPageId || !fbPageAccessToken) {
        return res.status(400).json({
          success: false,
          message: "customerId, fbPageId and fbPageAccessToken are required",
        });
      }

      const updated = await Customer.findByIdAndUpdate(
        customerId,
        {
          fbPageId,
          // Store plaintext token temporarily (encryption disabled per request)
          fbPageAccessToken: fbPageAccessToken,
          "chatbotSettings.connected": true,
        },
        { new: true }
      ).select("email businessName fbPageId chatbotSettings");

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }

      return res.json({ success: true, data: updated });
    } catch (error) {
      console.error("[Facebook Manual Connect] Error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Subscribe app to a page's webhook events (messages, postbacks)
   * POST /api/facebook/subscribe
   */
  async subscribe(req, res) {
    try {
      const { fbPageId, fbPageAccessToken } = req.body;
      if (!fbPageId || !fbPageAccessToken) {
        return res.status(400).json({
          success: false,
          message: "fbPageId and fbPageAccessToken are required",
        });
      }

      const axios = require("axios");
      const url = `https://graph.facebook.com/v19.0/${fbPageId}/subscribed_apps`;
      const params = {
        access_token: fbPageAccessToken,
        subscribed_fields: "messages,messaging_postbacks",
      };

      const response = await axios.post(url, null, { params });

      return res.json({ success: true, data: response.data });
    } catch (error) {
      const msg = error.response?.data || error.message;
      console.error("[Facebook Subscribe] Error:", msg);
      return res.status(500).json({ success: false, message: msg });
    }
  }
}

module.exports = new FacebookManualConnectController();
