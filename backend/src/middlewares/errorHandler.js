const { AppError } = require('../utils/appError');
const { errorResponse } = require('../utils/apiResponse');
const ERROR_CODES = require('../constants/errorCodes');
const logger = require('../utils/logger');
const config = require('../config/env');

function errorHandler(err, req, res, next) {
  // Handle known operational AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, {
        stack: err.stack,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
    } else {
      logger.warn(`${err.message} (${err.statusCode})`, {
        path: req.originalUrl,
        method: req.method
      });
    }
    return errorResponse(res, err.message, err.statusCode, err.errorCode, err.details);
  }

  logger.error(err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Handle PostgreSQL specific errors
  if (err.code === '23505') {
    // Unique violation
    return errorResponse(
      res,
      'A record with this unique field already exists.',
      409,
      ERROR_CODES.CONFLICT,
      err.detail
    );
  }

  if (err.code === '23503') {
    // Foreign key violation
    return errorResponse(
      res,
      'Referenced resource does not exist.',
      400,
      ERROR_CODES.BAD_REQUEST,
      err.detail
    );
  }

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid authentication token', 401, ERROR_CODES.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Authentication token has expired', 401, ERROR_CODES.UNAUTHORIZED);
  }

  // Generic unhandled exception
  const message = config.NODE_ENV === 'production' 
    ? 'An unexpected error occurred. Please try again later.' 
    : err.message;

  return errorResponse(
    res,
    message,
    500,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    config.NODE_ENV === 'development' ? err.stack : null
  );
}

module.exports = errorHandler;
