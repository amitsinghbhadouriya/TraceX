'use strict';

const { validationResult } = require('express-validator');

/**
 * validate — centralized express-validator result checker.
 *
 * Place this after all schema chains in a route's middleware array.
 * If any chain reports an error the request is rejected immediately with 400;
 * nothing reaches the route handler.
 *
 * Usage:
 *   router.post('/login', ...authSchemas.login, validate, handler)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

module.exports = { validate };