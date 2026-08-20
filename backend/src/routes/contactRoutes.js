const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { submitContactRequest } = require('../controllers/contactController');

const router = express.Router();
const windowMs = Number.parseInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS, 10) || 60_000;
const limit = Number.parseInt(process.env.CONTACT_RATE_LIMIT_MAX, 10) || 5;

const contactRateLimiter = rateLimit({
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

router.post('/', contactRateLimiter, submitContactRequest);

module.exports = router;
