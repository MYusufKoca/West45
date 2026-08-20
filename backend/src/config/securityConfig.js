const requiredAuthVariables = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH'];

function parseAllowedOrigins(value) {
  if (!value) return [];
  return value.split(',').map((origin) => origin.trim()).filter(Boolean).filter((origin) => origin !== '*');
}

function validateEnvironment() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  const missingAuthVariables = requiredAuthVariables.filter((name) => !process.env[name]);
  if (process.env.NODE_ENV === 'production' && missingAuthVariables.length > 0) {
    throw new Error(`Missing required authentication environment variables: ${missingAuthVariables.join(', ')}`);
  }

  return {
    authConfigured: missingAuthVariables.length === 0,
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  };
}

const securityConfig = validateEnvironment();

module.exports = securityConfig;
