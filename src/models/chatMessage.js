import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('ChatMessage', ChatMessageSchema);
