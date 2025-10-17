const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    // Additional fields from sheet
    targetAudience: { type: String }, // "Đối tượng khách hàng"
    toneOfVoice: { type: String }, // "Tone of voice"
    status: { type: String, default: "next", index: true },
    directUrl: { type: String },
    price: { type: Number },
    category: { type: String },
    images: [{ type: String }],
    // Flexible attributes object
    attributes: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
