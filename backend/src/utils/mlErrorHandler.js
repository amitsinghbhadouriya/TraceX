/**
 * Unified Upstream ML Engine Error Handler
 *
 * Prevents internal Python tracebacks, file paths, or service connection strings
 * from leaking to the frontend when communicating with the ML engine.
 */
function handleMLError(err, res, next) {
  const timestamp = new Date().toISOString();

  // Connection refused / ML engine offline
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error(`[ML Engine Offline] [${timestamp}] Unable to connect to ML Engine: ${err.message}`);
    return res.status(503).json({ error: 'ML analysis engine is currently unavailable.' });
  }

  // Request timeout
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    console.error(`[ML Engine Timeout] [${timestamp}] ML request timed out: ${err.message}`);
    return res.status(504).json({ error: 'Analysis request timed out. Please try again with a smaller dataset.' });
  }

  // Upstream response from ML engine
  if (err.response) {
    const upstreamStatus = err.response.status || 502;
    const upstreamDetail = err.response.data?.detail;

    // Server-side diagnostic log with full upstream response payload
    console.error(
      `[ML Engine Upstream Error] [${timestamp}] Status: ${upstreamStatus} - ` +
      `URL: ${err.config?.url} - Detail:`, upstreamDetail || err.response.data || err.message
    );

    // 4xx errors from ML engine: pass sanitized detail if available, or clean fallback
    if (upstreamStatus < 500) {
      const clientDetail = (typeof upstreamDetail === 'string' && !upstreamDetail.includes('\n') && !upstreamDetail.includes('\\') && upstreamDetail.length < 200)
        ? upstreamDetail
        : 'Invalid request to analysis service.';
      return res.status(upstreamStatus).json({ error: clientDetail });
    }

    // 5xx errors from ML engine: NEVER forward raw traceback or internal exception strings
    return res.status(502).json({ error: 'Analysis service encountered an unexpected error.' });
  }

  // If it's another type of error, delegate to the central express error handler
  next(err);
}

module.exports = { handleMLError };
