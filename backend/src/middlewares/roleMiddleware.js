const { ForbiddenError } = require('../utils/appError');

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('User authentication required before role evaluation.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
