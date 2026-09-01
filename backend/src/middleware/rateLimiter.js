'use strict';

/**
 * rateLimiter.js — Tiered, fully-configurable rate limiting for TraceX.
 *
 * Tiers
 * ─────
 *  Auth routes  → authLimiterChain = [authIpLimiter, authBackoff, authAccountLimiter]
 *    • authIpLimiter      : per-IP, strict window          (env: RL_AUTH_IP_*)
 *    • authBackoff        : exponential delay per account  (env: RL_AUTH_BACKOFF_*)
 *    • authAccountLimiter : per-account (email), strict    (env: RL_AUTH_ACCOUNT_*)
 *
 *  publicLimiter   : unauthenticated / health endpoints   (env: RL_PUBLIC_*)
 *  authedLimiter   : authenticated reads / general use    (env: RL_AUTHED_*)
 *  uploadLimiter   : file uploads (authenticated)         (env: RL_UPLOAD_*)
 *  chatLimiter     : AI chat (authenticated)              (env: RL_CHAT_*)
 *  analysisLimiter : heavy ML compute (authenticated)     (env: RL_ANALYSIS_*)
 */

const rateLimit = require('express-rate-limit');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Read an integer from process.env, falling back to `defaultVal`.
 */
const envInt = (key, defaultVal) => {
  const v = parseInt(process.env[key], 10);
  return Number.isFinite(v) ? v : defaultVal;
};

/**
 * Build a standard express-rate-limit instance.
 * @param {object} opts
 * @param {number}   opts.windowMinutes
 * @param {number}   opts.max
 * @param {string}   opts.message
 * @param {function} [opts.keyGenerator]  - defaults to req.ip
 * @param {function} [opts.skip]
 */
const makeLimiter = ({ windowMinutes, max, message, keyGenerator, skip }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,   // RateLimit-* headers (RFC 6585)
    legacyHeaders:   false,
    message:         { error: message },
    ...(keyGenerator && { keyGenerator }),
    ...(skip        && { skip }),
  });

// ── Config — loaded once at startup ──────────────────────────────────────────

const cfg = {
  auth: {
    ip: {
      windowMin: envInt('RL_AUTH_IP_WINDOW_MIN', 15),
      max:       envInt('RL_AUTH_IP_MAX',        10),
    },
    account: {
      windowMin: envInt('RL_AUTH_ACCOUNT_WINDOW_MIN', 60),
      max:       envInt('RL_AUTH_ACCOUNT_MAX',          5),
    },
    backoff: {
      baseSec:      envInt('RL_AUTH_BACKOFF_BASE_SEC',    2),
      multiplier:   envInt('RL_AUTH_BACKOFF_MULTIPLIER',  2),
      maxSec:       envInt('RL_AUTH_BACKOFF_MAX_SEC',  3600),
    },
  },
  public: {
    windowMin: envInt('RL_PUBLIC_WINDOW_MIN', 15),
    max:       envInt('RL_PUBLIC_MAX',        60),
  },
  authed: {
    windowMin: envInt('RL_AUTHED_WINDOW_MIN', 15),
    max:       envInt('RL_AUTHED_MAX',        300),
  },
  upload: {
    windowMin: envInt('RL_UPLOAD_WINDOW_MIN', 1),
    max:       envInt('RL_UPLOAD_MAX',        5),
  },
  chat: {
    windowMin: envInt('RL_CHAT_WINDOW_MIN', 1),
    max:       envInt('RL_CHAT_MAX',        20),
  },
  analysis: {
    windowMin: envInt('RL_ANALYSIS_WINDOW_MIN', 60),
    max:       envInt('RL_ANALYSIS_MAX',        10),
  },
};

// ── In-memory account hit counter (auth failures only) ───────────────────────
// Tracks consecutive failed auth attempts per normalised email so the backoff
// middleware can compute the correct delay.  Entries expire after the per-
// account window to prevent unbounded growth.

const _accountHits = new Map(); // email → { count, expiresAt }

/**
 * Record one auth attempt for an account.
 * Returns the updated consecutive hit count.
 */
const _recordAccountHit = (email) => {
  const now        = Date.now();
  const windowMs   = cfg.auth.account.windowMin * 60 * 1000;
  const existing   = _accountHits.get(email);

  if (existing && existing.expiresAt > now) {
    existing.count  += 1;
    existing.expiresAt = now + windowMs; // slide window on each hit
    return existing.count;
  }

  _accountHits.set(email, { count: 1, expiresAt: now + windowMs });
  return 1;
};

