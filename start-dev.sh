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

random_hex() {
  local bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    node -e "console.log(require('crypto').randomBytes($bytes).toString('hex'))"
  fi
}

postgres_port_open() {
  if command -v nc >/dev/null 2>&1; then
    nc -z localhost 5432 >/dev/null 2>&1
  else
    (exec 3<>/dev/tcp/localhost/5432) >/dev/null 2>&1
  fi
}

wait_for_postgres() {
  local retries=12
  local count=0
  while [[ $count -lt $retries ]]; do
    if postgres_port_open; then
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done
  return 1
}

ensure_local_postgres() {
  if postgres_port_open; then
    info "Postgres already reachable on localhost:5432."
    return 0
  fi

  if ! command -v docker >/dev/null 2>&1; then
    error "Postgres is not reachable on localhost:5432 and docker is not available to start a local database.\nStart Postgres manually or update DATABASE_URL in backend/.env."
  fi

  if docker ps --format '{{.Names}}' | grep -q '^yotweek-dev-db$'; then
    info "Starting existing yotweek-dev-db Postgres container."
    docker start yotweek-dev-db >/dev/null
  elif docker ps -a --format '{{.Names}}' | grep -q '^yotweek-dev-db$'; then
    info "Starting stopped yotweek-dev-db Postgres container."
    docker start yotweek-dev-db >/dev/null
  else
    info "Launching local Postgres container on localhost:5432."
    docker run -d --name yotweek-dev-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=yotweek -p 5432:5432 postgres:16-alpine >/dev/null
  fi

  if wait_for_postgres; then
    info "Local Postgres is ready on localhost:5432."
    return 0
  fi

  error "Unable to start or reach local Postgres on localhost:5432.\nCheck docker and the database container logs."
}

# ── 1. Prereqs ────────────────────────────────────────────────────────────────
command -v node  >/dev/null 2>&1 || error "Node.js not found. Install Node 20: https://nodejs.org"
command -v npm   >/dev/null 2>&1 || error "npm not found."
NODE_VER=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
[[ "$NODE_VER" -ge 20 ]] || error "Node 20+ required (you have Node $NODE_VER). Install from https://nodejs.org"
info "Node $NODE_VER ✓"

patch_backend_env() {
  local env_file="$BACKEND/.env"

  if grep -q '^DATABASE_URL="postgresql://user:password@localhost:5432/yotweek?schema=public"' "$env_file"; then
    sed -i 's|postgresql://user:password@localhost:5432/yotweek?schema=public|postgresql://postgres:postgres@localhost:5432/yotweek?schema=public|' "$env_file"
    info "Replaced placeholder DATABASE_URL in backend/.env with a local default."
  fi

  if grep -q '^JWT_SECRET="change-me-to-a-long-random-string"' "$env_file"; then
    local jwt_secret="$(random_hex 48)"
    sed -i "s|JWT_SECRET=\"change-me-to-a-long-random-string\"|JWT_SECRET=\"$jwt_secret\"|" "$env_file"
    info "Generated a strong JWT_SECRET for backend/.env."
  fi
}

# ── 2. Backend .env ───────────────────────────────────────────────────────────
if [[ ! -f "$BACKEND/.env" ]]; then
  if [[ -f "$BACKEND/.env.example" ]]; then
    cp "$BACKEND/.env.example" "$BACKEND/.env"
  else
    error "Missing backend/.env.example. Cannot create backend/.env."
  fi
fi

patch_backend_env

if grep -q "user:password" "$BACKEND/.env"; then
  error "backend/.env still has the placeholder DATABASE_URL.\nIf you want to use a local database, set DATABASE_URL to postgresql://postgres:postgres@localhost:5432/yotweek?schema=public. Otherwise edit BACKEND/.env to point at your Postgres instance and re-run."
fi

# ── 3. Frontend .env ──────────────────────────────────────────────────────────
if [[ ! -f "$FRONTEND/.env.local" ]]; then
  cp "$FRONTEND/.env.example" "$FRONTEND/.env.local"
  info "Created frontend/.env.local (NEXT_PUBLIC_API_URL=http://localhost:4000/api)"
fi

# ── 4. Local database check ───────────────────────────────────────────────────
backend_db_url=$(grep '^DATABASE_URL=' "$BACKEND/.env" | head -n1 | cut -d'=' -f2- | tr -d '"')
if [[ "$backend_db_url" == postgresql://*localhost:5432/* ]] || [[ "$backend_db_url" == postgresql://*127.0.0.1:5432/* ]]; then
  ensure_local_postgres
fi

# ── 5. Install deps ───────────────────────────────────────────────────────────
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
