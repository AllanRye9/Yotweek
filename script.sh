#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

usage() {
  cat <<'EOF'
Usage: ./script.sh [options] [commit-message]

Pull the latest changes from origin/main, optionally run Prisma migrations
and production builds, stage all local changes, commit them with the
provided message (or a timestamped default), and push back to origin/main.

Options:
  --migrate        Run backend Prisma migrations before committing.
  --build          Run backend and frontend production builds before committing.
  --verify         Run both migrations and builds before committing.
  -h, --help       Show this help message
EOF
}

commit_message=""
run_migrations=false
run_build=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --migrate)
      run_migrations=true
      ;;
    --build)
      run_build=true
      ;;
    --verify)
      run_migrations=true
      run_build=true
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
  (cd backend && npm run prisma:migrate:deploy)
fi

if [[ "$run_build" == true ]]; then
  echo "Building backend..."
  (cd backend && npm run build)

  echo "Building frontend..."
  (cd frontend && npm run build)
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not inside a git repository." >&2
  exit 1
fi

branch=$(git symbolic-ref --quiet --short HEAD)
if [[ "$branch" != "main" ]]; then
  echo "Switching to main branch from '$branch'..."
  git checkout main
fi

echo "Pulling latest changes from origin/main..."
git pull origin main

if [[ -z "$commit_message" ]]; then
  commit_message="Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

git add .

if git diff --cached --quiet --ignore-submodules --; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "$commit_message"

echo "Pushing committed changes to origin/main..."
git push origin main

echo "Done."