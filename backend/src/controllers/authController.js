const authService = require('../services/authService');
const mediaService = require('../services/mediaService');
const { successResponse } = require('../utils/apiResponse');
const config = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    return successResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Registration successful',
      201
    );
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Web Browser';
    const result = await authService.login(email, password, deviceInfo);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    return successResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
}

async function googleAuth(req, res, next) {
  try {
    const deviceInfo = req.headers['user-agent'] || 'Web Browser';
    const result = await authService.googleAuth(req.body, deviceInfo);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    return successResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Google authentication successful'
    );
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const rawRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const deviceInfo = req.headers['user-agent'] || 'Web Browser';
    const result = await authService.refreshSession(rawRefreshToken, deviceInfo);

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

    return successResponse(
      res,
      { user: result.user, accessToken: result.accessToken },
      'Token refreshed successfully'
    );
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    await authService.logout(rawRefreshToken);

    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return successResponse(res, user, 'Current user retrieved');
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const updateData = { ...req.body };
    
    // Process uploaded avatar if present
    if (req.file) {
      const avatarObj = await mediaService.processAndSaveImage(
        req.file.buffer,
        req.file.originalname,
        'avatars'
      );
      updateData.avatarUrl = avatarObj.url;
    }

    const updated = await authService.updateProfile(req.user.id, updateData);
    return successResponse(res, updated, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  getMe,
  updateMe
};