/**
 * Reset the hit counter for an account (call on successful login).
 */
const resetAccountHits = (email) => {
  if (email) _accountHits.delete(email.toLowerCase());
};

/**
 * Compute exponential backoff delay (in ms) for a given hit count.
 */
const _backoffMs = (hits) => {
  const { baseSec, multiplier, maxSec } = cfg.auth.backoff;
  if (hits <= 1) return 0; // first attempt — no delay
  const delaySec = Math.min(baseSec * Math.pow(multiplier, hits - 1), maxSec);
  return Math.round(delaySec * 1000);
};

// ── Auth limiters ─────────────────────────────────────────────────────────────

/** 1. Per-IP strict limiter — first line of defence. */
const authIpLimiter = makeLimiter({
  windowMinutes: cfg.auth.ip.windowMin,
  max:           cfg.auth.ip.max,
  message:       `Too many auth attempts from this IP. Try again after ${cfg.auth.ip.windowMin} minutes.`,
});

/**
 * 2. Exponential backoff middleware.
 *    - Records the account hit count, computes delay, then waits before next().
 *    - Does NOT reject the request; the account limiter downstream does that.
 *    - Adds an X-Auth-Delay header so the client knows how long it will be held.
 */
const authBackoff = (req, res, next) => {
  const email = (req.body?.email || '').toLowerCase().trim();
  if (!email) return next();

  const hits    = _recordAccountHit(email);
  const delayMs = _backoffMs(hits);

  if (delayMs > 0) {
    const retrySec = Math.ceil(delayMs / 1000);
    res.setHeader('X-Auth-Delay', String(retrySec));
    setTimeout(next, delayMs);
  } else {
    next();
  }
};

/**
 * 3. Per-account (email) strict limiter.
 *    Keyed on the normalised email from the request body so that attackers who
 *    rotate IPs are still throttled per target account.
 */
const authAccountLimiter = makeLimiter({
  windowMinutes: cfg.auth.account.windowMin,
  max:           cfg.auth.account.max,
  message:       `Too many auth attempts for this account. Try again after ${cfg.auth.account.windowMin} minutes.`,
  keyGenerator:  (req) => (req.body?.email || req.ip).toLowerCase().trim(),
});

/**
 * Convenience array — spread into route middleware arrays:
 *   router.post('/login', ...authLimiterChain, validators, handler)
 */
const authLimiterChain = [authIpLimiter, authBackoff, authAccountLimiter];

// ── Tiered limiters ───────────────────────────────────────────────────────────

/** Public / unauthenticated endpoints (health, unmatched routes). */
const publicLimiter = makeLimiter({
  windowMinutes: cfg.public.windowMin,
  max:           cfg.public.max,
  message:       `Too many requests. Limit: ${cfg.public.max} per ${cfg.public.windowMin} min.`,
});

/** Authenticated general reads (datasets list, graph nodes, /me, etc.). */
const authedLimiter = makeLimiter({
  windowMinutes: cfg.authed.windowMin,
  max:           cfg.authed.max,
  message:       `Request rate exceeded. Limit: ${cfg.authed.max} per ${cfg.authed.windowMin} min.`,
});

/** File uploads — tight per-minute bucket. */
const uploadLimiter = makeLimiter({
  windowMinutes: cfg.upload.windowMin,
  max:           cfg.upload.max,
  message:       `Upload rate limit exceeded. Limit: ${cfg.upload.max} per minute.`,
});

/** AI chat — tight per-minute bucket. */
const chatLimiter = makeLimiter({
  windowMinutes: cfg.chat.windowMin,
  max:           cfg.chat.max,
  message:       `AI chat rate limit exceeded. Limit: ${cfg.chat.max} per minute.`,
});

/** Heavy ML analysis runs — moderate hourly bucket. */
const analysisLimiter = makeLimiter({
  windowMinutes: cfg.analysis.windowMin,
  max:           cfg.analysis.max,
  message:       `Analysis rate limit exceeded. Limit: ${cfg.analysis.max} per ${cfg.analysis.windowMin} min.`,
});

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Auth chain — apply all three in order on login / register
  authIpLimiter,
  authBackoff,
  authAccountLimiter,
  authLimiterChain,

  // Helpers
  resetAccountHits,

  // Tiered singles
  publicLimiter,
  authedLimiter,
  uploadLimiter,
  chatLimiter,
  analysisLimiter,
};
