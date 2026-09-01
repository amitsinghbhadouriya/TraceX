const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String },
  action:    { type: String, required: true },  // e.g. 'UPLOAD', 'RUN_ANALYSIS', 'QUERY_ENTITY'
  metadata:  { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// TTL index — auto-delete logs after 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
