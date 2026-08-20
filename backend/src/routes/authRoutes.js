const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { login } = require('../controllers/authController');

const router = express.Router();
const windowMs = Number.parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 900_000;
const limit = Number.parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5;

const loginRateLimiter = rateLimit({
  windowMs,
  limit,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.NODE_ENV === 'test') {
      return req.get('X-Rate-Limit-Test-Key') || ipKeyGenerator(req.ip);
    }
    return ipKeyGenerator(req.ip);
  },
  handler: (req, res) => res.status(429).json({ error: 'Too many requests' }),
});

router.post('/login', loginRateLimiter, login);

module.exports = router;
