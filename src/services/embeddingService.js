const { GoogleGenerativeAI } = require("@google/generative-ai");

class EmbeddingService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.embeddingModel = "text-embedding-004";
  }

  /**
   * Generate embeddings for multiple texts
   * @param {string[]} texts - Array of text strings to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error("Texts must be a non-empty array");
      }

      console.log(
        `[Embedding] Generating embeddings for ${texts.length} texts`
      );

      const model = this.genAI.getGenerativeModel({
        model: this.embeddingModel,
      });

      // Process embeddings in batches to avoid rate limits
      const batchSize = 100;
      const allEmbeddings = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const results = await Promise.all(
          batch.map(async (text) => {
            try {
              const result = await model.embedContent(text);
              return result.embedding.values;
            } catch (error) {
              console.error(
                `[Embedding] Error embedding text: ${text.substring(0, 50)}...`,
                error.message
              );
              // Return zero vector on error to maintain array length
              return new Array(768).fill(0);
            }
          })
        );

        allEmbeddings.push(...results);

        // Small delay between batches
        if (i + batchSize < texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(
        `[Embedding] Successfully generated ${allEmbeddings.length} embeddings`
      );
      return allEmbeddings;
    } catch (error) {
      console.error("[Embedding] Fatal error:", error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} Similarity score between -1 and 1
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}

module.exports = new EmbeddingService();
