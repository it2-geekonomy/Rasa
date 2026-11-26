# RASA, Roots to Rhythm

Festival site: **Next.js** (`frontend/`) + **NestJS API** (`backend/`).

## Run the site

From the repo root:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run the API (optional)

```bash
pnpm backend:dev
```

See [`backend/README.md`](backend/README.md) for Postgres, Prisma, and env setup.

## Layout

| Folder | What |
|--------|------|
| `frontend/` | Next.js App Router (`app/`), `components/`, `contexts/`, `hooks/`, `lib/rasa/`, `public/` |
| `backend/` | NestJS + Prisma + PostgreSQL |

## Content edits

- Programme, artists, FAQ: `frontend/public/data/*.json` (loaded via `frontend/lib/rasa/catalog.ts`)
- Images: `frontend/public/images/`, keys in `frontend/lib/rasa/img-map.ts`
- Styles: `frontend/app/globals.css`, tokens in `frontend/lib/rasa/ui.ts`