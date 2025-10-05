const mongoose = require('mongoose');

const BrandMetricsSchema = new mongoose.Schema({
  brandId: { type: String, required: true },
  brandName: { type: String, required: true },

  visibilityScore: { type: Number, required: true },
  visibilityRank: { type: Number, required: true },
  visibilityRankChange: { type: Number },

  wordCount: { type: Number, required: true },
  wordCountRank: { type: Number, required: true },
  wordCountRankChange: { type: Number },

  depthOfMention: { type: Number, required: true },
  depthRank: { type: Number, required: true },
  depthRankChange: { type: Number },

  shareOfVoice: { type: Number, required: true },
  shareOfVoiceRank: { type: Number, required: true },
  shareOfVoiceRankChange: { type: Number },

  avgPosition: { type: Number, required: true },
  avgPositionRank: { type: Number, required: true },
  avgPositionRankChange: { type: Number },

  count1st: { type: Number, required: true },
  count2nd: { type: Number, required: true },
  count3rd: { type: Number, required: true },
  rank1st: { type: Number, required: true },
  rank2nd: { type: Number, required: true },
  rank3rd: { type: Number, required: true },

  totalAppearances: { type: Number, required: true },
  totalMentions: { type: Number, required: true },
  totalWordCountRaw: { type: Number, required: true }
}, { _id: false });

const AggregatedMetricsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },

  scope: {
    type: String,
    required: true,
    enum: ['overall', 'platform', 'topic', 'persona', 'prompt']
  },
  scopeValue: { type: String },

  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },

  totalPrompts: { type: Number, required: true },
  totalResponses: { type: Number, required: true },
  totalBrands: { type: Number, required: true },

  brandMetrics: [BrandMetricsSchema],

  lastCalculated: { type: Date, default: Date.now },
  promptTestIds: [{ type: String }]
});

// Composite indexes for efficient querying
AggregatedMetricsSchema.index({ userId: 1, scope: 1, scopeValue: 1, dateFrom: 1, dateTo: 1 });
AggregatedMetricsSchema.index({ userId: 1, lastCalculated: -1 });

module.exports = mongoose.model('AggregatedMetrics', AggregatedMetricsSchema);
