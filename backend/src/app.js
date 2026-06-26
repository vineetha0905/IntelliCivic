const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const issueRoutes = require('./routes/issues');
const adminRoutes = require('./routes/admin');
const employeeRoutes = require('./routes/employee');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');

// Import database connection
const connectDB = require('./config/database');

// Import escalation job
const escalationJob = require('./jobs/escalationJob');
// Import cleanup job
const cleanupJob = require('./jobs/cleanupJob');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Start auto-escalation cron job
if (process.env.NODE_ENV !== 'test') {
  escalationJob.start();
}

// Start cleanup cron job (deletes resolved issues after 5 days)
if (process.env.NODE_ENV !== 'test') {
  cleanupJob.start();
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
// Allow:
// - Explicit origins from CORS_ORIGIN env (comma-separated)
// - Any Vercel deployment (*.vercel.app) so previews work without manual updates
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser / same-origin requests with no Origin header
    if (!origin) return callback(null, true);

    try {
      const hostname = new URL(origin).hostname;

      if (
        allowedOrigins.includes(origin) ||        // exact matches from env
        hostname.endsWith('.vercel.app')          // any Vercel deployment
      ) {
        return callback(null, true);
      }
    } catch (e) {
      // If origin parsing fails, fall through to reject below
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting (configurable and disabled in development unless forced on)
const enableRateLimit = (process.env.ENABLE_RATE_LIMIT ?? 'true') !== 'false' && process.env.NODE_ENV !== 'development';

if (enableRateLimit) {
  // General limiter for all API routes
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // default: 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 500, // default: 500 requests per window per IP
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Stricter limiter for OTP endpoints to avoid SMS/OTP abuse while keeping general traffic freer
  const otpLimiter = rateLimit({
    windowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS, 10) || 10 * 60 * 1000, // default: 10 minutes
    max: parseInt(process.env.OTP_RATE_LIMIT_MAX, 10) || 10, // default: 10 OTP requests per window per IP
    message: {
      success: false,
      message: 'Too many OTP requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth/send-otp', otpLimiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'IntelliCivic API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to IntelliCivic API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      issues: '/api/issues',
      admin: '/api/admin',
      upload: '/api/upload',
      notifications: '/api/notifications'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
