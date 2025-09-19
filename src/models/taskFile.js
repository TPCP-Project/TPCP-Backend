import mongoose from 'mongoose';

const TaskFileSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  filename: { type: String, required: true },
  file_path: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now },
});

export default mongoose.model('TaskFile', TaskFileSchema);
