# lib/

Shared, non-UI code lives here (data access, clients, helpers).

Reserved for later phases — keep integrations isolated behind this folder so
pages/components stay decoupled from the data layer:

- `supabase.ts` — Supabase client (Phase: data)
- `prisma.ts` — Prisma client singleton (Phase: data)

Nothing here yet. Do not add Supabase/Prisma until their phase.
