const facebookService = require("../services/facebookService");
const advancedRAGService = require("../services/advancedRAGService");
const cryptoService = require("../services/cryptoService");
const Customer = require("../models/Customer");

class WebhookController {
  // Verify webhook (GET from Facebook)
  verify(req, res) {
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  // Handle webhook events (POST from Facebook)
  async handleWebhook(req, res) {
    const body = req.body;
    res.status(200).send("EVENT_RECEIVED");

    if (body.object !== "page") return;
    for (const entry of body.entry || []) {
      const event = entry.messaging && entry.messaging[0];
      if (event) await this.handleMessagingEvent(event);
    }
  }

  async handleMessagingEvent(event) {
    const senderId = event.sender?.id;
    const pageId = event.recipient?.id; // Page ID

    if (!senderId || !pageId) return;

    try {
      if (event.message) {
        await this.handleMessage(senderId, event.message, pageId);
      } else if (event.postback) {
        // Optional: handle postbacks later
      }
    } catch (err) {
      console.error("[Webhook] Error handling event:", err);
    }
  }

  async handleMessage(senderId, message, pageId) {
    if (!message.text) return;
    const userMessage = message.text.trim();

    // Find customer by fbPageId (include token field if schema hides it)
    const customer = await Customer.findOne({ fbPageId: pageId }).select(
      "+fbPageAccessToken"
    );
    if (!customer) return;

    // Use token directly (encryption temporarily disabled)
    const decryptedToken = customer.fbPageAccessToken;

    // Typing indicators
    await facebookService.markSeen(decryptedToken, senderId);
    await facebookService.sendTypingIndicator(decryptedToken, senderId, true);

    const chatHistory = [];
    const response = await advancedRAGService.generateIntelligentResponse(
      customer._id.toString(),
      userMessage,
      chatHistory,
      { maxWords: 100 }
    );

    await facebookService.sendTypingIndicator(decryptedToken, senderId, false);
    await facebookService.sendTextMessage(decryptedToken, senderId, response);
  }
}

module.exports = new WebhookController();
