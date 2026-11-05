# Bulletin Board REST API

A pure JSON REST API for a bulletin board. Anyone can browse announcements; registered users can create announcements and edit or delete their own.

Authentication uses JWT: a 15-minute access token and a 7-day refresh token. Refresh tokens are stored in the database and rotated every time they are used.

Production features:

- **Security**: helmet headers, CORS limited to `ALLOWED_ORIGINS`, and a rate limit of 10 requests per 15 minutes per IP on `/auth` routes
- **Logging**: pino with pino-http logs every request, plus key events (registration, login, announcement changes, image uploads)
- **Images**: announcements accept an optional image via `multipart/form-data`. It is stored temporarily in `uploads/`, uploaded to Cloudinary, then deleted from disk. Only the Cloudinary URL is saved.
- **Tests**: Vitest unit and integration tests

## Tech stack

Node.js, Express 5, Prisma 7 (PostgreSQL), Zod, bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, pino, multer, Cloudinary, `@asteasolutions/zod-to-openapi`, Swagger UI, Vitest, Supertest.

## Getting started

```bash
npm install                 # also generates the Prisma Client
cp .env.example .env        # then fill in the values
npm run db:up               # starts PostgreSQL in Docker
npm run prisma:deploy       # applies migrations
npm run dev
```

The API runs at http://localhost:3000. Swagger UI is at http://localhost:3000/api-docs.

### Environment variables

| Variable                | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                         |
| `JWT_SECRET`            | Secret for signing JWTs                              |
| `ALLOWED_ORIGINS`       | Comma-separated list of origins allowed by CORS      |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                                |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                                   |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                                |
| `PORT`                  | Server port (default `3000`)                         |
| `LOG_LEVEL`             | pino log level (default `info`)                      |

## Endpoints

### Auth

| Method | Path             | Description                          | Auth |
| ------ | ---------------- | ------------------------------------ | ---- |
| POST   | `/auth/register` | Register and receive a token pair    | No   |
| POST   | `/auth/login`    | Log in and receive a token pair      | No   |
| POST   | `/auth/refresh`  | Exchange a refresh token (rotation)  | No   |
| POST   | `/auth/logout`   | Invalidate the current refresh token | Yes  |
| GET    | `/auth/me`       | Current user's profile               | Yes  |

### Announcements

| Method | Path                 | Description                            | Auth        |
| ------ | -------------------- | -------------------------------------- | ----------- |
| GET    | `/announcements`     | List with pagination, search, sorting  | No          |
| GET    | `/announcements/:id` | Get a single announcement              | No          |
| POST   | `/announcements`     | Create an announcement                 | Yes         |
| PATCH  | `/announcements/:id` | Partially update an announcement       | Yes (owner) |
| DELETE | `/announcements/:id` | Delete an announcement                 | Yes (owner) |

Query parameters for `GET /announcements`:

| Parameter | Description                                        |
| --------- | -------------------------------------------------- |
| `search`  | Case-insensitive substring match on `title`        |
| `sort`    | `newest` (default) or `oldest`                     |
| `page`    | Page number, starting at 1 (10 items per page)     |

Protected routes expect an `Authorization: Bearer <accessToken>` header.

## Validation

| Field         | Rules                                     |
| ------------- | ----------------------------------------- |
| `username`    | string, 3–30 characters                   |
| `email`       | valid email                               |
| `password`    | string, at least 6 characters             |
| `name`        | string, at least 2 characters             |
| `title`       | string, 5–50 characters                   |
| `description` | string, at least 10 characters            |
| `price`       | number greater than 0                     |
| `category`    | one of `sale`, `service`, `job`, `other`  |

`PATCH /announcements/:id` uses the same rules with every field optional, but the body can't be empty (an image alone is enough).

## Image upload

`POST /announcements` and `PATCH /announcements/:id` accept `multipart/form-data` with an optional `image` field (JPEG, PNG, WebP or GIF, up to 5 MB). JSON bodies still work for requests without an image.

```bash
curl -X POST http://localhost:3000/announcements \
  -H "Authorization: Bearer <accessToken>" \
  -F title="Selling a bicycle" \
  -F description="Trek in great condition, frame size L" \
  -F price=8500 \
  -F category=sale \
  -F image=@bike.jpg
```

## Tests

```bash
npm test          # watch mode
npm run test:run  # single run
```

Tests use Supertest against the Express app with Prisma and Cloudinary mocked, so no database or Cloudinary account is needed. They cover token generation, password hashing, registration and login, helmet headers, CORS, rate limiting, image uploads (including temp file cleanup) and ownership checks.

Validation errors return `400`:

```json
{
  "error": "Validation failed",
  "details": { "body": ["title: Too small: expected string to have >=5 characters"] }
}
```

## Project structure

```
├── prisma/
│   ├── schema.prisma
│   ├── client.ts
│   └── migrations/
├── src/
│   ├── controllers/
│   ├── middleware/      # authenticate, validate, upload (multer), rateLimit
│   ├── routes/          # routes + OpenAPI path registration
│   ├── utils/           # JWT and Cloudinary helpers
│   ├── validators/      # Zod schemas
│   ├── logger.ts        # pino logger
│   └── openapi.ts
├── tests/               # Vitest tests
├── uploads/             # temporary image storage
├── app.ts
├── vitest.config.ts
└── docker-compose.yml
```
