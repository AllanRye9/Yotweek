# Yotweek

**Promote active and engaging living.**

Yotweek is a community-driven SaaS platform for discovering, booking, and promoting events, local businesses, and tourism destinations — locally and internationally. Communities are the foundational building block: people organize around a place, an interest, or both, and events and businesses are surfaced inside that context, tailored by smart recommendations that improve the more you explore.

This is built as a full production platform, not a prototype: real authentication, a moderated content pipeline, real-time-feeling notifications, payment-ready bookings, an admin console with full operational control, and a scalable Next.js + Express + PostgreSQL architecture designed to grow.

---

## Table of contents

- [Overview](#overview)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Yotweek exists to make it effortless to find what's happening around you — and the world — while giving organizers, businesses, and communities real tools to reach people who care. Every listing on the platform is verified before it goes live, every community is member-driven, and every recommendation gets sharper the more a person explores.

The platform serves four kinds of people:

- **Attendees & travelers** — discover verified events, businesses, and destinations near them or anywhere in the world, save what they like, book tickets, and get smart, personalized recommendations.
- **Organizers, companies, and agents** — list events and businesses, manage bookings and payouts, and build a following.
- **Communities** — anyone can start a community around a place or an interest; members join, and events/businesses can be posted directly into that community's context.
- **Admins** — full operational control over the platform from a dedicated console, entirely separate from ordinary user accounts.

## Key features

**Discovery & booking**
- Event & business browsing with search, category/price/location filters, and sorting (soonest, most popular, distance)
- GPS or IP-based location detection with manual override, used for "near you" results and automatic currency conversion
- Personalized recommendations that learn from what you view, save, and book
- Ticket booking with commission-aware payouts for organizers, and booking-confirmation + automated post-event follow-up emails
- Reviews, testimonials, and a report/moderation pipeline to keep listings authentic

**Communities**
- Create a community around a place, an interest, or both
- Join/leave, member counts, and a dedicated space where events and businesses can be organized under that community's identity

**Business directory**
- Full business profiles: logo, cover photo, photo gallery, description, contact details, hours, price range, and category
- Animated cards (hover lift, shine, staggered entrance) and a compact video-frame treatment for any video in a gallery
- Search, category/price filtering, and sorting, all synced to shareable URLs

**Currency**
- Base currency is USD; every price displayed across events, listings, and bookings is auto-converted to the visitor's detected or chosen currency, with the original amount always shown for transparency

**Media**
- Real file upload (not just URL-paste) for cover photos, galleries, business logos, and the homepage's compact video slideshow
- A dedicated, moderated video-submission pipeline: admins and admin-verified organizers can submit clips; only approved ones appear publicly

**Admin console** — a single, separate admin surface at `/const`, with its own login and one-time bootstrap registration (never reachable through the ordinary sign-up flow):
- Approve/reject/hide events and businesses, with a flagged-content queue
- Moderate reviews and testimonials
- Manage users — verify organizers, suspend accounts, change roles
- Manage the homepage video/photo slideshow
- Site-wide settings (maintenance mode, approval requirements, commission rate, announcement banner) with no redeploy needed
- Full report-handling and authenticity/spam-signal review

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT, bcrypt password hashing |
| Media | Multer (disk storage, swappable for S3/R2) |
| Email | Nodemailer (SMTP; logs to console if unconfigured) |
| Scheduled jobs | node-cron (event reminders, post-event follow-ups) |
| Deployment | Docker, Railway-ready, or self-hosted via docker-compose + nginx |

## Project structure

```
yotweek/
├── frontend/            Next.js app (App Router)
│   ├── app/              Routes — /events, /businesses, /communities, /const (admin), ...
│   ├── components/       Shared UI components
│   ├── context/          Auth, Currency, and other React providers
│   └── lib/               API client, types, currency/geolocation utilities
├── backend/              Express API
│   ├── src/routes/        One file per resource (events, businesses, communities, admin, ...)
│   ├── src/middleware/    Auth guards, role checks
│   ├── src/utils/         Email templates, cron jobs, currency/commission helpers
│   └── prisma/            schema.prisma + migrations
├── nginx/                 Reference reverse-proxy config for self-hosted deploys
└── docker-compose.yml      Postgres + backend + frontend, one command to run locally
```

## Getting started

**Prerequisites:** Node.js 20+, PostgreSQL 14+ (or Docker).

```bash
git clone <this-repo> yotweek && cd yotweek
```

### Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy
npx prisma db seed          # optional — creates a sample admin + organizer account
npm run dev                 # http://localhost:4000
```

Seeded admin login (if you ran the seed): `admin@yotweek.com` / `Password123!` — sign in at **`/const/login`**, not the regular `/auth/login`. If you skip seeding, visit **`/const/register`** once after your first deploy to create the platform's first admin account; that endpoint locks itself the moment an admin exists.

### Frontend

```bash
cd frontend
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:3000
```

### Or, everything at once with Docker

```bash
cp .env.example .env        # fill in POSTGRES_PASSWORD, JWT_SECRET
docker compose up -d --build
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full, documented list. The essentials:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `JWT_SECRET` | backend | Signs auth tokens — must be long, random, and secret in production |
| `FRONTEND_URL` | backend | CORS allow-list — your frontend's public URL |
| `UPLOAD_DIR` | backend | Where uploaded media is written — point at a persistent volume in production |
| `NEXT_PUBLIC_API_URL` | frontend | The backend's public URL — **must be set before `next build`**, since it's inlined into the client bundle at build time, not read at runtime |

## Deployment

**Railway** (recommended for managed Postgres + zero-ops deploys): create a Postgres plugin, a backend service (`backend/railway.json` is already configured with a Dockerfile build and `/health` healthcheck), and a frontend service, then set the environment variables above on each. Full step-by-step notes are in `RAILWAY_DEPLOY.md` if present, or follow the standard Railway "deploy from GitHub" flow for a Dockerfile-based service.

**Self-hosted VPS, one domain:**
```bash
cp .env.example .env
docker compose up -d --build
```
This brings up Postgres, the backend (auto-runs migrations on boot, published on `127.0.0.1:4000`), and the frontend (`127.0.0.1:3000`). `nginx/nginx.conf.example` is a ready-to-copy reverse proxy that fronts both under one public domain with HTTPS — full setup steps are in its header comment.

**Before going live, either way:**
- Set a strong, unique `JWT_SECRET`
- Point a persistent volume at `UPLOAD_DIR`, or move media storage to S3/R2 (see the media section of this README for why)
- Visit `/const/register` immediately after your first deploy to claim the admin account — the bootstrap endpoint only checks "does an admin exist yet," not who's asking

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/your-feature`
2. Keep changes scoped and typed — both `frontend` and `backend` should pass `npx tsc --noEmit` with zero new errors before you open a PR
3. Follow the existing patterns: shared Tailwind utility classes in `globals.css` over one-off styles, Express routes grouped by resource, Prisma migrations written (or generated) per change rather than editing `schema.prisma` without a matching migration
4. Write a clear PR description: what changed, why, and how you verified it (a build/typecheck log, a screenshot, or both)
5. Be respectful and constructive in reviews — this is a community-driven project in spirit as well as in feature set

Bug reports and feature requests are welcome via issues. For anything security-related, please report privately rather than opening a public issue.

## License

Proprietary — All Rights Reserved. This codebase is not licensed for reuse, modification, or redistribution without explicit permission from the project owner. If you intended an open-source license (MIT, Apache 2.0, etc.) instead, replace this section and the `license` field in both `package.json` files accordingly.
