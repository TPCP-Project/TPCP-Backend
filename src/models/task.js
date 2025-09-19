import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  due_date: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('Task', TaskSchema);
