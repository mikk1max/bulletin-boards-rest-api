# REST API Дошки оголошень

REST API для дошки оголошень з JWT-автентифікацією, авторизацією та контролем доступу. Реалізовано в рамках курсового завдання магістратури.

## Загальний опис

Чистий JSON API без рендерингу HTML. Бекенд обслуговує клієнтів (React-застосунки, мобільні додатки тощо) через HTTP-запити.

Користувачі можуть публікувати, редагувати та видаляти власні оголошення. Анонімні відвідувачі бачать список оголошень і можуть переглядати деталі. Для створення оголошення потрібна реєстрація. Редагувати та видаляти можна лише власні оголошення.

Автентифікація — JWT з refresh токенами. Access token: 15 хвилин, refresh token: 7 днів. Token rotation для refresh токенів.

## Технологічний стек

| Технологія                     | Опис                            |
| ------------------------------ | ------------------------------- |
| Node.js                        | Середовище виконання            |
| Express 5                      | Веб-фреймворк                   |
| Prisma 7                       | ORM для бази даних (PostgreSQL) |
| Zod                            | Валідація вхідних даних         |
| bcrypt                         | Хешування паролів               |
| jsonwebtoken                   | JWT-автентифікація              |
| @asteasolutions/zod-to-openapi | Генерація OpenAPI документації  |
| swagger-ui-express             | Swagger UI                      |
| dotenv                         | Змінні середовища               |

## Встановлення

1. Встановіть залежності:

```bash
npm install
```

2. Створіть файл конфігурації:

```bash
cp .env.example .env
```

3. Налаштуйте `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/announcements?schema=public
JWT_SECRET=your-secret-key-at-least-256-bits-long
```

4. Застосуйте міграцію:

```bash
npm run prisma:migrate
```

5. Запустіть проект:

```bash
npm run dev
```

## Маршрути

### Auth

| Метод | Шлях             | Опис                          | Auth |
| ----- | ---------------- | ----------------------------- | ---- |
| POST  | `/auth/register` | Реєстрація користувача        | Ні   |
| POST  | `/auth/login`    | Вхід користувача              | Ні   |
| POST  | `/auth/refresh`  | Оновлення токенів             | Ні   |
| POST  | `/auth/logout`   | Вихід                         | Ні   |
| GET   | `/auth/me`       | Профіль поточного користувача | Так  |

### Оголошення

| Метод  | Шлях                 | Опис                                      | Auth |
| ------ | -------------------- | ----------------------------------------- | ---- |
| GET    | `/announcements`     | Список з пагінацією, пошуком, сортуванням | Ні   |
| GET    | `/announcements/:id` | Деталі оголошення                         | Ні   |
| POST   | `/announcements`     | Створення оголошення                      | Так  |
| PATCH  | `/announcements/:id` | Часткове оновлення (власне)               | Так  |
| DELETE | `/announcements/:id` | Видалення (власне)                        | Так  |

## Параметри запитів

### GET /announcements

| Параметр | Тип   | Опис                                            |
| -------- | ----- | ----------------------------------------------- |
| `search` | query | Пошук по назві (нечутливий до регістру)         |
| `sort`   | query | `newest` (за замовчуванням) або `oldest`        |
| `page`   | query | Номер сторінки (число > 0), 10 записів/сторінка |

### POST /auth/register

| Поле       | Вимоги                                  |
| ---------- | --------------------------------------- |
| `username` | рядок, обов'язковий, 3–30 символів      |
| `email`    | email, обов'язковий                     |
| `password` | рядок, обов'язковий, мінімум 6 символів |
| `name`     | рядок, обов'язковий, мінімум 2 символи  |

### POST /announcements

| Поле          | Вимоги                                                 |
| ------------- | ------------------------------------------------------ |
| `title`       | рядок, обов'язковий, 5–50 символів                     |
| `description` | рядок, обов'язковий, мінімум 10 символів               |
| `price`       | число, обов'язкове, > 0                                |
| `category`    | рядок, обов'язковий: `sale`, `service`, `job`, `other` |

PATCH використовує ті ж правила валідації, але всі поля опціональні (хоча б одне має бути присутнє).

## Структура проекту

```
boilerplate/
├── prisma/
│   ├── schema.prisma
│   ├── client.ts
│   └── migrations/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── announcements.controller.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   └── validate.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── announcements.routes.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   └── announcements.validator.ts
│   └── openapi.ts
├── app.ts
├── .env.example
├── .env
├── package.json
├── tsconfig.json
├── prisma.config.ts
└── README.md
```

## Бойлерплейт

Мінімальний стартовий набір:

- `package.json` з усіма залежностями
- `tsconfig.json` з налаштуваннями TypeScript
- `src/openapi.ts` з ініціалізованим registry та `bearerAuth`
- `prisma/client.ts` з ініціалізованим Prisma Client (PostgreSQL через `@prisma/adapter-pg`)
- `prisma.config.ts` з конфігурацією Prisma
- `.env.example` з шаблоном змінних середовища

## Доступні скрипти

| Команда                   | Опис                                 |
| ------------------------- | ------------------------------------ |
| `npm run dev`             | Запуск з hot reload (`node --watch`) |
| `npm start`               | Запуск у виробничому режимі          |
| `npm run prisma:migrate`  | Створення та застосування міграцій   |
| `npm run prisma:generate` | Генерація Prisma Client              |

## Документація API

Swagger UI доступний за адресою: http://localhost:3000/api-docs

## Prisma schema

Три моделі: `User`, `RefreshToken`, `Announcement`.

- `User` — `username` (унікальний), хешований `password`, `email` (унікальний), `name`, `createdAt`
- `RefreshToken` — `token` (унікальний), зв'язок з `User`
- `Announcement` — `title`, `description`, `price`, `category`, зв'язок з `User`, `createdAt`, `updatedAt`

## Ліцензія

ISC
