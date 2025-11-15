const embeddingService = require("./embeddingService");
const ProductChunk = require("../models/ProductChunk");
const Product = require("../models/Product");
const { GoogleGenerativeAI } = require("@google/generative-ai");

class AdvancedRAGService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  /**
   * Ingest products: save products, chunk, embed, and store chunks
   */
  async ingestCustomerData(customerId, products) {
    try {
      console.log(
        `[Advanced RAG] Ingestion for customer ${customerId}: ${products.length} products`
      );

      if (!customerId) throw new Error("customerId is required");

      const productsToSave = products.map((p) => ({ ...p, customerId }));
      const savedProducts = await Product.insertMany(productsToSave);

      const allChunks = [];
      for (const product of savedProducts) {
        const chunks = this.chunkProduct(product);
        chunks.forEach((chunkText, index) => {
          allChunks.push({
            customerId,
            productId: product._id,
            chunkText,
            metadata: {
              chunkIndex: index,
              productName: product.name,
              category: product.category,
              targetAudience: product.targetAudience,
              toneOfVoice: product.toneOfVoice,
              status: product.status,
              directUrl: product.directUrl,
            },
          });
        });
      }

      console.log(`[Advanced RAG] Generated ${allChunks.length} chunks`);

      const chunkTexts = allChunks.map((c) => c.chunkText);
      const embeddings = await embeddingService.generateEmbeddings(chunkTexts);

      const chunksWithEmbeddings = allChunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i],
      }));

      await ProductChunk.insertMany(chunksWithEmbeddings);
      console.log(
        `[Advanced RAG] Saved ${chunksWithEmbeddings.length} chunks with embeddings`
      );

      return {
        success: true,
        productsCount: savedProducts.length,
        chunksCount: chunksWithEmbeddings.length,
        message: "Advanced RAG ingestion completed",
      };
    } catch (error) {
      console.error("[Advanced RAG] Ingestion error:", error);
      throw new Error(`Advanced RAG ingestion failed: ${error.message}`);
    }
  }

  /**
   * Delete all data for a customer
   */
  async deleteCustomerData(customerId) {
    try {
      const chunksDeleted = await ProductChunk.deleteMany({ customerId });
      const productsDeleted = await Product.deleteMany({ customerId });

      console.log(
        `[Advanced RAG] Deleted ${productsDeleted.deletedCount} products and ${chunksDeleted.deletedCount} chunks for customer ${customerId}`
      );

      return {
        success: true,
        productsDeleted: productsDeleted.deletedCount,
        chunksDeleted: chunksDeleted.deletedCount,
      };
    } catch (error) {
      console.error("[Advanced RAG] Delete error:", error);
      throw new Error(`Advanced RAG delete failed: ${error.message}`);
    }
  }

  /**
   * Chunk product into textual segments for embedding
   */
  chunkProduct(product) {
    const chunks = [];

    let basicInfo = `Sản phẩm: ${product.name}`;
    if (product.description) basicInfo += `\nMô tả: ${product.description}`;
    if (product.price)
      basicInfo += `\nGiá: ${product.price.toLocaleString("vi-VN")} VNĐ`;
    if (product.category) basicInfo += `\nDanh mục: ${product.category}`;
    chunks.push(basicInfo);

    if (product.targetAudience || product.toneOfVoice) {
      let marketingInfo = `Thông tin marketing cho ${product.name}:`;
      if (product.targetAudience)
        marketingInfo += `\nĐối tượng khách hàng: ${product.targetAudience}`;
      if (product.toneOfVoice)
        marketingInfo += `\nTone of voice: ${product.toneOfVoice}`;
      chunks.push(marketingInfo);
    }

    if (product.attributes && Object.keys(product.attributes).length > 0) {
      const attrs = Object.entries(product.attributes)
        .map(([key, val]) => `${key}: ${val}`)
        .join("\n");
      chunks.push(`Thông số kỹ thuật ${product.name}:\n${attrs}`);
    }

    if (product.directUrl) {
      chunks.push(`Link sản phẩm ${product.name}: ${product.directUrl}`);
    }

    return chunks;
  }

  /**
   * TECHNIQUE 1: Query Rewriting
   * Rewrite user query to be more specific before retrieval
   */
  async rewriteQuery(originalQuery) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const prompt = `Bạn là chuyên gia phân tích câu hỏi khách hàng về trang sức.

CÂU HỎI GỐC: "${originalQuery}"

Hãy viết lại câu hỏi này thành 2-3 query tìm kiếm tốt hơn để tìm sản phẩm phù hợp.
Chỉ trả về các query, mỗi query 1 dòng, KHÔNG giải thích.

VÍ DỤ:
Input: "Có dây chuyền nào đẹp không?"
Output:
dây chuyền nữ thanh lịch
dây chuyền thời trang
phụ kiện dây chuyền dễ phối

BÂY GIỜ VIẾT LẠI:`;

      const result = await model.generateContent(prompt);
      const rewrittenQueries = result.response
        .text()
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      console.log("[Advanced RAG] Rewritten queries:", rewrittenQueries);

      return [originalQuery, ...rewrittenQueries]; // Include original + rewrites
    } catch (error) {
      console.error("[Advanced RAG] Query rewriting failed:", error);
      return [originalQuery]; // Fallback to original
    }
  }

  /**
   * TECHNIQUE 2: Hybrid Search
   * Combine semantic search (embeddings) + keyword search (metadata)
   */
  async hybridSearch(customerId, queries, topK = 10) {
    try {
      console.log("[Advanced RAG] Starting hybrid search...");

      // 1. Semantic search for each query
      const allResults = [];

      for (const query of queries) {
        // Generate embedding
        const [queryEmbedding] = await embeddingService.generateEmbeddings([
          query,
        ]);

        // Get all chunks for customer
        const chunks = await ProductChunk.find({ customerId }).lean();

        // Score by semantic similarity
        const scored = chunks.map((chunk) => ({
          ...chunk,
          semanticScore: embeddingService.cosineSimilarity(
            queryEmbedding,
            chunk.embedding
          ),
          keywordScore: this.calculateKeywordScore(query, chunk),
        }));

        allResults.push(...scored);
      }

      // 2. Deduplicate and combine scores
      const uniqueChunks = this.deduplicateAndScore(allResults);

      // 3. Re-rank by combined score
      const reranked = uniqueChunks
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, topK);

      console.log(
        "[Advanced RAG] Top results:",
        reranked.map((r) => ({
          product: r.metadata.productName,
          score: r.finalScore.toFixed(3),
        }))
      );

      return reranked;
    } catch (error) {
      console.error("[Advanced RAG] Hybrid search failed:", error);
      throw error;
    }
  }

  /**
   * Calculate keyword matching score
   */
  calculateKeywordScore(query, chunk) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const chunkText = (
      chunk.chunkText +
      " " +
      chunk.metadata.productName +
      " " +
      chunk.metadata.category +
      " " +
      (chunk.metadata.targetAudience || "")
    ).toLowerCase();

    let matchCount = 0;
    for (const word of queryWords) {
      if (word.length > 2 && chunkText.includes(word)) {
        matchCount++;
      }
    }

    return matchCount / queryWords.length; // Normalized score
  }

  /**
   * Deduplicate chunks and combine scores
   */
  deduplicateAndScore(chunks) {
    const chunkMap = new Map();

    for (const chunk of chunks) {
      const key = chunk._id.toString();

      if (chunkMap.has(key)) {
        const existing = chunkMap.get(key);
        // Average the scores if seen multiple times
        existing.semanticScore =
          (existing.semanticScore + chunk.semanticScore) / 2;
        existing.keywordScore =
          (existing.keywordScore + chunk.keywordScore) / 2;
      } else {
        chunkMap.set(key, chunk);
      }
    }

    // Calculate final score (weighted combination)
    return Array.from(chunkMap.values()).map((chunk) => ({
      ...chunk,
      finalScore: chunk.semanticScore * 0.7 + chunk.keywordScore * 0.3,
    }));
  }

  /**
   * TECHNIQUE 3: Context Enhancement
   * Add related product information to context
   */
  async enhanceContext(chunks, customerId) {
    try {
      // Get full product details for top chunks
      const productIds = [
        ...new Set(chunks.map((c) => c.productId.toString())),
      ];

      const products = await Product.find({
        _id: { $in: productIds },
        customerId,
      }).lean();

      // Create enriched context
      const enrichedChunks = chunks.map((chunk) => {
        const product = products.find(
          (p) => p._id.toString() === chunk.productId.toString()
        );

        return {
          ...chunk,
          fullProduct: product,
          enhancedText: this.buildEnhancedText(chunk, product),
        };
      });

      return enrichedChunks;
    } catch (error) {
      console.error("[Advanced RAG] Context enhancement failed:", error);
      return chunks; // Fallback to original chunks
    }
  }

  /**
   * Build enhanced text with full product context
   */
  buildEnhancedText(chunk, product) {
    if (!product) return chunk.chunkText;

    let text = chunk.chunkText + "\n\n";

    // Add contextual information
    text += `THÔNG TIN BỔ SUNG:\n`;
    if (typeof product.price === "number") {
      text += `- Giá: ${product.price.toLocaleString("vi-VN")} VNĐ\n`;
    }
    if (product.category) {
      text += `- Danh mục: ${product.category}\n`;
    }
    if (product.targetAudience) {
      text += `- Đối tượng: ${product.targetAudience}\n`;
    }
    if (product.toneOfVoice) {
      text += `- Phong cách: ${product.toneOfVoice}\n`;
    }

    if (product.directUrl) {
      text += `- Xem sản phẩm: ${product.directUrl}\n`;
    }

    return text;
  }

  /**
   * TECHNIQUE 4: Intelligent Response Generation
   * Use retrieved context to generate smarter responses
   */
  async generateIntelligentResponse(
    customerId,
    question,
    chatHistory = [],
    options = {}
  ) {
    try {
      console.log("[Advanced RAG] Generating intelligent response...");
      const maxWords =
        options.maxWords && Number.isFinite(options.maxWords)
          ? Math.max(1, Math.floor(options.maxWords))
          : null;

      // Step 1: Rewrite query
      const queries = await this.rewriteQuery(question);

      // Step 2: Hybrid search
      const relevantChunks = await this.hybridSearch(customerId, queries, 8);

      if (relevantChunks.length === 0) {
        return this.noDataResponse();
      }

      // Step 3: Enhance context
      const enhancedChunks = await this.enhanceContext(
        relevantChunks,
        customerId
      );

      // Step 4: Analyze intent
      const intent = await this.analyzeIntent(question);

      // Step 5: Build advanced prompt
      const prompt = this.buildAdvancedPrompt(
        question,
        enhancedChunks,
        intent,
        chatHistory,
        { maxWords }
      );

      // Step 6: Generate response
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!maxWords) return text;
      return this.limitWords(text, maxWords);
    } catch (error) {
      console.error("[Advanced RAG] Response generation failed:", error);
      throw error;
    }
  }

  /**
   * TECHNIQUE 5: Intent Analysis
   * Understand what customer really wants
   */
  async analyzeIntent(question) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
      });

      const prompt = `Phân tích ý định của khách hàng. Chỉ trả về 1 trong các giá trị sau:
- PRODUCT_INFO: Hỏi thông tin sản phẩm cụ thể
- PRODUCT_COMPARE: So sánh sản phẩm
- RECOMMENDATION: Xin tư vấn sản phẩm phù hợp
- PRICE_INQUIRY: Hỏi về giá
- GENERAL_INQUIRY: Câu hỏi chung chung

Câu hỏi: "${question}"

Chỉ trả về 1 từ khóa, KHÔNG giải thích.`;

      const result = await model.generateContent(prompt);
      const intent = result.response.text().trim();

      console.log("[Advanced RAG] Detected intent:", intent);

      return intent;
    } catch (error) {
      console.error("[Advanced RAG] Intent analysis failed:", error);
      return "GENERAL_INQUIRY";
    }
  }

  /**
   * Build advanced prompt based on intent
   */
  buildAdvancedPrompt(question, chunks, intent, chatHistory, options = {}) {
    const context = chunks
      .map((chunk, idx) => `[Sản phẩm ${idx + 1}] ${chunk.enhancedText}`)
      .join("\n\n---\n\n");

    const historyText =
      chatHistory.length > 0
        ? chatHistory
            .slice(-3)
            .map((m) => `${m.role === "user" ? "Khách" : "Bot"}: ${m.content}`)
            .join("\n")
        : "Đây là đầu cuộc trò chuyện.";

    let systemPrompt = `Bạn là chuyên viên tư vấn trang sức bạc Orenda chuyên nghiệp và thân thiện.

NHIỆM VỤ CỤ THỂ (dựa trên ý định: ${intent}):`;

    switch (intent) {
      case "PRODUCT_COMPARE":
        systemPrompt += `
- So sánh chi tiết các sản phẩm về: giá, chất liệu, phong cách, đối tượng phù hợp
- Đưa ra ưu nhược điểm rõ ràng
- Gợi ý sản phẩm nào phù hợp với từng nhu cầu`;
        break;

      case "RECOMMENDATION":
        systemPrompt += `
- Hỏi thêm về: ngân sách, phong cách yêu thích, dịp sử dụng (nếu chưa rõ)
- Tư vấn 2-3 sản phẩm phù hợp nhất
- Giải thích TẠI SAO phù hợp với khách`;
        break;

      case "PRICE_INQUIRY":
        systemPrompt += `
- Báo giá chính xác từng sản phẩm
- So sánh giá với các sản phẩm tương tự
- Giải thích giá trị sản phẩm (chất liệu, thiết kế...)`;
        break;

      default:
        systemPrompt += `
- Trả lời chính xác dựa trên thông tin sản phẩm
- Nếu cần thêm thông tin, hỏi lại khách một cách tự nhiên
- Luôn nhiệt tình và chuyên nghiệp`;
    }

    systemPrompt += `

NGUYÊN TẮC:
✅ Dùng ngôn ngữ thân thiện, dễ hiểu (tone của Gen Z/Millennials)
✅ Luôn đề xuất thêm sản phẩm liên quan nếu phù hợp
✅ Đưa link sản phẩm nếu khách quan tâm
❌ KHÔNG bịa đặt thông tin không có trong dữ liệu
❌ KHÔNG nói chung chung, phải cụ thể về sản phẩm
${
  options.maxWords
    ? `\nGIỚI HẠN ĐỘ DÀI: Trả lời tối đa ${options.maxWords} từ.\n`
    : ""
}

THÔNG TIN SẢN PHẨM:
${context}

LỊCH SỬ CHAT:
${historyText}

CÂU HỎI KHÁCH HÀNG: ${question}

HÃY TƯ VẤN:`;

    return systemPrompt;
  }

  /**
   * No data response
   */
  noDataResponse() {
    return "Em xin lỗi, em không tìm thấy thông tin về sản phẩm này trong hệ thống ạ. Bạn có thể cho em biết rõ hơn bạn đang tìm loại trang sức nào không? (Dây chuyền, vòng tay, nhẫn...) hoặc bạn có ngân sách bao nhiêu để em tư vấn phù hợp hơn nhé! 💎";
  }

  // Utility: limit output to N words
  limitWords(text, maxWords) {
    if (!text) return text;
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "…";
  }
}

module.exports = new AdvancedRAGService();
