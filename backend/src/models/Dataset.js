const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  uploadedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename:         { type: String, required: true },
  originalFilename: { type: String },
  sessionId:        { type: String, required: true, index: true },
  status:           {
    type: String,
    enum: ['uploaded', 'anomaly_complete', 'analysis_complete', 'error'],
    default: 'uploaded'
  },
  rowCount:         { type: Number },
  validationReport: { type: mongoose.Schema.Types.Mixed },
  fieldMap:         { type: mongoose.Schema.Types.Mixed },
  missingFields:    [String],
  extraColumns:     [String],
  detectedFields:   [String],
  analysisRunAt:    { type: Date },
  errorMessage:     { type: String },
  createdAt:        { type: Date, default: Date.now },
});

module.exports = mongoose.model('Dataset', datasetSchema);
