class ChatbotController {
  async askAdvanced(req, res) {
    try {
      const customerId = req.user?.id || req.body.customerId;
      const { question, chatHistory } = req.body;

      if (!customerId || !question) {
        return res.status(400).json({
          success: false,
          message: "customerId and question are required",
        });
      }

      const trimmedQuestion = question.trim();
      const validatedHistory = Array.isArray(chatHistory) ? chatHistory : [];

      console.log(`[Advanced Chatbot] Question: "${trimmedQuestion}"`);

      const advancedRAGService = require("../services/advancedRAGService");
      const startTime = Date.now();
      const response = await advancedRAGService.generateIntelligentResponse(
        customerId,
        trimmedQuestion,
        validatedHistory
      );
      const duration = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          question: trimmedQuestion,
          answer: response,
          responseTime: duration,
          engine: "advanced-rag",
        },
      });
    } catch (error) {
      console.error("[Advanced Chatbot] Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/chatbot/test-retrieval

  async testRetrieval(req, res) {
    try {
      const customerId = req.user?.id || req.body.customerId;
      const { question, topK = 5 } = req.body;

      if (!customerId || !question) {
        return res.status(400).json({
          success: false,
          message: "customerId and question are required",
        });
      }

      const advancedRAGService = require("../services/advancedRAGService");
      // Use rewrite + hybrid search for retrieval-only testing
      const queries = await advancedRAGService.rewriteQuery(question);
      const chunks = await advancedRAGService.hybridSearch(
        customerId,
        queries,
        topK
      );

      res.status(200).json({
        success: true,
        data: {
          question,
          retrievedChunks: chunks.map((c) => ({
            productName: c.metadata.productName,
            category: c.metadata.category,
            score: c.finalScore,
            text: c.chunkText,
            url: c.metadata.directUrl,
          })),
          count: chunks.length,
        },
      });
    } catch (error) {
      console.error("[Chatbot API] Test retrieval error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /api/chatbot/health

  async health(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: "Chatbot service is running",
        timestamp: new Date().toISOString(),
        geminiApiKey: process.env.GEMINI_API_KEY ? "configured" : "missing",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new ChatbotController();
