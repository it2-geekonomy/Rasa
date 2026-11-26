# RASA, Roots to Rhythm (Next.js + Tailwind)

Festival site as **React / Next.js App Router** with **Tailwind CSS v4** and the same content as the 2026-11-25 handover.

## Run

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Page |
|------|------|
| `/` | Home |
| `/events`, `/events/fri`, `/events/sat`, `/events/sun` | Programme + Your plan |
| `/workshops` | Workshops |
| `/artists`, `/artists/[id]` | Artists |
| `/booking` | Tickets |
| `/exhibitions`, `/venue`, `/stalls` | Festival info |
| `/faq` | FAQ and policies |
| `/about`, `/team` | Why RASA, team |
| `/sponsors`, `/partners` | Sponsors, donations |

## Stack

- **UI**: Tailwind + tokens in `app/globals.css` and `lib/rasa/ui.ts`
- **Data**: `public/data/*.json` imported from `lib/rasa/catalog.ts`
- **Images**: `lib/rasa/img-map.ts` → `public/images/`
- **Fonts**: `public/fonts/` (linked in `app/globals.css`)
- **PDF**: `public/pdf/` (e.g. sponsorship proposal)
- **State**: “Your plan” in `localStorage` via `contexts/plan-context.tsx`
- **Motion**: Framer Motion (page transitions, scroll reveals, sheets) + GSAP on the home hero (`lib/rasa/motion.ts`, `components/rasa/motion/`)

## Content edits

Edit JSON under `public/data/` for programme, artists, FAQ, and policies. Add or replace photos under `public/images/` and register keys in `lib/rasa/img-map.ts` when needed.