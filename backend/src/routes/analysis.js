const express = require('express');
const axios = require('axios');
const Dataset = require('../models/Dataset');
const AnalysisResult = require('../models/AnalysisResult');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { analysisLimiter, authedLimiter } = require('../middleware/rateLimiter');
const { analysisSchemas } = require('../middleware/schemas');
const { validate } = require('../middleware/validate');
const { audit } = require('../utils/auditLogger');
const { handleMLError } = require('../utils/mlErrorHandler');

const router = express.Router();
const ML_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';

const mlGet  = (path, timeout = 30_000) => axios.get(`${ML_URL}${path}`, { timeout });
const mlPost = (path, data, timeout = 300_000) => axios.post(`${ML_URL}${path}`, data, { timeout });

// ── POST /api/analysis/run/:datasetId ─────────────────────────────────────────
// Runs: anomaly detection → graph → clusters → scoring
// Uses analysisLimiter (tighter) — this is an expensive ML operation.
// :datasetId validated as MongoDB ObjectId before any DB or ML call.
router.post('/run/:datasetId',
  authenticate,
  requireRole('investigator'),
  analysisLimiter,
  ...analysisSchemas.run,
  validate,
  async (req, res, next) => {
    try {
      const dataset = await Dataset.findOne({
        _id: req.params.datasetId,
        uploadedBy: req.user._id,
      });
      if (!dataset) return res.status(404).json({ error: 'Dataset not found.' });

      const sessionId = dataset.sessionId;

      // Step 1: Anomaly detection
      const anomalyRes = await mlPost(`/api/ml/analyze/${sessionId}`);

      // Step 2: Graph + clusters + risk scoring
      const graphRes = await mlPost(`/api/ml/full-analysis/${sessionId}`);

      const fullData = graphRes.data;

      // Persist summary to MongoDB
      const result = await AnalysisResult.create({
        datasetId:  dataset._id,
        sessionId,
        userId:     req.user._id,
        anomalySummary:  anomalyRes.data,
        scoringSummary:  fullData.scoring_summary,
        availableEntityTypes: fullData.available_entity_types,
        nodeCount:   fullData.node_count,
        edgeCount:   fullData.edge_count,
        clusterCount: fullData.cluster_count,
      });

      dataset.status = 'analysis_complete';
      dataset.analysisRunAt = new Date();
      await dataset.save();

      await audit(req, 'RUN_ANALYSIS', {
        datasetId: dataset._id,
        sessionId,
        nodeCount: fullData.node_count,
      });

      res.json({
        datasetId:  dataset._id,
        resultId:   result._id,
        sessionId,
        ...fullData,
        anomalySummary: anomalyRes.data,
      });
    } catch (err) {
      handleMLError(err, res, next);
    }
  }
);

// ── GET /api/analysis/results/:datasetId ──────────────────────────────────────
// :datasetId validated as MongoDB ObjectId before any DB call.
router.get('/results/:datasetId',
  authenticate,
  authedLimiter,
  ...analysisSchemas.results,
  validate,
  async (req, res, next) => {
    try {
      const dataset = await Dataset.findOne({
        _id: req.params.datasetId,
        uploadedBy: req.user._id,
      });
      if (!dataset) return res.status(404).json({ error: 'Dataset not found.' });

      const result = await AnalysisResult.findOne({ datasetId: dataset._id })
        .sort({ completedAt: -1 });

      if (!result) return res.status(404).json({ error: 'No analysis results yet.' });

      // Fetch live summary from ML session
      let liveSummary = {};
      try {
        const summaryRes = await mlGet(`/api/ml/summary/${dataset.sessionId}`, 5_000);
        liveSummary = summaryRes.data;
      } catch (_) { /* ML session may have expired */ }

      res.json({ result, liveSummary });
    } catch (err) { next(err); }
  }
);

module.exports = router;
