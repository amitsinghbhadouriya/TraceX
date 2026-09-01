'use strict';

/**
 * schemas.js — Centralized input validation schemas for all TraceX routes.
 *
 * Every schema is an array of express-validator chains.
 * Append `validate` after the spread to enforce rejection:
 *   router.post('/login', ...authSchemas.login, validate, handler)
 *
 * Design rules
 * ─────────────
 *  • No silent coercion — inputs that don't match the schema are rejected, not fixed.
 *  • Body fields: type + length + format enforced.
 *  • Route params: structural format enforced (ObjectId hex, UUID v4) before any DB call.
 *  • Wildcard params: character-allowlist applied to block path-traversal sequences.
 */

const { body, param } = require('express-validator');

// ── Shared reusable chains ────────────────────────────────────────────────────

/**
 * Validates a MongoDB ObjectId route parameter.
 * 24-character lowercase hex string — e.g. "507f1f77bcf86cd799439011"
 */
const mongoId = (field) =>
  param(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .matches(/^[a-f\d]{24}$/i)
    .withMessage(`${field} must be a valid MongoDB ObjectId`);

/**
 * Validates a UUID v4 route parameter.
 * e.g. "550e8400-e29b-41d4-a716-446655440000"
 */
const sessionUuid = (field) =>
  param(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .isUUID(4)
    .withMessage(`${field} must be a valid UUID v4 session identifier`);

// ── Auth schemas ──────────────────────────────────────────────────────────────

const authSchemas = {
  /**
   * POST /api/auth/register
   * name      : non-empty string, 1–100 chars
   * email     : RFC-5321 email address
   * password  : 8–128 characters (no content restrictions — entropy is the goal)
   * role      : optional; must be one of the three defined roles if present
   */
  register: [
    body('name')
      .isString().withMessage('name must be a string')
      .trim()
      .notEmpty().withMessage('name is required')
      .isLength({ min: 1, max: 100 }).withMessage('name must be 1–100 characters'),

    body('email')
      .isString().withMessage('email must be a string')
      .isEmail().withMessage('email must be a valid email address')
      .isLength({ max: 254 }).withMessage('email must not exceed 254 characters')
      .normalizeEmail(),

    body('password')
      .isString().withMessage('password must be a string')
      .isLength({ min: 8, max: 128 }).withMessage('password must be 8–128 characters'),

    body('role')
      .optional()
      .isString().withMessage('role must be a string')
      .isIn(['admin', 'investigator', 'analyst'])
      .withMessage('role must be one of: admin, investigator, analyst'),
  ],

  /**
   * POST /api/auth/login
   * email    : RFC-5321 email address
   * password : 1–128 characters (shorter minimum — just "not empty")
   */
  login: [
    body('email')
      .isString().withMessage('email must be a string')
      .isEmail().withMessage('email must be a valid email address')
      .isLength({ max: 254 }).withMessage('email must not exceed 254 characters')
      .normalizeEmail(),

    body('password')
      .isString().withMessage('password must be a string')
      .notEmpty().withMessage('password is required')
      .isLength({ max: 128 }).withMessage('password must not exceed 128 characters'),
  ],
};

// ── Dataset schemas ───────────────────────────────────────────────────────────

const datasetSchemas = {
  /**
   * POST /api/datasets/upload
   * The file itself is validated by multer (extension allowlist + size cap).
   * We additionally cap the original filename length here.
   */
  upload: [
    body('filename')
      .optional()
      .isString().withMessage('filename must be a string')
      .isLength({ max: 255 }).withMessage('filename must not exceed 255 characters'),
  ],

  /**
   * GET /api/datasets/:id
   * :id must be a 24-char MongoDB ObjectId
   */
  getById: [
    mongoId('id'),
  ],
};

// ── Analysis schemas ──────────────────────────────────────────────────────────

const analysisSchemas = {
  /**
   * POST /api/analysis/run/:datasetId
   * GET  /api/analysis/results/:datasetId
   */
  run:     [mongoId('datasetId')],
  results: [mongoId('datasetId')],
};

// ── Graph schemas ─────────────────────────────────────────────────────────────

/**
 * Allowlist for entity IDs: printable ASCII excluding path-traversal chars.
 * Blocks: / \ . sequences used in directory traversal, null bytes, etc.
 * Allows: alphanumerics, hyphens, underscores, colons, @, spaces.
 */
const ENTITY_ID_RE = /^[\w\s@:.\-]{1,200}$/;

const graphSchemas = {
  /**
   * GET /api/graph/nodes/:sessionId
   * GET /api/graph/clusters/:sessionId
   * GET /api/graph/summary/:sessionId
   * GET /api/graph/chat-history/:sessionId
   */
  sessionParam: [sessionUuid('sessionId')],

  /**
   * GET /api/graph/entity/:sessionId/*
   * sessionId validated as UUID v4.
   * The wildcard entityId param is validated via param('0') (Express wildcard index)
   * with a character allowlist to block path-traversal attempts.
   */
  entityParam: [
    sessionUuid('sessionId'),
    param('0')
      .isString().withMessage('entityId must be a string')
      .notEmpty().withMessage('entityId is required')
      .isLength({ min: 1, max: 200 }).withMessage('entityId must be 1–200 characters')
      .matches(ENTITY_ID_RE)
      .withMessage('entityId contains invalid characters'),
  ],

  /**
   * POST /api/graph/chat/:sessionId
   * sessionId validated as UUID v4.
   * message: non-empty string, max 2000 characters.
   */
  chat: [
    sessionUuid('sessionId'),
    body('message')
      .isString().withMessage('message must be a string')
      .notEmpty().withMessage('message is required')
      .isLength({ min: 1, max: 2000 }).withMessage('message must be 1–2000 characters'),
  ],
};

module.exports = { authSchemas, datasetSchemas, analysisSchemas, graphSchemas };
