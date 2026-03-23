#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/IPTV-website"
BRANCH="main"
LAST_FILE="$REPO_DIR/.last_deployed_commit"
LOG_PREFIX="[iptv-autodeploy]"

cd "$REPO_DIR"

STASH_CREATED="false"

# Preserve temporary server-side local edits while still allowing auto-pull.
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -u -m "iptv-autodeploy-local-$(date +%s)" >/dev/null
  STASH_CREATED="true"
fi

git fetch origin "$BRANCH"
LATEST_COMMIT="$(git rev-parse "origin/$BRANCH")"
CURRENT_COMMIT="$(git rev-parse HEAD)"
LAST_DEPLOYED="$(cat "$LAST_FILE" 2>/dev/null || true)"

if [ "$LATEST_COMMIT" = "$LAST_DEPLOYED" ]; then
  if [ "$STASH_CREATED" = "true" ]; then
    git stash pop >/dev/null || true
  fi
  echo "$LOG_PREFIX No new commit."
  exit 0
fi

if [ "$CURRENT_COMMIT" != "$LATEST_COMMIT" ]; then
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

# Rebuild and restart app services. This also handles old compose recreate issues.
docker-compose build backend frontend
docker ps -a --format '{{.Names}}' | grep -E 'iptv-backend|iptv-frontend' | xargs -r docker rm -f || true
docker-compose up -d mongo
docker-compose up -d backend frontend

if [ "$STASH_CREATED" = "true" ]; then
  git stash pop >/dev/null || true
fi

echo "$LATEST_COMMIT" > "$LAST_FILE"
echo "$LOG_PREFIX Deployed commit $LATEST_COMMIT"
