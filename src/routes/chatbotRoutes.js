const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");
const { authenticateToken } = require("../middlewares/auth");
const { requireProSubscription } = require("../middlewares/subscription");

// Health check - Public
router.get("/health", chatbotController.health);

// Ask chatbot with ADVANCED RAG - Yêu cầu Pro subscription
router.post(
  "/ask-advanced",

  chatbotController.askAdvanced
);

// Test RAG retrieval (debug endpoint) - Yêu cầu Pro subscription
router.post(
  "/test-retrieval",
  authenticateToken,
  requireProSubscription,
  chatbotController.testRetrieval
);

module.exports = router;
