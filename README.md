# Bulletin Board REST API

A pure JSON REST API for a bulletin board. Anyone can browse announcements; registered users can create announcements and edit or delete their own.

Authentication uses JWT: a 15-minute access token and a 7-day refresh token. Refresh tokens are stored in the database and rotated every time they are used.

## Tech stack

Node.js, Express 5, Prisma 7 (PostgreSQL), Zod, bcrypt, jsonwebtoken, `@asteasolutions/zod-to-openapi`, Swagger UI.

## Getting started

```bash
npm install                 # also generates the Prisma Client
cp .env.example .env        # then set JWT_SECRET
npm run db:up               # starts PostgreSQL in Docker
npm run prisma:deploy       # applies migrations
npm run dev
```

The API runs at http://localhost:3000. Swagger UI is at http://localhost:3000/api-docs.

### Environment variables

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`   | Secret for signing JWTs      |
| `PORT`         | Server port (default `3000`) |

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

`PATCH /announcements/:id` uses the same rules with every field optional, but the body can't be empty.

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
│   ├── middleware/      # authenticate, validateBody/Params/Query
│   ├── routes/          # routes + OpenAPI path registration
│   ├── utils/tokens.ts  # JWT helpers
│   ├── validators/      # Zod schemas
│   └── openapi.ts
├── app.ts
└── docker-compose.yml
```
