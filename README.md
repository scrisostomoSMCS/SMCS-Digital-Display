# SMCS Website

Public-facing website for SMCS. Built with **Next.js (App Router)**,
**TypeScript**, and **Tailwind CSS**.

This is **Phase 1**: a clean, public home page only. No dashboard, login, or
database yet — those arrive in later phases.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server (hot reload)    |
| `npm run build` | Production build                     |
| `npm run start` | Run the production build             |
| `npm run lint`  | Lint with ESLint                     |

## Project structure

```
src/
  app/
    layout.tsx          Root layout — Header + NavBar + Footer on every page
    page.tsx            Home page (/)
    dashboard/page.tsx  "Coming soon" placeholder (real dashboard is Phase 2)
    globals.css         Tailwind + design tokens (palette, base font sizing)
  components/
    Header.tsx          SMCS name/logo placeholder
    NavBar.tsx          Top nav (includes Live Dashboard link)
    Footer.tsx          Site footer
    Section.tsx         Consistent content section wrapper
    ImageWithOverlay.tsx  Reusable image block with white-on-scrim overlay
  lib/                  Reserved for data layer (Supabase/Prisma) — empty for now
```

## Design rules

- White background, black text by default; large body text (18px min) and
  generous line spacing for high readability.
- Accent colors are **only** teal `#00aaa6` and blue `#0054a4`, used for
  borders, frames, highlights, buttons, and dividers.
- Flat and institutional: no gradients, glassmorphism, or heavy shadows.

## Images

Real images are added later. `ImageWithOverlay` currently renders neutral gray
placeholders. To drop in a real image, pass `src` and `alt`:

```tsx
<ImageWithOverlay src="/photo.jpg" alt="Description">
  <h3>Overlay heading</h3>
</ImageWithOverlay>
```

Add any external image host domains to `images.remotePatterns` in
`next.config.ts` when needed.

## Later phases

The `src/lib/` folder is reserved for Supabase/Prisma so they can be added
without restructuring. `.env.example` lists the variables they will need.
