const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const db = require('./config/db');
const logger = require('./utils/logger');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./utils/appError');
const { successResponse } = require('./utils/apiResponse');
const { ensureSuperAdmin } = require('./utils/adminInit');


const app = express();

// 1. Security & HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// 2. CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Normalize allowed origins: trim spaces and remove trailing slashes
      const allowedOrigins = config.CORS_ORIGIN.map(o => o.trim().replace(/\/$/, ''));
      
      // Allow requests with no origin (like mobile apps, curl, postman) or matching whitelist
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        if (config.NODE_ENV === 'production') {
          callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
        } else {
          callback(null, true); // Permissive in development
        }
      }
    },
    credentials: true
  })
);

// 3. Body Parsing & Cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. HTTP Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 5. Serve Uploaded Media
app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));

// 6. Global Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  }
});
app.use('/api/', generalLimiter);

// 7. Health Check
app.get(['/health', '/api/v1/health'], async (req, res) => {
  try {
    const dbCheck = await db.query('SELECT 1 as live, PostGIS_Version() as postgis_ver');
    return successResponse(
      res,
      {
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: 'Connected',
        postgis: dbCheck.rows[0].postgis_ver
      },
      'Platform API is healthy'
    );
  } catch (err) {
    return res.status(503).json({
      status: 'DOWN',
      database: 'Disconnected',
      error: err.message
    });
  }
});

// 8. API Routes
app.use('/api/v1', apiRoutes);

// 9. 404 Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found.`));
});

// 10. Global Error Handler
app.use(errorHandler);

// Start server
const PORT = config.PORT || 5000;
const server = app.listen(PORT, async () => {
  try {
    await ensureSuperAdmin();
  } catch (err) {
    logger.error('Failed to initialize super admin on startup:', err);
  }

  console.log(`\n======================================================`);
  console.log(`🚀 Real Estate Platform API is ACTIVE & LISTENING`);
  console.log(`👉 Backend URL: http://localhost:${PORT}`);
  console.log(`👉 Health Check: http://localhost:${PORT}/health`);
  console.log(`💡 The server is running and waiting for requests.`);
  console.log(`   (Keep this terminal open! Press Ctrl+C only to stop)`);
  console.log(`======================================================\n`);
});


server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use by another running process!`);
    process.exit(1);
  } else {
    logger.error('Server encountered an error:', err);
    process.exit(1);
  }
});

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down gracefully...', { error: err.message, stack: err.stack });
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
