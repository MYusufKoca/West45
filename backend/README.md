# West45 Backend

Express, PostgreSQL, JWT-protected admin CRUD, OpenAPI documentation and the public portfolio API.

## Requirements

- Node.js 20 or newer
- PostgreSQL with a `west45` database

## Installation

```bash
cd backend
cp .env.example .env
npm install
```

Generate the admin password hash without echoing the password:

```bash
npm run auth:hash
```

Copy the printed hash into `ADMIN_PASSWORD_HASH` in `.env`.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3000`. |
| `API_PUBLIC_URL` | OpenAPI server URL; set to `https://west45.onrender.com` in production. Defaults to `http://localhost:3000`. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Long random secret used to sign admin tokens. |
| `JWT_EXPIRES_IN` | JWT lifetime; defaults to `15m`. |
| `ADMIN_USERNAME` | Single administrator username. |
| `ADMIN_PASSWORD_HASH` | bcrypt password hash, never plaintext. |
| `ALLOWED_ORIGINS` | Comma-separated browser-origin allowlist. No wildcard is accepted. |
| `CONTACT_RATE_LIMIT_MAX` | Contact attempts per rate-limit window; defaults to `5`. |
| `CONTACT_RATE_LIMIT_WINDOW_MS` | Contact rate-limit window; defaults to `60000`. |
| `LOGIN_RATE_LIMIT_MAX` | Login attempts per rate-limit window; defaults to `5`. |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Login rate-limit window; defaults to `900000`. |

`.env` is ignored by Git. In production, the application refuses to start without `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD_HASH`.

## Database

The API uses PostgreSQL through `pg`. Verify the configured connection with:

```bash
npm run db:check
```

## Migrations

Migrations are tracked in `schema_migrations` and can safely be re-run:

```bash
npm run db:migrate
```

## Seed

The seed imports the Phase 2 portfolio data. It updates existing matching records instead of creating duplicates:

```bash
npm run db:seed
```

## Development Server

```bash
npm run dev
```

The development URL is `http://localhost:3000` by default.

## API Documentation

- Swagger UI: `http://localhost:3000/api/docs/` (`/api/docs` redirects here)
- OpenAPI JSON: `http://localhost:3000/api/docs.json`

Swagger UI includes an **Authorize** button. Paste an admin JWT without the `Bearer` prefix; the UI sends it as `Authorization: Bearer <token>` for protected operations.

## Authentication

`POST /api/auth/login` accepts `username` and `password` and returns a short-lived JWT. Passwords are checked with bcrypt; the database has no user table in this phase.

The login route is public and rate-limited by IP (default: 5 attempts per 15 minutes). Login errors intentionally do not reveal whether the username or password was incorrect.

## Public Endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| GET | `/api/projects` | No | List projects |
| GET | `/api/projects/:id` | No | Get a project |
| GET | `/api/services` | No | List services |
| GET | `/api/services/:id` | No | Get a service |
| POST | `/api/contact` | No | Submit a contact request |
| POST | `/api/auth/login` | No | Obtain an admin JWT |

## Protected Endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/projects` | Bearer JWT | Create a project |
| PUT | `/api/projects/:id` | Bearer JWT | Replace a project |
| DELETE | `/api/projects/:id` | Bearer JWT | Delete a project |
| POST | `/api/services` | Bearer JWT | Create a service |
| PUT | `/api/services/:id` | Bearer JWT | Replace a service |
| DELETE | `/api/services/:id` | Bearer JWT | Delete a service |

## Contact API

`POST /api/contact` is intentionally public for the website form. It accepts plain-text form data, rejects unexpected fields, limits JSON bodies to 10 KB, and is rate-limited by IP (default: 5 requests per minute).

## Frontend Integration Contract

Phase 3.8 frontend integration uses only these public endpoints:

- `GET /api/projects`
- `GET /api/services`
- `POST /api/contact`

Visitors do not need a token for the two GET endpoints. Admin CRUD does not belong in the public website frontend.

## Testing

```bash
npm test
```

The suite uses Jest and Supertest. Test-created database records are removed after tests.

## Security

- Parameterized PostgreSQL queries
- Server-side validation and 10 KB JSON request limit
- Helmet security headers
- CORS origin allowlist via `ALLOWED_ORIGINS`; no `*` wildcard
- bcrypt password verification and short-lived JWTs
- Separate IP rate limits for contact and login; production trusts exactly one Render reverse-proxy hop for client IP detection
- Generic client-facing errors; internal details stay in server logs

## Production Notes

Set all secrets through the deployment environment, use HTTPS, configure `API_PUBLIC_URL=https://west45.onrender.com`, and configure `ALLOWED_ORIGINS` with exact production origins. The built-in rate limit store is suitable for one process; use a shared store such as Redis before horizontally scaling.
