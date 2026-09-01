const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const Dataset = require('../models/Dataset');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter, authedLimiter } = require('../middleware/rateLimiter');
const { datasetSchemas } = require('../middleware/schemas');
const { validate } = require('../middleware/validate');
const { audit } = require('../utils/auditLogger');
const { handleMLError } = require('../utils/mlErrorHandler');
const { validateUploadedFile } = require('../utils/fileValidator');

const router = express.Router();
const ML_URL = process.env.ML_ENGINE_URL || 'http://localhost:8000';
const MAX_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '200');

// ── Multer config (memory storage — no temp files on disk) ────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.xlsm', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${ext}`));
  },
});

// ── POST /api/datasets/upload ─────────────────────────────────────────────────
// multer runs first (ext + size), then schema validates optional body fields,
// then validate() gate, then handler.
router.post('/upload',
  authenticate,
  uploadLimiter,
  upload.single('file'),
  ...datasetSchemas.upload,
  validate,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      // Deep content, magic bytes, and executable signature validation
      const fileValidation = validateUploadedFile(req.file);
      if (!fileValidation.valid) {
        return res.status(400).json({ error: fileValidation.error });
      }

      const safeFilename = fileValidation.sanitizedFilename;

      // Forward file to ML engine
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename:    safeFilename,
        contentType: req.file.mimetype || 'application/octet-stream',
      });

      const mlResponse = await axios.post(`${ML_URL}/api/ml/upload`, form, {
        headers: form.getHeaders(),
        timeout: 180_000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const mlData = mlResponse.data;

      // If validation failed or no session was created, return report directly
      if (!mlData.success || !mlData.session_id) {
        return res.status(200).json(mlData);
      }

      // Persist valid dataset to MongoDB
      const dataset = await Dataset.create({
        uploadedBy:       req.user._id,
        filename:         req.file.originalname,
        originalFilename: req.file.originalname,
        sessionId:        mlData.session_id,
        status:           'uploaded',
        rowCount:         mlData.row_count,
        validationReport: mlData.validation_report,
        fieldMap:         mlData.field_map,
        missingFields:    mlData.missing_fields || [],
        extraColumns:     mlData.extra_columns || [],
        detectedFields:   mlData.detected_fields || [],
      });

      await audit(req, 'UPLOAD_DATASET', {
        datasetId: dataset._id,
        filename: req.file.originalname,
        rowCount: mlData.row_count,
        sessionId: mlData.session_id,
      });

      res.status(201).json({ ...mlData, datasetId: dataset._id });
    } catch (err) {
      handleMLError(err, res, next);
    }
  }
);

// ── GET /api/datasets ─────────────────────────────────────────────────────────
router.get('/', authenticate, authedLimiter, async (req, res, next) => {
  try {
    const datasets = await Dataset.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-validationReport');
    res.json({ datasets });
  } catch (err) { next(err); }
});

// ── GET /api/datasets/:id ─────────────────────────────────────────────────────
// :id validated as a 24-char MongoDB ObjectId before any DB call.
router.get('/:id',
  authenticate,
  authedLimiter,
  ...datasetSchemas.getById,
  validate,
  async (req, res, next) => {
    try {
      const dataset = await Dataset.findOne({
        _id: req.params.id,
        uploadedBy: req.user._id,
      });
      if (!dataset) return res.status(404).json({ error: 'Dataset not found.' });
      await audit(req, 'VIEW_DATASET', { datasetId: dataset._id });
      res.json({ dataset });
    } catch (err) { next(err); }
  }
);

// ── DELETE /api/datasets/:id ──────────────────────────────────────────────────
router.delete('/:id',
  authenticate,
  authedLimiter,
  ...datasetSchemas.getById,
  validate,
  async (req, res, next) => {
    try {
      const AnalysisResult = require('../models/AnalysisResult');
      const dataset = await Dataset.findOneAndDelete({
        _id: req.params.id,
        uploadedBy: req.user._id,
      });

      if (!dataset) return res.status(404).json({ error: 'Dataset not found.' });

      // Clean up any associated analysis results
      await AnalysisResult.deleteMany({ datasetId: dataset._id });

      await audit(req, 'DELETE_DATASET', {
        datasetId: dataset._id,
        filename: dataset.filename,
        sessionId: dataset.sessionId,
      });

      res.json({ success: true, message: 'Dataset removed successfully.', deletedId: dataset._id });
    } catch (err) { next(err); }
  }
);

module.exports = router;
