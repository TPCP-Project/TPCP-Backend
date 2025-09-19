import mongoose from 'mongoose';

const FacebookPageSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  page_id: { type: String, required: true },
  page_name: { type: String, required: true },
  access_token: { type: String, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

FacebookPageSchema.index({ project_id: 1, page_id: 1 }, { unique: true });

export default mongoose.model('FacebookPage', FacebookPageSchema);
