const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema({
  datasetId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true },
  sessionId:   { type: String, required: true, index: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  anomalySummary:  { type: mongoose.Schema.Types.Mixed },
  scoringSummary:  { type: mongoose.Schema.Types.Mixed },
  topEntities:     { type: mongoose.Schema.Types.Mixed },  // top 20 high-risk entities
  topClusters:     { type: mongoose.Schema.Types.Mixed },  // top 10 clusters
  availableEntityTypes: [String],
  nodeCount:   { type: Number },
  edgeCount:   { type: Number },
  clusterCount: { type: Number },
  completedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
