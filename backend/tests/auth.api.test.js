const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const pool = require('../src/db/pool');
const { getAdminToken } = require('./helpers/auth');

let adminToken;
let createdProjectId;
let createdServiceId;
let createdContactId;
let requestKey = 0;

function loginRequest() {
  requestKey += 1;
  return request(app).post('/api/auth/login').set('X-Rate-Limit-Test-Key', `auth-test-${requestKey}`);
}

function validProject() {
  return {
    title: `Auth Test Project ${Date.now()}`,
    tag: 'AUTH / TEST', category: 'web', categoryLabelTr: 'AUTH TEST', categoryLabelEn: 'AUTH TEST',
    descriptionTr: 'Authentication testleri için geçici proje kaydı.',
    descriptionEn: 'Temporary project record for authentication tests.',
    imageUrl: 'https://example.com/auth-project.jpg', imageAlt: 'Auth test project',
    link: null, layout: 'wide', displayOrder: 9999,
  };
}

function validService() {
  return {
    nameTr: `Auth Test Hizmet ${Date.now()}`,
    nameEn: `Auth Test Service ${Date.now()}`,
    previewImageUrl: null,
    displayOrder: 9999,
  };
}

afterAll(async () => {
  if (createdProjectId) await pool.query('DELETE FROM projects WHERE id = $1', [createdProjectId]);
  if (createdServiceId) await pool.query('DELETE FROM services WHERE id = $1', [createdServiceId]);
  if (createdContactId) await pool.query('DELETE FROM contact_requests WHERE id = $1', [createdContactId]);
  await pool.end();
});

describe('Admin authentication', () => {
  test('POST /api/auth/login returns a token for valid credentials', async () => {
    const response = await loginRequest().send({
      username: process.env.ADMIN_USERNAME,
      password: process.env.TEST_ADMIN_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    adminToken = response.body.token;
  });

  test('rejects invalid credentials without revealing which field failed', async () => {
    const response = await loginRequest().send({ username: 'wrong-admin', password: 'wrong-password' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  test('rejects missing and malformed login requests', async () => {
    const missing = await loginRequest().send({ username: process.env.ADMIN_USERNAME });
    const malformed = await loginRequest().send([]);
    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
  });

  test('rejects unauthenticated Projects write requests', async () => {
    expect((await request(app).post('/api/projects').send(validProject())).status).toBe(401);
    expect((await request(app).put('/api/projects/1').send(validProject())).status).toBe(401);
    expect((await request(app).delete('/api/projects/1')).status).toBe(401);
  });

  test('rejects unauthenticated Services write requests', async () => {
    expect((await request(app).post('/api/services').send(validService())).status).toBe(401);
    expect((await request(app).put('/api/services/1').send(validService())).status).toBe(401);
    expect((await request(app).delete('/api/services/1')).status).toBe(401);
  });

  test('allows a valid Bearer token to create Projects and Services', async () => {
    const projectResponse = await request(app)
      .post('/api/projects').set('Authorization', `Bearer ${adminToken}`).send(validProject());
    const serviceResponse = await request(app)
      .post('/api/services').set('Authorization', `Bearer ${adminToken}`).send(validService());

    expect(projectResponse.status).toBe(201);
    expect(serviceResponse.status).toBe(201);
    createdProjectId = projectResponse.body.id;
    createdServiceId = serviceResponse.body.id;
  });

  test('rejects expired and invalid tokens', async () => {
    const expiredToken = jwt.sign({ sub: 'test-admin', role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: -1, issuer: 'west45-api', audience: 'west45-admin',
    });
    expect((await request(app).post('/api/projects').set('Authorization', `Bearer ${expiredToken}`).send(validProject())).status).toBe(401);
    expect((await request(app).post('/api/services').set('Authorization', 'Bearer invalid-token').send(validService())).status).toBe(401);
  });

  test('rate limits login attempts', async () => {
    const key = 'auth-rate-limit-test';
    let response;
    for (let index = 0; index < 6; index += 1) {
      response = await request(app).post('/api/auth/login').set('X-Rate-Limit-Test-Key', key)
        .send({ username: 'wrong-admin', password: 'wrong-password' });
    }
    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many requests' });
  });

  test('rate limiting distinguishes client IPs behind one trusted proxy hop', async () => {
    const originalTrustProxy = app.get('trust proxy');
    app.set('trust proxy', 1);

    try {
      const clientA = '198.51.100.10, 203.0.113.10';
      for (let index = 0; index < 6; index += 1) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', clientA)
          .send({ username: 'wrong-admin', password: 'wrong-password' });
        if (index === 5) expect(response.status).toBe(429);
      }

      const differentClient = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '198.51.100.11, 203.0.113.11')
        .send({ username: 'wrong-admin', password: 'wrong-password' });
      expect(differentClient.status).toBe(401);
    } finally {
      app.set('trust proxy', originalTrustProxy);
    }
  });

  test('keeps POST /api/contact public', async () => {
    const response = await request(app).post('/api/contact').set('X-Rate-Limit-Test-Key', 'auth-contact-test').send({
      name: 'Auth Test User', email: 'auth-contact@example.com', company: null,
      service: 'other', message: 'This contact endpoint remains public.',
    });
    expect(response.status).toBe(201);
    createdContactId = response.body.id;
  });
});
