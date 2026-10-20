const ApiError = require('../utils/ApiError');

/**
 * Centralized error-handling middleware.
 *
 * Handles:
 *  - ApiError (operational errors)
 *  - Mongoose ValidationError
 *  - Mongoose CastError (invalid ObjectId)
 *  - Duplicate key errors (code 11000)
 *  - Everything else (500 Internal Server Error)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // --- ApiError (our custom class) ---
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // --- Mongoose validation error ---
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // --- Mongoose CastError (e.g. bad ObjectId) ---
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      errors: [],
    });
  }

  // --- Duplicate key ---
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return res.status(409).json({
      success: false,
      message: `Duplicate value for: ${field}`,
      errors: [],
    });
  }

  // --- Fallback ---
  const isProduction = process.env.NODE_ENV === 'production';

  console.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    message: isProduction ? 'Internal server error' : err.message,
    errors: [],
  });
};

module.exports = errorHandler;
