import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['task_assigned', 'task_overdue', 'system'], required: true },
  status: { type: String, enum: ['unread', 'read'], default: 'unread', index: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('Notification', NotificationSchema);
