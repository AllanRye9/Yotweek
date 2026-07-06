#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

usage() {
  cat <<'EOF'
Usage: ./script.sh [commit-message]

Pull the latest changes from origin/main, stage all local changes,
commit them with the provided message (or a timestamped default),
and push back to origin/main.

Options:
  -h, --help  Show this help message
EOF
}

if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
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

commit_message="${1:-Update: $(date '+%Y-%m-%d %H:%M:%S')}"

git add .

if git diff --cached --quiet --ignore-submodules --; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "$commit_message"

echo "Pushing committed changes to origin/main..."
git push origin main

echo "Done."