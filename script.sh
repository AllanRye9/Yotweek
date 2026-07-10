#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: ./script.sh [options] [commit-message]

Pull the latest changes from origin/main, run validation checks, stage all
local changes, commit them with the provided message (or a timestamped
default), and push back to origin/main.

Options:
  --migrate        Run backend Prisma migrations before committing.
  --build          Run backend and frontend production builds before committing.
  --ci             Run dependency install and validation checks before committing.
  --verify         Run migrations, dependency install, lint/typecheck, and builds.
  --skip-checks    Skip CI and build validation checks.
  -h, --help       Show this help message
EOF
}

commit_message=""
run_migrations=false
run_build=false
run_checks=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --migrate)
      run_migrations=true
      ;;
    --build)
      run_build=true
      ;;
    --ci)
      run_checks=true
      ;;
    --verify)
      run_migrations=true
      run_checks=true
      run_build=true
      ;;
    --skip-checks)
      run_checks=false
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -z "$commit_message" ]]; then
        commit_message="$1"
      else
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 1
      fi
      ;;
  esac
  shift
done

if [[ "$run_migrations" == true ]]; then
  echo "Running backend Prisma migrations..."
  (cd "$SCRIPT_DIR/backend" && npm run prisma:migrate:deploy)
fi

if [[ "$run_checks" == true ]]; then
  echo "Installing backend dependencies..."
  (cd "$SCRIPT_DIR/backend" && npm ci --no-audit --no-fund)

  echo "Installing frontend dependencies..."
  (cd "$SCRIPT_DIR/frontend" && npm ci --no-audit --no-fund)

  echo "Running backend typecheck..."
  (cd "$SCRIPT_DIR/backend" && npm run typecheck)

  echo "Linting frontend..."
  (cd "$SCRIPT_DIR/frontend" && npm run lint)

  echo "Building backend..."
  (cd "$SCRIPT_DIR/backend" && npm run build)

  echo "Building frontend..."
  (cd "$SCRIPT_DIR/frontend" && npm run build)
fi

if [[ "$run_build" == true && "$run_checks" != true ]]; then
  echo "Building backend..."
  (cd "$SCRIPT_DIR/backend" && npm run build)

  echo "Building frontend..."
  (cd "$SCRIPT_DIR/frontend" && npm run build)
fi

if ! git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not inside a git repository." >&2
  exit 1
fi

branch=$(git -C "$SCRIPT_DIR" symbolic-ref --quiet --short HEAD)
if [[ "$branch" != "main" ]]; then
  echo "Switching to main branch from '$branch'..."
  git -C "$SCRIPT_DIR" checkout main
fi

echo "Pulling latest changes from origin/main..."
git -C "$SCRIPT_DIR" pull origin main

if [[ -z "$commit_message" ]]; then
  commit_message="Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

git -C "$SCRIPT_DIR" add .

if git -C "$SCRIPT_DIR" diff --cached --quiet --ignore-submodules --; then
  echo "No changes to commit."
  exit 0
fi

git -C "$SCRIPT_DIR" commit -m "$commit_message"

echo "Pushing committed changes to origin/main..."
git -C "$SCRIPT_DIR" push origin main

echo "Done."