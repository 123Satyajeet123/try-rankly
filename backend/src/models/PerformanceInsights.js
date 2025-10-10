const mongoose = require('mongoose');

const InsightSchema = new mongoose.Schema({
  insightId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // Categorization
  category: { 
    type: String, 
    enum: ['whats_working', 'needs_attention'],
    required: true 
  },
  type: {
    type: String,
    enum: ['trend', 'performance', 'comparison', 'opportunity', 'warning'],
    required: true
  },
  
  // Metrics involved
  primaryMetric: { type: String, required: true },
  secondaryMetrics: [{ type: String }],
  
  // Quantified data
  currentValue: { type: Number },
  previousValue: { type: Number },
  changePercent: { type: Number },
  trend: { 
    type: String, 
    enum: ['up', 'down', 'stable'],
    required: true 
  },
  
  // Impact assessment
  impact: { 
    type: String, 
    enum: ['high', 'medium', 'low'],
    required: true 
  },
  confidence: { 
    type: Number, 
    min: 0, 
    max: 1,
    default: 0.8
  },
  
  // AI-generated recommendations
  recommendation: { type: String, required: true },
  actionableSteps: [{ type: String }],
  
  // Context
  timeframe: { type: String, required: true }, // e.g., "this week", "last month"
  scope: {
    type: String,
    enum: ['overall', 'platform', 'topic', 'persona'],
    default: 'overall'
  },
  scopeValue: { type: String }, // e.g., "OpenAI", "Payment Processing"
  
  // Visual indicators
  icon: { type: String }, // e.g., "trend-up", "shield", "warning"
  color: { type: String }, // e.g., "green", "orange", "red"
  
  // Metadata
  generatedAt: { type: Date, default: Date.now },
  dataSource: {
    metricType: { type: String, required: true },
    aggregationLevel: { type: String, required: true },
    testCount: { type: Number },
    dateRange: {
      from: { type: Date },
      to: { type: Date }
    }
  }
}, { _id: false });

const PerformanceInsightsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  urlAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UrlAnalysis',
    index: true
  },
  
  // Generation metadata
  generatedAt: { type: Date, default: Date.now },
  model: { type: String, default: 'gpt-4o' },
  promptVersion: { type: String, default: '1.0' },
  
  // Data context
  metricsSnapshot: {
    totalTests: { type: Number },
    dateRange: {
      from: { type: Date },
      to: { type: Date }
    },
    platforms: [{ type: String }],
    topics: [{ type: String }],
    personas: [{ type: String }]
  },
  
  // Generated insights
  insights: [InsightSchema],
  
  // Summary
  summary: {
    whatsWorkingCount: { type: Number, default: 0 },
    needsAttentionCount: { type: Number, default: 0 },
    highImpactCount: { type: Number, default: 0 },
    topInsight: { type: String }, // Most important insight
    overallSentiment: { 
      type: String, 
      enum: ['positive', 'neutral', 'negative', 'mixed']
    }
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['generated', 'reviewed', 'archived'],
    default: 'generated'
  }
});

// Indexes for efficient querying
PerformanceInsightsSchema.index({ userId: 1, generatedAt: -1 });
PerformanceInsightsSchema.index({ userId: 1, urlAnalysisId: 1, generatedAt: -1 });
PerformanceInsightsSchema.index({ 'insights.category': 1, 'insights.impact': 1 });

module.exports = mongoose.model('PerformanceInsights', PerformanceInsightsSchema);
