const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-not-used-in-production';
process.env.ADMIN_USERNAME = 'test-admin';
process.env.TEST_ADMIN_PASSWORD = 'test-only-password';
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.TEST_ADMIN_PASSWORD, 10);
process.env.ALLOWED_ORIGINS = 'http://localhost:5500';
