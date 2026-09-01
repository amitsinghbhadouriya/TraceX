const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages:  [{
    role:      { type: String, enum: ['user', 'assistant'] },
    content:   { type: String },
    toolCalls: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatLog', chatLogSchema);
