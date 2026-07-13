#!/usr/bin/env bash
set -euo pipefail

trap 'echo "Script failed at line ${LINENO}." >&2' ERR

# if ! git diff --quiet || ! git diff --cached --quiet; then
#   echo "Working tree has uncommitted changes. Commit or stash them before running this script." >&2
#   exit 1
# fi

if [[ -n "$(git ls-files -u)" ]]; then
  echo "Unresolved merge conflicts detected. Resolve conflicts, stage the files, and commit before running this script." >&2
  git merge
fi

# Stash local changes if any, remember whether we created a stash
stash_output=$(git stash 2>&1 || true)
need_apply=false
if [[ "$stash_output" != *"No local changes"* ]]; then
  need_apply=true
fi

git pull --ff-only origin main

# Only apply stash if we actually created one
if [ "$need_apply" = true ]; then
  git stash apply
fi

if [ ! -d frontend ] || [ ! -d backend ]; then
  echo "Expected frontend and backend directories in repository root." >&2
  exit 1
fi

pushd frontend > /dev/null
rm -rf node_modules package-lock.json
npm install
npm run build
popd > /dev/null

if [ -f backend/package.json ]; then
  pushd backend > /dev/null
  rm -rf node_modules package-lock.json
  npm install
  npm run build
  popd > /dev/null
else
  echo "Warning: backend/package.json not found. Skipping backend build."
fi

git add .

if git diff --cached --quiet; then
  echo "Build completed, but there are no changes to commit."
  exit 0
fi

git commit -m "Update frontend build"
git push origin main
echo "Done!"