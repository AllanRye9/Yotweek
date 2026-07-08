# yotweek — Events & Business Directory Platform

yotweek connects people with shared interests and passions for exploration. It's built using
the same stack and patterns as the 3R-Elite marketplace (Next.js + TypeScript frontend,
Express + Prisma/PostgreSQL backend), re-scoped around **discovering, posting, and attending
events, tourism opportunities, and local businesses** — local or international, free or paid.
Everything unrelated (classifieds, real estate, jobs, general e‑commerce) has been removed.

## What's implemented

**1. Roles & posting permissions**
Registered users, companies, agents, and organizations can all sign up and submit listings
(`POST /api/events`, `POST /api/businesses`), each with an optional cover image + photo
gallery (see **"Images on listings"** below). Every submission is created with
`status: PENDING` and only becomes publicly visible once an admin approves it from `/const`.

**2. Admin panel — separate URL, separate login** (`/const`)
The admin panel lives at `/const`, not `/admin`, and has its own authentication flow that is
completely independent of the ordinary user login/register:

- `POST /api/auth/register` (ordinary sign-up) can **never** produce an `ADMIN` account,
  regardless of what's submitted — it's hard-restricted to `USER` / `AGENT` / `COMPANY` /
  `ORGANIZATION` server-side.
- `POST /api/auth/admin/setup` — a one-time bootstrap endpoint that creates the platform's
  first admin. It checks `prisma.user.count({ where: { role: "ADMIN" } })` and refuses (409)
  the moment one admin exists, so it can't be reused to mint extra admins later. The frontend
  page for this is `/const/register`; it calls `GET /api/auth/admin/exists` first and shows a
  "already set up, ask an existing admin" message instead of the form once an admin exists.
- `POST /api/auth/admin/login` — same credential check as ordinary login, but additionally
  rejects any account that isn't `role: ADMIN`, even with a correct password. The frontend
  page is `/const/login`, styled distinctly (dark "Admin Console" theme) so it's visually
  obvious you're not on the regular sign-in page.
- Once at least one admin exists, **more admins are created by promoting an existing user**
  from `/const/users` (role dropdown → `ADMIN`) — not by registering again.
- Every `/const/*` page is wrapped in `<AdminGuard>` (`frontend/components/AdminGuard.tsx`),
  which redirects signed-out visitors to `/const/login` and signed-in non-admins to `/`. The
  real security boundary is the backend, though: every `/api/admin/*` route requires a valid
  `ADMIN` bearer token via `requireAuth` + `requireRole("ADMIN")` middleware, so no admin data
  is ever served based on a client-side check alone.
- Admin pages: `/const` (overview), `/const/events` (approve/reject/hide/flagged queue),
  `/const/reports` (user reports), `/const/users` (search, verify organizers,
  suspend/reinstate, change role), `/const/highlights` (manage the homepage hero slideshow —
  add/edit/reorder/hide/remove slides).

**3. Images on listings**
Both the event and business listing forms (`/events/create`, `/businesses/create`) have a
"Photos" section (`frontend/components/ImageUrlInput.tsx`) with a cover image field (live
thumbnail preview) and a multi-photo gallery (add/remove, thumbnail grid). There's no file
storage wired up yet, so this takes direct **image URLs** — host on Cloudinary, S3, or any CDN
and paste the link — the same pattern already used for the admin hero slideshow. The backend
(`coverImageUrl` / `galleryUrls String[]` on both `Event` and `Business` in `schema.prisma`)
already supported these fields; only the forms were missing the inputs. Cover images show on
listing cards and at the top of the detail page; the gallery renders as a horizontal scroll
strip beneath the cover image. See **Suggested next steps** for wiring real file upload.

**4. Location detection & personalization**
The homepage and browse page ask the browser for GPS location (`navigator.geolocation`) via
`lib/geolocation.ts`, and store it so "Near you" results and distance badges use it. Users can
override this manually at any time with the location picker in the header of the homepage
(`LocationSelector`).

**5. yotweek-aligned features**
- **Destination Guides** — `/destinations`, curated write-ups plus live event counts per city
- **Itinerary Builder** — `/itinerary`, day-by-day trip planning with custom stops
- **Nearby Attractions** — `GET /api/itineraries/suggest-nearby` surfaces nearby approved
  listings by distance, for filling out an itinerary
- **Event Reminders** — hourly cron (`utils/reminderCron.ts`) creates an in-app notification
  ~24h before an event starts, for every confirmed attendee
