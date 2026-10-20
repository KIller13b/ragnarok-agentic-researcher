const ApiError = require('../utils/ApiError');

/**
 * Catch-all for routes that don't match any handler.
 */
const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
