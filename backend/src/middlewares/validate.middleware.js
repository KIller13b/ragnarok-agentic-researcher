const { ZodError } = require('zod');

/**
 * Factory that returns an Express middleware which validates
 * the incoming request against the given Zod schema.
 *
 * The schema should define the shape for `body`, `params`,
 * and/or `query` as needed.
 *
 * @param {import('zod').ZodSchema} schema
 */
const validate = (schema) => (req, _res, next) => {
  try {
    schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return _res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    next(err);
  }
};

module.exports = validate;
