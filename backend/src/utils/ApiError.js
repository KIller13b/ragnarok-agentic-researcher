/**
 * Custom operational error class for the API.
 * Carries an HTTP status code so the centralized error handler
 * can set the correct response status.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code.
   * @param {string} message    - Human-readable error message.
   * @param {Array}  errors     - Optional array of field-level errors.
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
