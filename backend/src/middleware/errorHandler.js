/**
 * Centralized Error Handler
 *
 * Guarantees:
 * 1. Clients never receive raw stack traces, internal file paths, or raw database errors.
 * 2. Unhandled 500-level errors return a uniform generic message in all environments.
 * 3. Specific known client errors (Mongoose CastError/ValidationError, JWT, Multer, JSON syntax)
 *    return clean, informative 4xx messages without revealing internal implementation details.
 * 4. Full error stacks and request context are logged server-side for investigator debugging.
 */
const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();

  // ── 1. Malformed JSON payload (body-parser / express.json) ───────────────────
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON in request body.' });
  }

  // ── 2. Multer upload errors ──────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large. Maximum allowed file size is 500MB.'
      });
    }
    return res.status(400).json({ error: 'Upload failed: invalid file payload.' });
  }

  // ── 3. Mongoose CastError (e.g. invalid ObjectId format) ─────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid identifier provided for ${err.path || 'resource'}.` });
  }

  // ── 4. Mongoose ValidationError (schema validation failure) ──────────────────
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid data provided.' });
  }

  // ── 5. MongoDB Duplicate Key Error (code 11000) ──────────────────────────────
  if (err.code === 11000 || err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({ error: 'A record with these details already exists.' });
  }

  // ── 6. JWT Authentication Errors ─────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Authentication token expired.' });
  }

  // ── 7. Generic Status and Error Resolution ───────────────────────────────────
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600
    ? err.status
    : typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

  // 4xx errors: allow sanitized message if provided by application logic,
  // or fall back to status description.
  // 5xx errors: ALWAYS return generic error message to prevent info leakage.
  const clientMessage = status < 500
    ? (err.message && !err.message.includes('\n') && !err.message.includes('\\') && !err.message.includes('/')
        ? err.message
        : 'Invalid request.')
    : 'An internal server error occurred.';

  // ── 8. Server-Side Logging ───────────────────────────────────────────────────
  if (status >= 500) {
    console.error(
      `[Error] [${timestamp}] ${req.method} ${req.originalUrl || req.url} ` +
      `- IP: ${req.ip} - Status: ${status} - ${err.stack || err.message}`
    );
  } else {
    // Debug log for 4xx if needed
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Warn] [${timestamp}] ${req.method} ${req.originalUrl || req.url} - Status: ${status} - ${err.message}`);
    }
  }

  res.status(status).json({ error: clientMessage });
};

module.exports = { errorHandler };
