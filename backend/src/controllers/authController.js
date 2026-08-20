const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const securityConfig = require('../config/securityConfig');

function usernameMatches(username, expectedUsername) {
  const actual = Buffer.from(username);
  const expected = Buffer.from(expectedUsername);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

async function login(req, res) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || username.trim().length === 0 || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Validation failed', details: ['username and password are required.'] });
  }

  if (!securityConfig.authConfigured) {
    return res.status(503).json({ error: 'Authentication is not configured' });
  }

  try {
    const normalizedUsername = username.trim();
    const [isPasswordMatch, isUsernameMatch] = await Promise.all([
      bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH),
      Promise.resolve(usernameMatches(normalizedUsername, process.env.ADMIN_USERNAME)),
    ]);

    if (!isUsernameMatch || !isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: process.env.ADMIN_USERNAME, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: securityConfig.jwtExpiresIn, issuer: 'west45-api', audience: 'west45-admin' }
    );
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Admin login failed:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { login };
