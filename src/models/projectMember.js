import mongoose from 'mongoose';

const ProjectMemberSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['manager', 'employee'], required: true },
  joined_at: { type: Date, default: Date.now },
});

ProjectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model('ProjectMember', ProjectMemberSchema);
