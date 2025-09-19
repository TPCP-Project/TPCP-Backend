import mongoose from 'mongoose';

const KpiSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true, min: 2000 },
  target_value: { type: mongoose.Schema.Types.Decimal128, required: true },
  current_value: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  metric_type: { type: String, enum: ['revenue', 'leads', 'tasks'], required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

KpiSchema.index({ user_id: 1, month: 1, year: 1, metric_type: 1 }, { unique: true });

export default mongoose.model('Kpi', KpiSchema);