- **Social Sharing** — WhatsApp / Facebook / X / copy-link on every event page
- **Ratings & Reviews** — one review per user per event, moderated before appearing publicly
- **Weather Integration** — `GET /api/weather` proxies Open-Meteo (no API key required) and is
  shown on every event's detail page
- **Language Support** — events carry a `languages` array; browse page can filter by language,
  and `next-intl` is included as a dependency to build out full UI translation from here

**6. Authenticity & spam detection** (`backend/src/utils/spamDetection.ts`)
- Suspicious-keyword scanning on every new listing
- Fuzzy duplicate detection (title similarity + same city + overlapping dates)
- Rate limiting on listing creation (both an IP-based `express-rate-limit` and a per-user
  "5 listings/hour" check)
- User-facing "Report" button on every listing (`POST /api/reports`), with an admin queue and
  automatic hide-pending-review once a listing collects 5+ reports
- Admin-granted "Verified organizer" badge (`isVerifiedOrganizer`) shown throughout the UI

**7. Landing page statistics** (`GET /api/stats/landing`, `components/StatsTicker.tsx`)
Total visitors, daily unique visitors (deduped via SHA-256-hashed IP, never storing raw IPs —
same pattern used in 3R-Elite's analytics), total events held, and active events.

**8. Payments for paid events** (`backend/src/routes/bookings.ts`)
Booking a paid event creates a `Payment` record with the total pre-split into a platform
commission and an organizer payout (`utils/commission.ts`, default 5%, configurable per
event). `POST /api/bookings/:id/confirm-payment` is the single integration point for a real
card/mobile-money provider's webhook — wire in Flutterwave/Pesapal/DPO/etc. there. Organizers
can see their running payout total on `/dashboard`.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind, mirrors 3R-Elite's frontend
  dependencies (`react-hook-form`, `zod`, `next-intl`, `date-fns`, etc.)
- **Backend**: Express + TypeScript + Prisma ORM + PostgreSQL, mirrors 3R-Elite's backend
  dependencies and middleware patterns (helmet, rate limiting, JWT auth, express-validator)

## Running it locally

```bash
# Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev      # creates the schema in your Postgres database
npx prisma db seed          # optional: adds an admin user + a sample event
npm run dev                 # http://localhost:4000

# Frontend
cd frontend
cp .env.example .env.local  # point NEXT_PUBLIC_API_URL at the backend above
npm install
npm run dev                 # http://localhost:3000
```

Seeded admin login: `admin@yotweek.com` / `Password123!` — sign in at **`/const/login`** (not
the regular `/auth/login`). If you skip the seed step, visit **`/const/register`** instead to
create the platform's first admin account (it locks itself the moment an admin exists).
Seeded organizer login: `organizer@example.com` / `Password123!` (regular `/auth/login`).

> Note: `prisma generate`'s query-engine binary can't be downloaded from a fully offline
> sandbox, so this repo's `npm run build` for the backend couldn't be run end-to-end here.
> To compensate, the initial `prisma/migrations/` SQL was hand-verified by running it against
> a real local PostgreSQL 16 instance (types, defaults, array columns, enums, unique
> constraints, and every foreign key were all confirmed to match `schema.prisma` exactly), and
> a Prisma+Express typing bug (implicit-`any` handler params caused by mixing an
> `express-validator` array with other route middleware) was found via an isolated compile
> test and fixed across all four affected routes. The frontend was built end-to-end with
> `npm run build` and compiles clean. Run `npm install && npx prisma generate` in your own
> environment (or let Railway's Docker build do it) to generate the Prisma Client.

## Suggested next steps

- Wire a real payment provider's checkout + webhook into `bookings.ts`
- Add real file upload (S3/Cloudflare R2 — 3R-Elite's `upload.ts` pattern is a good reference)
  to replace the current URL-paste image inputs on `/events/create` and `/businesses/create`
  with actual drag-and-drop uploads
- Build out full `next-intl` translations for the multilingual requirement
- Add map pins to the itinerary builder and event detail page (Google Maps/Mapbox)
- Push notifications (web push or a mobile app) for the event-reminder cron, which currently
  only creates in-app notifications

## Deploying to production

**Before your first deploy**: nothing extra needed — `prisma/migrations/20260703120000_init/`
already ships in this repo and has been verified against a real PostgreSQL 16 database. It's
applied automatically by `prisma migrate deploy`, which runs as part of the backend's
Dockerfile `CMD` on every boot (safe to re-run: it only applies migrations that haven't run
yet). If you later change `schema.prisma`, generate the follow-up migration yourself:

```bash
cd backend
cp .env.example .env   # point DATABASE_URL at a real Postgres instance
npm install
npx prisma migrate dev --name <describe_the_change>   # adds a new folder under prisma/migrations/
```

**Option A — Railway (recommended for this repo)**

This is a monorepo with two deployable services (`backend/`, `frontend/`) plus a database, so
you'll create three things in one Railway project:

1. **Database** — "New" → "Database" → "PostgreSQL". Railway provisions it and exposes a
   `DATABASE_URL`-shaped set of variables automatically.
2. **Backend service** — "New" → "GitHub Repo" (or "Empty Service" + Railway CLI), then in
   **Settings → Root Directory** set it to `backend`. Railway auto-detects `backend/Dockerfile`
   and `backend/railway.json` (builder + `/health` healthcheck are already configured). Set
   these variables on the service:
   - `DATABASE_URL` → reference the Postgres plugin's variable (`${{Postgres.DATABASE_URL}}`)
   - `JWT_SECRET` → a long random string
   - `FRONTEND_URL` → your frontend service's public URL (for CORS) — you can fill this in
     after step 3 once you know the URL, then redeploy
   - `PORT` is injected automatically by Railway; the app already reads `process.env.PORT`
   - On first deploy, the Dockerfile's `CMD` runs `prisma migrate deploy` before starting the
     server, applying the committed `prisma/migrations/` folder — no manual migration step
     needed.
3. **Frontend service** — same repo, **Settings → Root Directory** set to `frontend`. Railway
   auto-detects `frontend/Dockerfile` and `frontend/railway.json`. Set:
   - `NEXT_PUBLIC_API_URL` → your backend service's public URL + `/api` (e.g.
     `https://your-backend.up.railway.app/api`). This must be set as a **build-time** variable
     — Railway injects service variables into Dockerfile `ARG`s automatically, and
     `frontend/Dockerfile` already declares `ARG NEXT_PUBLIC_API_URL`, so no extra config is
     needed beyond setting the variable. Because Next.js inlines `NEXT_PUBLIC_*` vars into the
     client bundle at build time, changing this value later requires a redeploy (not just a
     restart).
4. Generate public domains for both services under **Settings → Networking → Generate Domain**,
   then go back and set `FRONTEND_URL` on the backend and `NEXT_PUBLIC_API_URL` on the frontend
   to the real generated URLs, and redeploy both.

**Alternative managed platforms**
- Frontend → Vercel (auto-detects Next.js; set `NEXT_PUBLIC_API_URL` in project env vars)
- Backend → Render / Fly.io (both can build straight from `backend/Dockerfile`; set
  `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`)
- Database → the managed Postgres add-on any of the above provide (or Neon/Supabase)

**Option B — self-hosted on one VPS with a single public domain**
```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD, JWT_SECRET, real domain
docker compose up -d --build
```
`docker-compose.yml` brings up Postgres, the backend (auto-runs migrations on boot), and the
frontend. Use `nginx/nginx.conf.example` as a single-point reverse proxy on `yotweek.com` so
the frontend is served at `/` and backend API calls are proxied to `/api`.
Obtain certificates for `yotweek.com` with `certbot --nginx -d yotweek.com`, or swap in
Caddy/Traefik if you prefer automatic HTTPS.

**Either way, before going live:**
- Set a strong, unique `JWT_SECRET`
- Set `FRONTEND_URL` on the backend to your real frontend domain (it's the CORS allow-list)
- Point `NEXT_PUBLIC_API_URL` at your real backend URL *before* building the frontend —
  it's inlined into the client bundle at build time, not read at runtime
- Take a Postgres backup schedule seriously (managed providers do this for you; on a VPS,
  `pg_dump` on a cron is the minimum)
- `.github/workflows/ci.yml` runs a typecheck + build on every push — wire your host's
  deploy hook (or a `docker build && docker push` step) onto the end of it once you're ready
  for continuous deployment
- **First-time admin access**: if you didn't run `npx prisma db seed`, visit
  `https://yourdomain.com/const/register` once, right after your first deploy, to create the
  platform's admin account. Do this promptly — anyone who gets there first becomes the admin,
  since the endpoint only checks "does an admin exist yet," not who's asking.

