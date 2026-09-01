const express = require('express');
const axios = require('axios');
const Dataset = require('../models/Dataset');
const { authenticate } = require('../middleware/auth');
const { authedLimiter, chatLimiter } = require('../middleware/rateLimiter');
const { graphSchemas } = require('../middleware/schemas');
const { validate } = require('../middleware/validate');
const { audit } = require('../utils/auditLogger');
const { handleMLError } = require('../utils/mlErrorHandler');

const router = express.Router();
const ML_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';

// ── GET /api/graph/nodes/:sessionId ──────────────────────────────────────────
// :sessionId validated as UUID v4 before forwarding to ML engine.
router.get('/nodes/:sessionId',
  authenticate,
  authedLimiter,
  ...graphSchemas.sessionParam,
  validate,
  async (req, res, next) => {
    try {
      await audit(req, 'VIEW_GRAPH', { sessionId: req.params.sessionId });
      const r = await axios.get(`${ML_URL}/api/ml/graph/${req.params.sessionId}`, { timeout: 15_000 });
      res.json(r.data);
    } catch (err) { handleMLError(err, res, next); }
  }
);

// ── GET /api/graph/clusters/:sessionId ───────────────────────────────────────
router.get('/clusters/:sessionId',
  authenticate,
  authedLimiter,
  ...graphSchemas.sessionParam,
  validate,
  async (req, res, next) => {
    try {
      const r = await axios.get(`${ML_URL}/api/ml/clusters/${req.params.sessionId}`, { timeout: 15_000 });
      res.json(r.data);
    } catch (err) { handleMLError(err, res, next); }
  }
);

// ── GET /api/graph/entity/:sessionId/:entityId ────────────────────────────────
// sessionId: UUID v4. entityId (wildcard): char-allowlist blocks path traversal.
router.get('/entity/:sessionId/*',
  authenticate,
  authedLimiter,
  ...graphSchemas.entityParam,
  validate,
  async (req, res, next) => {
    try {
      const entityId = req.params[0];
      await audit(req, 'QUERY_ENTITY', { sessionId: req.params.sessionId, entityId });
      const encodedId = encodeURIComponent(entityId);
      const r = await axios.get(
        `${ML_URL}/api/ml/entity/${req.params.sessionId}/${encodedId}`,
        { timeout: 10_000 }
      );
      res.json(r.data);
    } catch (err) { handleMLError(err, res, next); }
  }
);

// ── GET /api/graph/summary/:sessionId ────────────────────────────────────────
router.get('/summary/:sessionId',
  authenticate,
  authedLimiter,
  ...graphSchemas.sessionParam,
  validate,
  async (req, res, next) => {
    try {
      const r = await axios.get(`${ML_URL}/api/ml/summary/${req.params.sessionId}`, { timeout: 10_000 });
      res.json(r.data);
    } catch (err) { handleMLError(err, res, next); }
  }
);

// ── POST /api/graph/chat/:sessionId ──────────────────────────────────────────
// sessionId: UUID v4. message: string 1–2000 chars (replaces manual trim guard).
router.post('/chat/:sessionId',
  authenticate,
  chatLimiter,
  ...graphSchemas.chat,
  validate,
  async (req, res, next) => {
    try {
      await audit(req, 'AI_CHAT', {
        sessionId: req.params.sessionId,
        messageLength: req.body.message.length,
      });
      const r = await axios.post(
        `${ML_URL}/api/ml/chat/${req.params.sessionId}`,
        { message: req.body.message },
        { timeout: 60_000 }
      );
      res.json(r.data);
    } catch (err) { handleMLError(err, res, next); }
  }
);

// ── GET /api/graph/chat-history/:sessionId ───────────────────────────────────
router.get('/chat-history/:sessionId',
  authenticate,
  authedLimiter,
  ...graphSchemas.sessionParam,
  validate,
  async (req, res, next) => {
    try {
      const r = await axios.get(`${ML_URL}/api/ml/chat-history/${req.params.sessionId}`, { timeout: 10_000 });
      res.json(r.data);
    } catch (err) { handleMLError(err, res, next); }
  }
);

module.exports = router;
