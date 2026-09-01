const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { audit } = require('../utils/auditLogger');
const { authLimiterChain, authedLimiter, resetAccountHits } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');
const { authSchemas } = require('../middleware/schemas');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register',
  ...authLimiterChain,
  ...authSchemas.register,
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Email is already registered. Please sign in or use another email.' });
      }
      const user = await User.create({
        name,
        email,
        passwordHash: password,
        role: role || 'investigator',
        isActive: true,
      });

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      user.lastLoginAt = new Date();
      await user.save();

      resetAccountHits(email);
      await audit(req, 'REGISTER', { userId: user._id, email, role: user.role });

      res.status(201).json({
        message: 'Investigation account created successfully.',
        token,
        user: user.toSafeObject(),
      });
    } catch (err) { next(err); }
  }
);

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login',
  ...authLimiterChain,
  ...authSchemas.login,
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !await user.comparePassword(password)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account deactivated.' });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      // Successful login — clear exponential backoff counter for this account
      resetAccountHits(email);

      user.lastLoginAt = new Date();
      await user.save();
      await audit(req, 'LOGIN', { userId: user._id });

      res.json({ token, user: user.toSafeObject() });
    } catch (err) { next(err); }
  }
);

// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', authenticate, authedLimiter, (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

module.exports = router;
