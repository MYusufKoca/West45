const apiUrl = process.env.API_PUBLIC_URL || 'http://localhost:3000';

const jsonContent = (schema) => ({ 'application/json': { schema } });
const response = (description, schema) => ({ description, ...(schema ? { content: jsonContent(schema) } : {}) });
const errorResponse = (description, example) => response(description, { $ref: '#/components/schemas/Error' });
const validationResponse = (description = 'Validation failed.') => response(description, { $ref: '#/components/schemas/ValidationError' });
const idParameter = (description) => ({ name: 'id', in: 'path', required: true, description, schema: { type: 'integer', minimum: 1 } });
const protectedSecurity = [{ bearerAuth: [] }];

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'West45 Backend API',
    version: '1.0.0',
    description: 'West45 public portfolio API and protected admin CRUD API.',
  },
  servers: [{ url: apiUrl, description: 'Configured API server (localhost by default)' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Projects', description: 'Portfolio projects' },
    { name: 'Services', description: 'Studio services' },
    { name: 'Contact', description: 'Public contact requests' },
    { name: 'Authentication', description: 'Admin authentication' },
  ],
  paths: {
    '/api/health': {
      get: { tags: ['Health'], summary: 'Check API health', responses: { 200: response('API is available.', { $ref: '#/components/schemas/Health' }) } },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'], summary: 'List projects',
        responses: { 200: response('Projects ordered by displayOrder.', { type: 'array', items: { $ref: '#/components/schemas/Project' } }), 500: errorResponse('Internal server error.') },
      },
      post: {
        tags: ['Projects'], summary: 'Create a project', security: protectedSecurity,
        requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/ProjectInput' }) },
        responses: { 201: response('Project created.', { $ref: '#/components/schemas/Project' }), 400: validationResponse(), 401: errorResponse('Unauthorized.'), 413: errorResponse('Payload too large.'), 500: errorResponse('Internal server error.') },
      },
    },
    '/api/projects/{id}': {
      get: {
        tags: ['Projects'], summary: 'Get a project', parameters: [idParameter('Positive project ID.')],
        responses: { 200: response('Project found.', { $ref: '#/components/schemas/Project' }), 400: errorResponse('Invalid project ID.'), 404: errorResponse('Project not found.'), 500: errorResponse('Internal server error.') },
      },
      put: {
        tags: ['Projects'], summary: 'Replace a project', security: protectedSecurity, parameters: [idParameter('Positive project ID.')],
        requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/ProjectInput' }) },
        responses: { 204: response('Project updated.'), 400: validationResponse(), 401: errorResponse('Unauthorized.'), 404: errorResponse('Project not found.'), 413: errorResponse('Payload too large.'), 500: errorResponse('Internal server error.') },
      },
      delete: {
        tags: ['Projects'], summary: 'Delete a project', security: protectedSecurity, parameters: [idParameter('Positive project ID.')],
        responses: { 204: response('Project deleted.'), 400: errorResponse('Invalid project ID.'), 401: errorResponse('Unauthorized.'), 404: errorResponse('Project not found.'), 500: errorResponse('Internal server error.') },
      },
    },
    '/api/services': {
      get: {
        tags: ['Services'], summary: 'List services',
        responses: { 200: response('Services ordered by displayOrder.', { type: 'array', items: { $ref: '#/components/schemas/Service' } }), 500: errorResponse('Internal server error.') },
      },
      post: {
        tags: ['Services'], summary: 'Create a service', security: protectedSecurity,
        requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/ServiceInput' }) },
        responses: { 201: response('Service created.', { $ref: '#/components/schemas/Service' }), 400: validationResponse(), 401: errorResponse('Unauthorized.'), 413: errorResponse('Payload too large.'), 500: errorResponse('Internal server error.') },
      },
    },
    '/api/services/{id}': {
      get: {
        tags: ['Services'], summary: 'Get a service', parameters: [idParameter('Positive service ID.')],
        responses: { 200: response('Service found.', { $ref: '#/components/schemas/Service' }), 400: errorResponse('Invalid service ID.'), 404: errorResponse('Service not found.'), 500: errorResponse('Internal server error.') },
      },
      put: {
        tags: ['Services'], summary: 'Replace a service', security: protectedSecurity, parameters: [idParameter('Positive service ID.')],
        requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/ServiceInput' }) },
        responses: { 204: response('Service updated.'), 400: validationResponse(), 401: errorResponse('Unauthorized.'), 404: errorResponse('Service not found.'), 413: errorResponse('Payload too large.'), 500: errorResponse('Internal server error.') },
      },
      delete: {
        tags: ['Services'], summary: 'Delete a service', security: protectedSecurity, parameters: [idParameter('Positive service ID.')],
        responses: { 204: response('Service deleted.'), 400: errorResponse('Invalid service ID.'), 401: errorResponse('Unauthorized.'), 404: errorResponse('Service not found.'), 500: errorResponse('Internal server error.') },
      },
    },
    '/api/contact': {
      post: {
        tags: ['Contact'], summary: 'Submit a contact request',
        description: 'Public endpoint. Default limit: 5 requests per minute per IP; configure with CONTACT_RATE_LIMIT_MAX and CONTACT_RATE_LIMIT_WINDOW_MS. Extra request fields are rejected.',
        requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/ContactInput' }) },
        responses: { 201: response('Contact request stored.', { $ref: '#/components/schemas/ContactCreated' }), 400: validationResponse(), 413: errorResponse('Payload too large.'), 429: errorResponse('Too many requests.'), 500: errorResponse('Internal server error.') },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'], summary: 'Log in as the administrator',
        description: 'Public endpoint. Default limit: 5 attempts per 15 minutes per IP; configure with LOGIN_RATE_LIMIT_MAX and LOGIN_RATE_LIMIT_WINDOW_MS.',
        requestBody: { required: true, content: jsonContent({ $ref: '#/components/schemas/LoginInput' }) },
        responses: { 200: response('Authenticated.', { $ref: '#/components/schemas/LoginSuccess' }), 400: validationResponse(), 401: errorResponse('Invalid credentials.'), 413: errorResponse('Payload too large.'), 429: errorResponse('Too many requests.'), 500: errorResponse('Internal server error.'), 503: errorResponse('Authentication is not configured.') },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Admin JWT obtained from POST /api/auth/login.' } },
    schemas: {
      Health: { type: 'object', required: ['status'], properties: { status: { type: 'string', example: 'ok' } } },
      Error: { type: 'object', required: ['error'], properties: { error: { type: 'string', example: 'Unauthorized' } } },
      ValidationError: { type: 'object', required: ['error', 'details'], properties: { error: { type: 'string', example: 'Validation failed' }, details: { type: 'array', items: { type: 'string' } } } },
      Project: {
        type: 'object', required: ['id', 'title', 'tag', 'category', 'categoryLabelTr', 'categoryLabelEn', 'descriptionTr', 'descriptionEn', 'imageUrl', 'imageAlt', 'link', 'layout', 'displayOrder'],
        properties: { id: { type: 'integer', example: 1 }, title: { type: 'string', maxLength: 120 }, tag: { type: 'string', maxLength: 120 }, category: { type: 'string', enum: ['web', 'branding', 'social'] }, categoryLabelTr: { type: 'string', maxLength: 60 }, categoryLabelEn: { type: 'string', maxLength: 60 }, descriptionTr: { type: 'string', maxLength: 600 }, descriptionEn: { type: 'string', maxLength: 600 }, imageUrl: { type: 'string', maxLength: 400 }, imageAlt: { type: 'string', maxLength: 200 }, link: { type: 'string', nullable: true, maxLength: 400, description: 'Optional http:, https:, or mailto: URL.' }, layout: { type: 'string', enum: ['wide', 'tall'] }, displayOrder: { type: 'integer', minimum: 0 } },
      },
      ProjectInput: {
        type: 'object', required: ['title', 'tag', 'category', 'categoryLabelTr', 'categoryLabelEn', 'descriptionTr', 'descriptionEn', 'imageUrl', 'imageAlt', 'layout', 'displayOrder'],
        properties: { title: { type: 'string', minLength: 2, maxLength: 120 }, tag: { type: 'string', minLength: 1, maxLength: 120 }, category: { type: 'string', enum: ['web', 'branding', 'social'] }, categoryLabelTr: { type: 'string', minLength: 1, maxLength: 60 }, categoryLabelEn: { type: 'string', minLength: 1, maxLength: 60 }, descriptionTr: { type: 'string', minLength: 1, maxLength: 600 }, descriptionEn: { type: 'string', minLength: 1, maxLength: 600 }, imageUrl: { type: 'string', minLength: 1, maxLength: 400 }, imageAlt: { type: 'string', minLength: 1, maxLength: 200 }, link: { type: 'string', nullable: true, maxLength: 400, description: 'When supplied, must use http:, https:, or mailto:.' }, layout: { type: 'string', enum: ['wide', 'tall'] }, displayOrder: { type: 'integer', minimum: 0 } },
      },
      Service: { type: 'object', required: ['id', 'nameTr', 'nameEn', 'previewImageUrl', 'displayOrder'], properties: { id: { type: 'integer', example: 1 }, nameTr: { type: 'string', maxLength: 120 }, nameEn: { type: 'string', maxLength: 120 }, previewImageUrl: { type: 'string', nullable: true, maxLength: 400 }, displayOrder: { type: 'integer', minimum: 0 } } },
      ServiceInput: { type: 'object', required: ['nameTr', 'nameEn', 'displayOrder'], properties: { nameTr: { type: 'string', minLength: 1, maxLength: 120 }, nameEn: { type: 'string', minLength: 1, maxLength: 120 }, previewImageUrl: { type: 'string', nullable: true, maxLength: 400, description: 'When supplied, must use http: or https:.' }, displayOrder: { type: 'integer', minimum: 0 } } },
      ContactInput: { type: 'object', additionalProperties: false, required: ['name', 'email', 'service', 'message'], properties: { name: { type: 'string', minLength: 2, maxLength: 80 }, email: { type: 'string', format: 'email', maxLength: 120 }, company: { type: 'string', nullable: true, minLength: 1, maxLength: 80 }, service: { type: 'string', enum: ['web-design', 'branding', 'social-media', 'other'] }, message: { type: 'string', minLength: 10, maxLength: 1000 } } },
      ContactCreated: { type: 'object', required: ['id', 'message'], properties: { id: { type: 'integer' }, message: { type: 'string', example: 'Contact request received' } } },
      LoginInput: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string', minLength: 1 }, password: { type: 'string', minLength: 1, description: 'Administrator password. Do not store this value in client code.' } } },
      LoginSuccess: { type: 'object', required: ['token'], properties: { token: { type: 'string', description: 'Short-lived admin JWT.' } } },
    },
  },
};

module.exports = openapiSpec;
