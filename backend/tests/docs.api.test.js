const request = require('supertest');
const app = require('../src/app');

const documentedPaths = [
  '/api/health', '/api/projects', '/api/projects/{id}', '/api/services',
  '/api/services/{id}', '/api/contact', '/api/contact/{id}', '/api/auth/login',
];

describe('OpenAPI documentation', () => {
  test('GET /api/docs redirects to the canonical trailing-slash URL', async () => {
    const response = await request(app).get('/api/docs');

    expect(response.status).toBe(308);
    expect(response.headers.location).toBe('/api/docs/');
  });

  test('GET /api/docs/ serves Swagger UI and its static assets', async () => {
    const response = await request(app).get('/api/docs/');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);

    const assets = [
      'swagger-ui.css',
      'swagger-ui-bundle.js',
      'swagger-ui-standalone-preset.js',
      'swagger-ui-init.js',
    ];
    for (const asset of assets) {
      const assetResponse = await request(app).get(`/api/docs/${asset}`);
      expect(assetResponse.status).toBe(200);
    }
  });

  test('GET /api/docs.json serves an OpenAPI specification', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    documentedPaths.forEach((path) => expect(response.body.paths).toHaveProperty(path));
  });

  test('documents bearer authentication on protected admin endpoints', async () => {
    const response = await request(app).get('/api/docs.json');
    const paths = response.body.paths;

    expect(paths['/api/projects'].post.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/services/{id}'].delete.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/projects'].get.security).toBeUndefined();
    expect(paths['/api/contact'].post.security).toBeUndefined();
    expect(paths['/api/contact'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/contact/{id}'].get.security).toEqual([{ bearerAuth: [] }]);
  });
});
