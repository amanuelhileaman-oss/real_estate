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
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    throw new Error('Invalid Google credential');
  }
}

module.exports = {
  verifyIdToken,
};
