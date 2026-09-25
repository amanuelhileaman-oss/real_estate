const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID Token.
 * Falls back to mock validation if in development and a mock token is provided.
 */
async function verifyIdToken(token) {
  // Allow a bypass for integration testing
  if (config.NODE_ENV !== 'production' && token.startsWith('mock-google-token:')) {
    const mockEmail = token.split(':')[1];
    return {
      sub: `mock-google-id-${mockEmail}`,
      email: mockEmail,
      email_verified: true,
      given_name: 'Mock',
      family_name: 'User',
      picture: 'https://via.placeholder.com/150',
    };
  }

  try {
    // If it's a JWT (has 3 parts separated by dots), verify it as an ID token
    if (token.split('.').length === 3) {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: config.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } else {
      // Otherwise, treat it as an access_token and fetch the user profile directly
      client.setCredentials({ access_token: token });
      const response = await client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo'
      });
      const data = response.data;
      
      return {
        sub: data.sub,
        email: data.email,
        email_verified: data.email_verified,
        given_name: data.given_name,
        family_name: data.family_name,
        picture: data.picture,
      };
    }
  } catch (error) {
    console.error('Google Auth Error Details:', error);
    // Include the actual error message so the user can see what's wrong
    const { UnauthorizedError } = require('../utils/appError');
    throw new UnauthorizedError(`Google Auth Failed: ${error.message}`);
  }
}

module.exports = {
  verifyIdToken,
};
