const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const { getAdminToken } = require('./helpers/auth');

let initialCount;
let createdContactId;
let requestKey = 0;
let adminToken;

function validContact(overrides = {}) {
  return {
    name: 'Test User',
    email: 'TEST@EXAMPLE.COM',
    company: 'Test Company',
    service: 'web-design',
    message: 'This is a valid contact request for automated testing.',
    ...overrides,
  };
}

function contactRequest() {
  requestKey += 1;
  return request(app).post('/api/contact').set('X-Rate-Limit-Test-Key', `contact-test-${requestKey}`);
}

beforeAll(async () => {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM contact_requests');
  initialCount = result.rows[0].count;
  adminToken = await getAdminToken(app);
});

afterAll(async () => {
  if (createdContactId) {
    await pool.query('DELETE FROM contact_requests WHERE id = $1', [createdContactId]);
  }
  await pool.end();
});

describe('Contact Requests API', () => {
  test('POST /api/contact creates and stores a valid contact request', async () => {
    const response = await contactRequest().send(validContact());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: expect.any(Number), message: 'Contact request received' });
    createdContactId = response.body.id;

    const count = await pool.query('SELECT COUNT(*)::int AS count FROM contact_requests');
    expect(count.rows[0].count).toBe(initialCount + 1);

    const stored = await pool.query('SELECT email FROM contact_requests WHERE id = $1', [createdContactId]);
    expect(stored.rows[0].email).toBe('test@example.com');
  });

  test('rejects public contact request listing', async () => {
    const response = await request(app).get('/api/contact');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  test('lists contact requests for an authenticated admin', async () => {
    const response = await request(app).get('/api/contact').set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: createdContactId,
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        service: 'web-design',
        message: 'This is a valid contact request for automated testing.',
        createdAt: expect.any(String),
      }),
    ]));
  });

  test('gets one contact request for an authenticated admin', async () => {
    const response = await request(app)
      .get(`/api/contact/${createdContactId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: createdContactId, email: 'test@example.com' });
  });

  test('returns 404 for an unknown contact request', async () => {
    const response = await request(app)
      .get('/api/contact/2147483647')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Contact request not found' });
  });

  test('rejects a missing name', async () => {
    const { name, ...withoutName } = validContact();
    const response = await contactRequest().send(withoutName);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('rejects an invalid email', async () => {
    const response = await contactRequest().send(validContact({ email: 'not-an-email' }));
    expect(response.status).toBe(400);
  });

  test('rejects a missing message', async () => {
    const { message, ...withoutMessage } = validContact();
    const response = await contactRequest().send(withoutMessage);
    expect(response.status).toBe(400);
  });

  test('rejects a message shorter than 10 characters', async () => {
    const response = await contactRequest().send(validContact({ message: 'Too short' }));
    expect(response.status).toBe(400);
  });

  test('rejects an invalid service', async () => {
    const response = await contactRequest().send(validContact({ service: 'unknown' }));
    expect(response.status).toBe(400);
  });

  test('rejects unsupported extra fields', async () => {
    const response = await contactRequest().send(validContact({ role: 'admin' }));
    expect(response.status).toBe(400);
    expect(response.body.details).toContain('Unexpected field: role.');
  });

  test('rejects an oversized JSON request body', async () => {
    const response = await contactRequest().send(validContact({ message: 'x'.repeat(11_000) }));
    expect(response.status).toBe(413);
  });

  test('returns 429 after the configured rate limit is exceeded', async () => {
    const key = 'contact-rate-limit-test';
    let response;
    for (let index = 0; index < 6; index += 1) {
      response = await request(app)
        .post('/api/contact')
        .set('X-Rate-Limit-Test-Key', key)
        .send(validContact({ message: 'short' }));
    }

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'Too many requests' });
  });

  test('deletes a contact request for an authenticated admin', async () => {
    const response = await request(app)
      .delete(`/api/contact/${createdContactId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(204);
    createdContactId = null;

    const count = await pool.query('SELECT COUNT(*)::int AS count FROM contact_requests');
    expect(count.rows[0].count).toBe(initialCount);
  });
});
