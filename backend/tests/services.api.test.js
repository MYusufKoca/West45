const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const { getAdminToken } = require('./helpers/auth');

let createdServiceId;
let adminToken;

function validService(overrides = {}) {
  return {
    nameTr: `API Test Hizmet ${Date.now()}`,
    nameEn: `API Test Service ${Date.now()}`,
    previewImageUrl: 'https://example.com/service.jpg',
    displayOrder: 9999,
    ...overrides,
  };
}

beforeAll(async () => {
  adminToken = await getAdminToken(app);
});

afterAll(async () => {
  if (createdServiceId) {
    await pool.query('DELETE FROM services WHERE id = $1', [createdServiceId]);
  }
  await pool.end();
});

describe('Services API', () => {
  test('GET /api/services returns the five seeded services', async () => {
    const response = await request(app).get('/api/services');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(5);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, nameEn: 'Social Media Management', displayOrder: 1 }),
    ]));
  });

  test('GET /api/services/:id returns an existing service', async () => {
    const response = await request(app).get('/api/services/1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 1, nameEn: 'Social Media Management' });
  });

  test('GET /api/services/:id returns 404 for a missing service', async () => {
    const response = await request(app).get('/api/services/2147483647');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Service not found' });
  });

  test('GET /api/services/:id returns 400 for an invalid id', async () => {
    const response = await request(app).get('/api/services/abc');

    expect(response.status).toBe(400);
  });

  test('POST /api/services creates a valid service', async () => {
    const response = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send(validService());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ nameEn: expect.stringMatching(/^API Test Service/), displayOrder: 9999 });
    createdServiceId = response.body.id;
  });

  test('POST /api/services rejects a missing nameTr', async () => {
    const { nameTr, ...withoutNameTr } = validService();
    const response = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send(withoutNameTr);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('POST /api/services rejects a missing nameEn', async () => {
    const { nameEn, ...withoutNameEn } = validService();
    const response = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send(withoutNameEn);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('POST /api/services rejects an invalid displayOrder', async () => {
    const response = await request(app).post('/api/services').set('Authorization', `Bearer ${adminToken}`).send(validService({ displayOrder: -1 }));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('PUT /api/services/:id updates an existing temporary service', async () => {
    const response = await request(app)
      .put(`/api/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validService({ nameTr: 'API Test Hizmet Güncel', nameEn: 'API Test Service Updated', displayOrder: 10000 }));

    expect(response.status).toBe(204);
  });

  test('PUT /api/services/:id returns 404 for a missing service', async () => {
    const response = await request(app)
      .put('/api/services/2147483647')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validService());

    expect(response.status).toBe(404);
  });

  test('DELETE /api/services/:id removes the temporary service', async () => {
    const response = await request(app).delete(`/api/services/${createdServiceId}`).set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(204);
    createdServiceId = undefined;
  });

  test('DELETE /api/services/:id returns 404 for a missing service', async () => {
    const response = await request(app).delete('/api/services/2147483647').set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });
});
