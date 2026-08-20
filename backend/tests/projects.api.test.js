const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const { getAdminToken } = require('./helpers/auth');

let createdProjectId;
let adminToken;

function validProject(overrides = {}) {
  return {
    title: `API Test Project ${Date.now()}`,
    tag: 'API / TEST',
    category: 'web',
    categoryLabelTr: 'API TEST',
    categoryLabelEn: 'API TEST',
    descriptionTr: 'Projects API otomatik testi için oluşturulmuş geçici kayıt.',
    descriptionEn: 'Temporary record created for the Projects API automated test.',
    imageUrl: 'https://example.com/project.jpg',
    imageAlt: 'Temporary API test project image',
    link: 'https://example.com/project',
    layout: 'wide',
    displayOrder: 9999,
    ...overrides,
  };
}

beforeAll(async () => {
  adminToken = await getAdminToken(app);
});

afterAll(async () => {
  if (createdProjectId) {
    await pool.query('DELETE FROM projects WHERE id = $1', [createdProjectId]);
  }
  await pool.end();
});

describe('Projects API', () => {
  test('GET /api/projects returns the seeded project array', async () => {
    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, title: 'RL FENNEC', displayOrder: 1 }),
    ]));
  });

  test('GET /api/projects/:id returns an existing project', async () => {
    const response = await request(app).get('/api/projects/1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 1, title: 'RL FENNEC' });
  });

  test('GET /api/projects/:id returns 404 for a missing project', async () => {
    const response = await request(app).get('/api/projects/2147483647');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Project not found' });
  });

  test('GET /api/projects/:id returns 400 for an invalid id', async () => {
    const response = await request(app).get('/api/projects/abc');

    expect(response.status).toBe(400);
  });

  test('POST /api/projects creates a valid project', async () => {
    const response = await request(app).post('/api/projects').set('Authorization', `Bearer ${adminToken}`).send(validProject());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: expect.stringMatching(/^API Test Project/), displayOrder: 9999 });
    createdProjectId = response.body.id;
  });

  test('POST /api/projects rejects an invalid category', async () => {
    const response = await request(app).post('/api/projects').set('Authorization', `Bearer ${adminToken}`).send(validProject({ category: 'other' }));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('POST /api/projects rejects a missing title', async () => {
    const { title, ...withoutTitle } = validProject();
    const response = await request(app).post('/api/projects').set('Authorization', `Bearer ${adminToken}`).send(withoutTitle);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('POST /api/projects rejects an invalid layout', async () => {
    const response = await request(app).post('/api/projects').set('Authorization', `Bearer ${adminToken}`).send(validProject({ layout: 'square' }));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('POST /api/projects rejects an unsafe link scheme', async () => {
    const response = await request(app).post('/api/projects').set('Authorization', `Bearer ${adminToken}`).send(validProject({ link: 'javascript:alert(1)' }));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('PUT /api/projects/:id updates an existing project', async () => {
    const response = await request(app)
      .put(`/api/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validProject({ title: 'API Test Project Updated', displayOrder: 10000 }));

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
  });

  test('PUT /api/projects/:id returns 404 for a missing project', async () => {
    const response = await request(app)
      .put('/api/projects/2147483647')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validProject());

    expect(response.status).toBe(404);
  });

  test('DELETE /api/projects/:id removes the temporary project', async () => {
    const response = await request(app).delete(`/api/projects/${createdProjectId}`).set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(204);
    createdProjectId = undefined;
  });

  test('DELETE /api/projects/:id returns 404 for a missing project', async () => {
    const response = await request(app).delete('/api/projects/2147483647').set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });
});
