import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  plan_type: { type: String, enum: ['free', 'premium'], required: true },
  status: { type: String, enum: ['active', 'expired'], default: 'active' },
  end_date: { type: Date, required: true },
  features: { type: mongoose.Schema.Types.Mixed }, // arbitrary JSON
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('Subscription', SubscriptionSchema);
