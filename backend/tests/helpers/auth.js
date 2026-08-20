let requestKey = 0;

async function getAdminToken(app) {
  requestKey += 1;
  const response = await require('supertest')(app)
    .post('/api/auth/login')
    .set('X-Rate-Limit-Test-Key', `auth-helper-${requestKey}`)
    .send({ username: process.env.ADMIN_USERNAME, password: process.env.TEST_ADMIN_PASSWORD });

  if (response.status !== 200) throw new Error('Unable to obtain a test admin token.');
  return response.body.token;
}

module.exports = { getAdminToken };
