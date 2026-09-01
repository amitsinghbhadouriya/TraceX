const ROLE_HIERARCHY = { admin: 3, investigator: 2, analyst: 1 };

/**
 * Require minimum role level.
 * Usage: router.get('/admin-route', requireRole('admin'), handler)
 */
const requireRole = (minRole) => (req, res, next) => {
  const userLevel = ROLE_HIERARCHY[req.user?.role] ?? 0;
  const required  = ROLE_HIERARCHY[minRole] ?? 999;
  if (userLevel < required) {
    return res.status(403).json({
      error: `Access denied. Requires role: ${minRole} or above.`
    });
  }
  next();
};

module.exports = { requireRole };
