const { ValidationError } = require('../utils/appError');

function validate(schema) {
  return (req, res, next) => {
    try {
      const dataToValidate = {
        body: req.body || {},
        query: req.query || {},
        params: req.params || {}
      };

      // If schema is a ZodObject containing body, query, or params
      const parsed = schema.safeParse(dataToValidate);

      if (!parsed.success) {
        const issues = parsed.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          rule: issue.code
        }));

        throw new ValidationError('Validation failed for incoming request.', issues);
      }

      // Assign parsed/coerced values back
      if (parsed.data.body) req.body = parsed.data.body;
      if (parsed.data.query) req.query = parsed.data.query;
      if (parsed.data.params) req.params = parsed.data.params;

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
