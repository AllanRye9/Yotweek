#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# yotweek — local development starter
# Run from the project root: bash start-dev.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[yotweek]${NC} $*"; }
warn()  { echo -e "${YELLOW}[yotweek]${NC} $*"; }
error() { echo -e "${RED}[yotweek] ERROR:${NC} $*"; exit 1; }

# ── 1. Prereqs ────────────────────────────────────────────────────────────────
command -v node  >/dev/null 2>&1 || error "Node.js not found. Install Node 20: https://nodejs.org"
command -v npm   >/dev/null 2>&1 || error "npm not found."
NODE_VER=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
[[ "$NODE_VER" -ge 20 ]] || error "Node 20+ required (you have Node $NODE_VER). Install from https://nodejs.org"
info "Node $NODE_VER ✓"

# ── 2. Backend .env ───────────────────────────────────────────────────────────
if [[ ! -f "$BACKEND/.env" ]]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  warn "Created backend/.env from .env.example — EDIT IT NOW to set DATABASE_URL and JWT_SECRET"
  warn "Then re-run this script."
  exit 1
fi

if grep -q "user:password" "$BACKEND/.env"; then
  error "backend/.env still has the placeholder DATABASE_URL.\nEdit DATABASE_URL to point at your Postgres instance, then re-run."
fi

# ── 3. Frontend .env ──────────────────────────────────────────────────────────
if [[ ! -f "$FRONTEND/.env.local" ]]; then
  cp "$FRONTEND/.env.example" "$FRONTEND/.env.local"
  info "Created frontend/.env.local (NEXT_PUBLIC_API_URL=http://localhost:4000/api)"
fi

# ── 4. Install deps ───────────────────────────────────────────────────────────
info "Installing backend dependencies…"
(cd "$BACKEND" && npm install --prefer-offline --silent)

info "Installing frontend dependencies…"
(cd "$FRONTEND" && npm install --prefer-offline --silent)

# ── 5. Prisma ─────────────────────────────────────────────────────────────────
info "Running Prisma migrations…"
(cd "$BACKEND" && npx prisma migrate deploy) || {
  warn "migrate deploy failed — trying migrate dev (creates DB if needed)…"
  (cd "$BACKEND" && npx prisma migrate dev --name init) || error "Prisma migration failed.\nCheck your DATABASE_URL in backend/.env and make sure Postgres is running."
}

info "Generating Prisma client…"
(cd "$BACKEND" && npx prisma generate)

# Seed only if the admin account doesn't exist yet (idempotent)
info "Seeding database…"
(cd "$BACKEND" && npx ts-node prisma/seed.ts 2>/dev/null) || warn "Seed skipped (already seeded or ts-node not found — OK)"

# ── 6. Start both services ────────────────────────────────────────────────────
info "Starting backend on http://localhost:4000 …"
info "Starting frontend on http://localhost:3000 …"
info ""
info "  Backend API:  http://localhost:4000/health"
info "  Frontend app: http://localhost:3000"
info "  Admin login:  admin@yotweek.com / Password123!"
info ""
info "Press Ctrl-C to stop both services."
info ""

# Run both in parallel, kill both on Ctrl-C
trap 'kill 0' INT TERM

(cd "$BACKEND"  && npm run dev) &
(cd "$FRONTEND" && npm run dev) &

wait
