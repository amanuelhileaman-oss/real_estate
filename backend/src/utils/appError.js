const ERROR_CODES = require('../constants/errorCodes');

class AppError extends Error {
  constructor(message, statusCode, errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, ERROR_CODES.BAD_REQUEST, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation Error', details = null) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, ERROR_CODES.UNAUTHORIZED);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_CODES.NOT_FOUND);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, ERROR_CODES.CONFLICT);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
