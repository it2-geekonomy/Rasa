# RASA, Roots to Rhythm (Next.js + Tailwind)

Festival site rebuilt as a **React / Next.js App Router** project with **Tailwind CSS v4** and the same content as the 2026-11-25 handover.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes (real URLs, not hash links)

| Path | Page |
|------|------|
| `/` | Home |
| `/events`, `/events/fri`, `/events/sat`, `/events/sun` | Programme + Your plan |
| `/workshops` | Workshops |
| `/artists`, `/artists/[id]` | Artists (25 profiles, static) |
| `/booking` | Tickets |
| `/exhibitions`, `/venue`, `/stalls` | Festival info |
| `/faq` | FAQ and policies |
| `/about`, `/team` | Why RASA, team |
| `/sponsors`, `/partners` | Sponsors, donations |

## Stack

- **UI**: Tailwind utility classes + shared tokens in `lib/rasa/ui.ts` (`bg-plum`, `text-burg`, etc.)
- **Data**: JSON under `public/data/` loaded from `lib/rasa/catalog.ts` (same data as handover `data.js`)
- **Images**: `lib/rasa/img-map.ts` → `/public/images/`
- **State**: “Your plan” in `localStorage` via `contexts/plan-context.tsx`

Legacy static SPA files (`public/rasa.html`, `public/js/app.js`) remain for reference only; the live app does not use them.

## Content edits

- Events / artists / FAQ: edit JSON in `public/data/` or regenerate from `public/js/data.js` if you still maintain that file.
- Styles: `app/globals.css` (theme) and `lib/rasa/ui.ts` (shared class strings).