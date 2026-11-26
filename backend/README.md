# RASA Backend API

Basic backend setup for RASA Festival built with **NestJS**, **Prisma ORM**, **PostgreSQL**, and **Swagger API docs** (following the architecture pattern of `hcg_foundation`).

---

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (TypeScript)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (Docker container included)
- **Documentation**: Swagger OpenAPI at `/api/docs`
- **Authentication**: JWT Bearer token guards

---

## Project Structure

```
backend/
├── docker-compose.yml       # PostgreSQL container
├── prisma/
│   ├── schema.prisma        # Database schema (User model, extensible)
│   ├── migrations/          # Pure SQL migration history files
│   └── seed.ts              # Initial admin seed script
├── src/
│   ├── common/              # Shared filters, interceptors, guards, prisma service
│   ├── config/              # Central configuration & env loader
│   ├── modules/
│   │   ├── auth/            # JWT login & auth endpoints
│   │   └── users/           # User management
│   ├── app.controller.ts    # Health check (/api/health)
│   ├── app.module.ts        # Root module
│   └── main.ts              # Server bootstrap with Swagger & validation
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pnpm install
# or npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` (already done by default):

```env
PORT=6060
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rasa_db?schema=public
AUTH_JWT_SECRET=rasa-fest-secret-key-change-in-production-2026
```

### 3. Start PostgreSQL (Docker)

```bash
docker compose up -d
```

### 4. Run Migrations & Seed Database

```bash
# Run existing migrations:
pnpm run prisma:migrate
# or: npx prisma migrate dev

# Seed initial admin user (admin@rasafest.org / Admin@123):
pnpm run seed
```

### 5. Start Development Server

```bash
pnpm run start:dev
```

- **API Base URL**: [http://localhost:6060/api](http://localhost:6060/api)
- **Health Check**: [http://localhost:6060/api/health](http://localhost:6060/api/health)
- **Swagger Docs**: [http://localhost:6060/api/docs](http://localhost:6060/api/docs)

---

## Database Migrations Guide (Prisma)

Unlike TypeORM (where you had to write separate `.entity.ts` classes for every table), in Prisma **all tables and fields are defined in one central file: `prisma/schema.prisma`**.

### How to Create a New Migration

Whenever you add or modify a table in `prisma/schema.prisma`:

#### Step 1: Update `prisma/schema.prisma`
Add your new model or modify existing fields:

```prisma
model Event {
  id        String   @id @default(uuid())
  title     String
  venue     String
  day       String
  createdAt DateTime @default(now())

  @@map("events")
}
```

#### Step 2: Run the Migration Command
In your terminal inside `backend/`:

```bash
npx prisma migrate dev --name <migration_name>
```

**Example:**
```bash
npx prisma migrate dev --name add_events_table
```

#### What Prisma does automatically:
1. Compares `schema.prisma` with your actual PostgreSQL database.
2. Generates a pure standard SQL file in:
   ```
   prisma/migrations/<timestamp>_add_events_table/migration.sql
   ```
3. Executes the SQL on your PostgreSQL database.
4. Automatically runs `prisma generate` to update your TypeScript types in `@prisma/client`.

---

### Migration Commands Summary

| Command | When to Use |
| :--- | :--- |
| **`npx prisma migrate dev --name <name>`** | **Create and apply a new migration** during development. |
| **`npx prisma migrate deploy`** | **Run pending migrations in production / CI/CD** (equivalent to `typeorm migration:run`). |
| **`npx prisma migrate status`** | Check if all migrations are applied or if any are pending. |
| **`npx prisma db push`** | Quick prototype sync to DB **without** creating migration files. |
| **`npx prisma studio`** | Opens a browser UI at `http://localhost:5555` to view and edit database rows visually. |
