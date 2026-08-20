require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const securityConfig = require('./config/securityConfig');
const openapiSpec = require('./docs/openapi');
const projectsRoutes = require('./routes/projectsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const contactRoutes = require('./routes/contactRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  hsts: process.env.NODE_ENV === 'production',
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || securityConfig.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  },
  credentials: false,
}));
app.use(express.json({ limit: '10kb' }));
app.get('/api/docs.json', (req, res) => res.status(200).json(openapiSpec));
app.get('/api/docs', swaggerUi.setup(openapiSpec, { customSiteTitle: 'West45 API Docs' }));
app.use('/api/docs', swaggerUi.serve);
app.use('/api/projects', projectsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }
  if (error.message === 'CORS origin denied') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  console.error('Unhandled application error:', error.message);
  return res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`West 45 backend listening on port ${port}`);
  });
}

module.exports = app;
