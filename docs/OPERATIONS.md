# Operations

## Environment variables (names only — never commit values)
`DATABASE_URL`, `DATABASE_POOL_MAX`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `SETUP_TOKEN`, `SUPERADMIN_EMAIL`, `APP_URL`, `CRON_SECRET`, optional `RESEND_API_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`, `AI_MODEL`. See `.env.example`. Use different secrets and databases for Preview and Production. Production refuses to start without `AUTH_SECRET` and `ENCRYPTION_KEY` (≥32 chars).

## Deploy to Vercel
1. Create a **Neon Postgres** database (or any managed PostgreSQL with point-in-time recovery) → `DATABASE_URL`.
2. Import the Git repository into Vercel. Set the environment variables above (Production and Preview).
3. `vercel.json` runs `npm run vercel-build` = **migrations → idempotent structural seed → build**. The seed never touches people or records and never overwrites edited programmes, policies or role permissions.
4. Add the domain in Vercel; set `APP_URL` to it (QR codes on certificates point here).
5. Deploy a Preview, open `/backend` and create the Super Admin (setup key = `SETUP_TOKEN`), enrol 2FA, then **remove `SETUP_TOKEN`**.
6. Promote to Production. Cron (`/api/v1/cron/maintenance`, daily) auto-submits lapsed exams and purges expired rows; Vercel sends `CRON_SECRET` automatically.
7. **Rollback**: Vercel → Deployments → promote the previous deployment. Database migrations are additive; for a destructive change write a reversible migration first.

## Migrations
`npm run db:generate` after editing `src/server/db/schema.ts`; commit the SQL in `drizzle/`; `npm run db:migrate` applies them (advisory-locked, safe under concurrent deploys). Hand-written constraints/triggers live in `drizzle/0001_integrity.sql`. Never change a production schema by hand.

## Backups & recovery
Use the managed database's automated backups and point-in-time recovery (enable on the Neon/Vercel Postgres plan). Quarterly: restore the latest backup into a scratch database, run `npm run db:migrate` and open the app against it to verify. Keep the `ENCRYPTION_KEY` safely — it protects 2FA secrets; without it, enrolled users must be reset. Private files live in the database (`assets` table) so they are covered by the same backups.

## Monitoring & health
`/api/v1/health` (public, `ok`/`degraded`), audit & security-event viewer in Admin, Vercel logs/observability for errors and performance. Wire an uptime monitor to `/api/v1/health` and an error tracker (e.g. Sentry) via the standard Next.js integration when the institution chooses one.

## Environments
Development (PGlite, seeded structure only), Testing (in-memory PGlite per test file), Staging (Vercel Preview + separate DB), Production. Never copy production data into development.

## Performance notes
Server-rendered, minimal client JS (forms, carousel, exam runner, editors only), one preload-free display font, system fonts for body text, WebP/optimised brand assets, `Cache-Control` on public images, static assets cached by the service worker, indexed queries, paginated/limited lists, settings cached for 15 s. Lessons are Markdown text; video is an optional link.
