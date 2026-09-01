const AuditLog = require('../models/AuditLog');

/**
 * Log an investigator action to MongoDB.
 * Non-blocking — errors are silently swallowed to not disrupt request flow.
 */
const audit = async (req, action, metadata = {}) => {
  try {
    await AuditLog.create({
      userId:    req.user?._id,
      userEmail: req.user?.email,
      action,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (err) {
    console.error('[Audit] Failed to write audit log:', err.message);
  }
};

module.exports = { audit };
