import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('Project', ProjectSchema);
