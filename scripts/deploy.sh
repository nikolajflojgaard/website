#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REPO_SLUG="$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"

log "Building site"
npm run build

if [[ -n "${SIMPLY_SFTP_HOST:-}" && -n "${SIMPLY_SFTP_USER:-}" && -n "${SIMPLY_SFTP_PASS:-}" && -n "${SIMPLY_REMOTE_DIR:-}" ]]; then
  require_cmd lftp
  PORT="${SIMPLY_SFTP_PORT:-21}"
  log "Deploying dist/ directly to Simply over FTPS"
  lftp -e "
    set ftp:passive-mode true;
    set ftp:ssl-allow yes;
    set ftp:ssl-force true;
    set ftp:ssl-protect-data true;
    set ssl:verify-certificate no;
    open -u ${SIMPLY_SFTP_USER},${SIMPLY_SFTP_PASS} ftp://${SIMPLY_SFTP_HOST}:${PORT};
    mirror -R --delete --verbose dist/ ${SIMPLY_REMOTE_DIR};
    bye
  "
  log "Deploy complete via Simply FTPS"
  exit 0
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree is dirty. Commit/push your changes first, then rerun npm run deploy so GitHub Actions deploys the right revision."
  fi

  LOCAL_HEAD="$(git rev-parse HEAD)"
  UPSTREAM_HEAD="$(git rev-parse --verify "origin/${CURRENT_BRANCH}" 2>/dev/null || true)"
  if [[ -z "$UPSTREAM_HEAD" || "$LOCAL_HEAD" != "$UPSTREAM_HEAD" ]]; then
    fail "Current branch is not fully pushed to origin/${CURRENT_BRANCH}. Push first, then rerun npm run deploy."
  fi

  log "Triggering GitHub Actions deploy workflow for ${CURRENT_BRANCH}"
  gh workflow run simply-deploy.yml --repo "$REPO_SLUG" --ref "$CURRENT_BRANCH"
  log "Workflow dispatched. Check status with: gh run list --repo $REPO_SLUG --workflow simply-deploy.yml --limit 1"
  exit 0
fi

cat >&2 <<'EOF'
[deploy] ERROR: No deployment path is configured.

Supported deploy paths:
  1. Direct Simply FTPS deploy
     Required env vars: SIMPLY_SFTP_HOST, SIMPLY_SFTP_USER, SIMPLY_SFTP_PASS, SIMPLY_REMOTE_DIR
     Optional env var:  SIMPLY_SFTP_PORT (defaults to 21)
     Required local tool: lftp

  2. GitHub Actions deploy via gh CLI
     Requirements: gh installed, gh auth status OK, clean working tree, branch pushed to origin

This repo's production domain currently resolves to Simply, so Vercel is not the primary production deploy path.
EOF
exit 1
