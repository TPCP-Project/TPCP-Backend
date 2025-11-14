import mongoose from "mongoose";

const ChatGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    type: { type: String, enum: ["project", "direct"], required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export default mongoose.model("ChatGroup", ChatGroupSchema);
