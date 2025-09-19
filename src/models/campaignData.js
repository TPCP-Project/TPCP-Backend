import mongoose from 'mongoose';

const CampaignDataSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  campaign_name: { type: String, required: true },
  platform: { type: String, enum: ['facebook', 'google', 'instagram'], required: true },
  budget: { type: mongoose.Schema.Types.Decimal128 },
  spend: { type: mongoose.Schema.Types.Decimal128 },
  clicks: { type: Number },
  conversions: { type: Number },
  start_date: { type: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export default mongoose.model('CampaignData', CampaignDataSchema);
