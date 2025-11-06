const mongoose = require("mongoose");
const { Schema } = mongoose;

const productChunkSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    chunkText: { type: String, required: true },
    embedding: [{ type: Number }],
    metadata: {
      chunkIndex: { type: Number },
      productName: { type: String },
      category: { type: String },
      // Mirror key product info for retrieval context
      targetAudience: { type: String },
      toneOfVoice: { type: String },
      status: { type: String },
      directUrl: { type: String },
    },
  },
  { timestamps: true }
);

// Composite index for fast search per customer and product
productChunkSchema.index({ customerId: 1, productId: 1 });
// Optional: filter chunks by status within a product
productChunkSchema.index({ customerId: 1, productId: 1, "metadata.status": 1 });

module.exports = mongoose.model("ProductChunk", productChunkSchema);
