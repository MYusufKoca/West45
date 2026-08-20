const jwt = require('jsonwebtoken');
const securityConfig = require('../config/securityConfig');

function requireAdminAuth(req, res, next) {
  if (!securityConfig.authConfigured) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const authorization = req.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'west45-api',
      audience: 'west45-admin',
    });
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAdminAuth };
