const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/db');
const { UnauthorizedError, ForbiddenError } = require('../utils/appError');

async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No token provided.');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token has expired.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }

    if (!decoded || !decoded.sub) {
      throw new UnauthorizedError('Invalid authentication token payload.');
    }

    // Verify user is active in database
    const userRes = await db.query(
      `SELECT id, email, role, first_name, last_name, is_active FROM users WHERE id = $1`,
      [decoded.sub]
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedError('User account associated with this token does not exist.');
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      throw new ForbiddenError('Your account has been deactivated. Please contact support.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Optional authentication (for endpoints that can serve both guests and logged-in users)
async function optionalAuthenticate(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        if (decoded && decoded.sub) {
          const userRes = await db.query(
            `SELECT id, email, role, first_name, last_name, is_active FROM users WHERE id = $1`,
            [decoded.sub]
          );
          if (userRes.rows.length > 0 && userRes.rows[0].is_active) {
            req.user = userRes.rows[0];
          }
        }
      } catch {
        // Silently continue as unauthenticated guest
      }
    }
  } catch {
    // Silently continue as unauthenticated guest
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate
};
