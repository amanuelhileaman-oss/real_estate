const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');
const googleAuthService = require('./googleAuthService');
const { UnauthorizedError, ConflictError, NotFoundError, BadRequestError } = require('../utils/appError');

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function register(userData) {
  const normalizedEmail = userData.email.toLowerCase().trim();
  const existing = await userRepository.findByEmail(normalizedEmail);
  if (existing) {
    throw new ConflictError('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(userData.password, 10);

  let user;
  if (userData.role === 'AGENT') {
    user = await userRepository.createAgent({
      ...userData,
      email: normalizedEmail,
      passwordHash
    });
  } else {
    user = await userRepository.createCustomer({
      ...userData,
      email: normalizedEmail,
      passwordHash
    });
  }

  delete user.password_hash;


  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await userRepository.storeRefreshToken(user.id, tokenHash, 'Web Browser', expiresAt);

  return {
    user,
    accessToken,
    refreshToken: rawRefreshToken
  };
}

async function login(email, password, deviceInfo = 'Web Browser') {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user || !user.password_hash) {
    throw new UnauthorizedError('Invalid email or password.');
  }


  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
  }

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await userRepository.storeRefreshToken(user.id, tokenHash, deviceInfo, expiresAt);

  // Strip password hash from returned user object
  delete user.password_hash;

  return {
    user,
    accessToken,
    refreshToken: rawRefreshToken
  };
}

async function googleAuth({ credential, role, phone, agencyName, licenseNumber, bio, action }, deviceInfo = 'Web Browser') {
  if (!credential) {
    throw new UnauthorizedError('Google credential is required.');
  }

  const payload = await googleAuthService.verifyIdToken(credential);
  if (!payload || !payload.email) {
    throw new UnauthorizedError('Invalid Google credential payload.');
  }

  const normalizedEmail = payload.email.toLowerCase().trim();
  let user = await userRepository.findByGoogleId(payload.sub);

  if (!user) {
    // Check if email exists to link account
    user = await userRepository.findByEmail(normalizedEmail);
    if (user) {
      if (action === 'register') {
        throw new ConflictError('An account with this email already exists. Please sign in instead.');
      }
      user = await userRepository.linkGoogleAccount(user.id, payload.sub);
    } else {
      if (action === 'login') {
        throw new UnauthorizedError('No account found for this Google email. Please sign up first.');
      }
      // New user signup
      if (role === 'AGENT' && (!agencyName || !licenseNumber)) {
        throw new BadRequestError('Agency Name and License Number are required for Agent registration.');
      }
      
      const firstName = payload.given_name || 'Google';
      const lastName = payload.family_name || 'User';

      if (role === 'AGENT') {
        user = await userRepository.createAgent({
          email: normalizedEmail,
          firstName,
          lastName,
          phone,
          agencyName,
          licenseNumber,
          bio,
          googleId: payload.sub,
          authProvider: 'GOOGLE'
        });
      } else {
        user = await userRepository.createCustomer({
          email: normalizedEmail,
          firstName,
          lastName,
          phone,
          googleId: payload.sub,
          authProvider: 'GOOGLE'
        });
      }
    }
  }

  if (!user.is_active) {
    throw new UnauthorizedError('Your account has been deactivated. Please contact support.');
  }

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await userRepository.storeRefreshToken(user.id, tokenHash, deviceInfo, expiresAt);

  delete user.password_hash;

  return {
    user,
    accessToken,
    refreshToken: rawRefreshToken
  };
}

async function refreshSession(rawRefreshToken, deviceInfo = 'Web Browser') {
  if (!rawRefreshToken) {
    throw new UnauthorizedError('Refresh token required.');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await userRepository.findRefreshToken(tokenHash);

  if (!storedToken) {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  // Revoke the old token (token rotation)
  await userRepository.revokeRefreshToken(tokenHash);

  const user = await userRepository.findById(storedToken.user_id);
  if (!user || !user.is_active) {
    throw new UnauthorizedError('User is no longer active.');
  }

  const newAccessToken = generateAccessToken(user);
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await userRepository.storeRefreshToken(user.id, newTokenHash, deviceInfo, expiresAt);

  return {
    user,
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken
  };
}

async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await userRepository.revokeRefreshToken(tokenHash);
  }
}

async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found.');
  }
  return user;
}

async function updateProfile(userId, updateData) {
  return userRepository.updateProfile(userId, updateData);
}

module.exports = {
  register,
  login,
  googleAuth,
  refreshSession,
  logout,
  getProfile,
  updateProfile
};
