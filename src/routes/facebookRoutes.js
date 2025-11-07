const express = require("express");
const router = express.Router();
const manualController = require("../controllers/facebookManualConnectController");
const webhookController = require("../controllers/webhookController");
const { authenticateToken } = require("../middlewares/auth");
const { requireFacebookIntegration } = require("../middlewares/subscription");

// Manual connect: save pageId + encrypted pageAccessToken - Yêu cầu Pro subscription
router.post(
  "/facebook/manual-connect",
  authenticateToken,
  requireFacebookIntegration,
  manualController.manualConnect
);

// Webhook verification (GET) and receiver (POST) - Public routes
router.get("/webhook", (req, res) => webhookController.verify(req, res));
router.post("/webhook", express.json({ type: "*/*" }), (req, res) =>
  webhookController.handleWebhook(req, res)
);

// Subscribe app to page (helper) - Yêu cầu Pro subscription
router.post(
  "/facebook/subscribe",
  authenticateToken,
  requireFacebookIntegration,
  (req, res) => manualController.subscribe(req, res)
);

module.exports = router;
