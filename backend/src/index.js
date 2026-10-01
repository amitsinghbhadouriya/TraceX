require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { publicLimiter } = require('./middleware/rateLimiter');

const authRoutes     = require('./routes/auth');
const datasetRoutes  = require('./routes/datasets');
const analysisRoutes = require('./routes/analysis');
const graphRoutes    = require('./routes/graph');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (tools, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', publicLimiter, (req, res) => res.json({ status: 'ok', service: 'tracex-backend' }));

// ── Routes (each applies its own tiered rate limiter: authed, upload, chat, analysis) ──
app.use('/api/auth',     authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/graph',    graphRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  const { seedAdminUser } = require('./utils/seeder');
  await seedAdminUser();
  app.listen(PORT, () => {
    console.log(`🚀 TraceX backend running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();

module.exports = app;
