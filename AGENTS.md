# AGENTS.md

## Application

SMCS is the public website and digital scheduling application for Saint Mary's Community Services. It provides:

- a public home page and real-time Live Calendar (`/dashboard`) for wall displays and phones;
- an auto-rotating public Digital Schedule (`/information`);
- a signed-in user's personal schedule (`/schedule`);
- staff tools for events, information content, and custom slides (`/manage`);
- an admin-only user and role manager (`/admin`).

The app uses Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS 4, and Supabase Auth/Postgres/Realtime/Storage. Major UI dependencies are FullCalendar, Framer Motion, and Lucide React.

## Repository Map

- `src/app/`: App Router pages and layouts. `(site)` supplies shared header/navigation/footer; `/dashboard`, `/information`, and `/admin` intentionally use standalone full-screen layouts.
- `src/components/`: shared UI plus feature folders for `admin`, `auth`, `calendar`, `dashboard`, `information`, `manage`, and `schedule`.
- `src/lib/`: Supabase browser/server clients, query and mutation functions, shared types, display configuration, and static fallback content.
- `supabase/migrations/`: ordered SQL schema, RLS, Realtime, RPC, and Storage changes. These files are the database source of truth.
- `public/`: checked-in site images.
- `docs/`: screenshots and the Supabase confirmation-email template.
- `src/app/globals.css`: Tailwind import, design tokens, base accessibility rules, and scoped FullCalendar/display styling.

## Local Development

No Node version is pinned in this repository. Use the committed npm lockfile:

```sh
npm ci
```

The current application requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Use `.env.example` only as a name template and supply values locally; never commit or print them.

```sh
npm run dev
```

The development server uses Next.js's default local URL, `http://localhost:3000`.

## Verification Commands

```sh
npm run lint
npm run build
npm run start
```

- `npm run lint` runs the configured Next.js ESLint checks. It currently passes, but Next.js reports that `next lint` is deprecated for a future major version.
- `npm run build` creates the production build and runs Next.js lint/type validation; it currently passes.
- `npm run start` serves an existing production build.
- There is no test script, test suite, or standalone type-check script. Do not invent commands for them; use `npm run build` for the available type validation.

## Deployment

This is a standard Next.js application and can be deployed on Vercel with `npm run build`. There is no `vercel.json` or other checked-in Vercel project configuration, so do not assume custom redirects, regions, build settings, or a linked Vercel project. Configure the two required public Supabase environment variables in each deployment environment without exposing their values.

Database deployment is separate from the web deployment. Apply `supabase/migrations/*.sql` to Supabase in numeric order; the migration comments currently direct maintainers to the Supabase SQL Editor. RLS is the authorization boundary, Realtime publications drive live updates, and migration `0008` creates the public `slide-images` Storage bucket and its staff-write policies.

## Architecture And Conventions

- Keep Server Components as the default. Add `"use client"` only for browser state, effects, Supabase browser calls, or interactive third-party UI.
- Use `@/` imports for code under `src`. Keep shared non-UI behavior and Supabase access in `src/lib` rather than embedding queries in pages.
- Use `createSupabaseServerClient()` for server auth/role checks and the shared browser `supabase` client for client queries and Realtime. Never put a Supabase service-role key in browser code.
- Preserve middleware authentication for `/schedule`, `/manage`, and `/admin`, page-level role redirects, and database RLS. UI route guards are not substitutes for RLS.
- Preserve the shared calendar boundary: `DashboardEvent` is the UI contract, database rows are mapped from snake_case to camelCase in `src/lib`, `WeekCalendar` is presentational, and thin wrappers select public or personal data.
- Calendar times intentionally use UTC as a fixed wall clock. FullCalendar uses `timeZone="UTC"`; do not introduce local-time conversion without an explicit product decision and data migration plan.
- Keep Realtime subscriptions paired with cleanup and reload through the existing data-layer functions.
- Preserve the accessible, high-contrast visual system for an older audience. Reuse the Tailwind theme tokens in `globals.css` (`blue`, `teal`, `ink`, `paper`, `placeholder`), large base text, and scoped calendar classes instead of introducing unrelated colors or global overrides.
- Use FullCalendar for calendar behavior, Framer Motion for information-display transitions, and Lucide icons where the existing interface does.
- Add database changes as new, ordered, idempotent migrations. Preserve role checks and RLS policies; do not rewrite already-applied migration history.

## Known Unfinished Work

- The Live Calendar QR area is still `QrPlaceholder`; QR generation is not implemented.
- `dashboardConfig.ts` still contains placeholder announcement/contact-bar content.
- `informationContent.ts` identifies its built-in copy as sample/fallback content, although staff can override it through Supabase.
- Client self-registration and a staff/admin assignment path for personal `signups` are not implemented. The current database trigger allows only the configured staff email domain to create users.
- Some phase comments and documentation are stale: `.env.example` says Supabase variables are not yet needed, and `src/lib/README.md` references an older calendar component path. Trust current imports and implementation.
- The worktree was clean when this file was requested; there was no pre-existing uncommitted diff to preserve or document. Recent history primarily changes signup/login wording, the admin panel/sidebar, manage-page usability, and per-event colors.

## Working Style

* Prefer small, targeted changes over large rewrites.
* Preserve the existing architecture and coding style unless I explicitly request otherwise.
* Do not remove or replace working functionality without explaining why.
* Do not add unnecessary dependencies.
* Read existing related code before modifying it.
* Do not make assumptions when the answer can be determined from the repository.
* Run the relevant build, test, lint, or type-check commands after making changes when available.
* Clearly explain what files were changed and what was done.

## Git Rules

* Never run `git commit`.
* Never amend a commit.
* Never push to any remote.
* Never create, rename, switch, merge, or delete branches.
* Never run rebase, reset, cherry-pick, revert, or any command that modifies git history.
* Never stage files with `git add`.
* Never stash or delete uncommitted work.
* Never discard, overwrite, or revert changes that I made or that another coding agent made.
* I will personally review, stage, commit, and push all changes.

Codex may use only read-only git commands for context, including:

* `git status`
* `git diff`
* `git log`
* `git show`
* `git branch --show-current`

## Security Rules

* Never print, expose, copy, or commit secrets.
* Do not include values from `.env` files in responses or generated files.
* Do not modify environment variables unless I explicitly request it.
* Do not commit credentials, API keys, tokens, or private configuration.
* Do not expose private repository information outside this project.

## Development Server

The user manages the development server manually.

- Assume the application is already running at `http://localhost:3000`.
- Never run `npm run dev` or start a development server unless the user explicitly requests it.
- Never start a second development server on another port (3001, 3002, etc.).
- If `http://localhost:3000` is unavailable or unreachable, ask the user before attempting to start a server.
- When verifying UI changes, use the existing application running on `http://localhost:3000` whenever possible.
- You may run one-time verification commands such as `npm run build` and `npm run lint`, but do not leave any long-running background processes running.
- If you accidentally start a development server, stop it before completing the task.
