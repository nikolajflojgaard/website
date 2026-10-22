#!/usr/bin/env bash
# Content-hash based deploy of dist/ to Simply.com over FTPS.
#
# A manifest (sha256 per file) is stored on the server as .deploy-manifest.
# Each deploy downloads it, uploads only new/changed files (assets first,
# then HTML/service worker/config last), deletes removed files and finally
# uploads the new manifest. If the remote manifest is missing/unreadable, or
# FULL_DEPLOY=true, it falls back to a full mirror (--overwrite --transfer-all).
#
# Env: HOST USER PASS PORT REMOTE_DIR [FULL_DEPLOY] [PARALLEL]
#      LFTP_OPEN (optional, override the connection preamble, used for local tests)
set -euo pipefail

DIST="${DIST:-dist}"
PARALLEL="${PARALLEL:-4}"
FULL_DEPLOY="${FULL_DEPLOY:-false}"
MANIFEST_NAME=".deploy-manifest"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

: "${REMOTE_DIR:?REMOTE_DIR is required}"
REMOTE_DIR="${REMOTE_DIR%/}"

if [[ -z "${LFTP_OPEN:-}" ]]; then
  : "${HOST:?}" "${USER:?}" "${PASS:?}" "${PORT:?}"
  LFTP_OPEN="set ftp:passive-mode true;
set ftp:ssl-allow yes;
set ftp:ssl-force true;
set ftp:ssl-protect-data true;
set ssl:verify-certificate no;
open -u $USER,$PASS ftp://$HOST:$PORT;"
fi
PREAMBLE="$LFTP_OPEN
set xfer:make-backup false;
set cmd:fail-exit true;"

log() { printf '[deploy %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
q() { local s=${1//\\/\\\\}; s=${s//\"/\\\"}; printf '"%s"' "$s"; }  # quote for lftp

# 1. Local manifest (sorted "sha256  path", paths relative to dist/)
(cd "$DIST" && find . -type f ! -name "$MANIFEST_NAME" -printf '%P\n' | LC_ALL=C sort | xargs -d '\n' sha256sum) > "$WORK/local"
log "Local files: $(wc -l < "$WORK/local")"

full_deploy() {
  log "FULL deploy: $1"
  lftp -c "$PREAMBLE
mkdir -p -f $(q "$REMOTE_DIR");
mirror -R --delete --overwrite --transfer-all --parallel=$PARALLEL --no-perms $(q "$DIST/") $(q "$REMOTE_DIR");
put -O $(q "$REMOTE_DIR") $(q "$WORK/local") -o $(q "$MANIFEST_NAME");"
  log "Full deploy done"
}

if [[ "$FULL_DEPLOY" == "true" ]]; then full_deploy "requested via full_deploy input"; exit 0; fi

# 2. Remote manifest
if ! lftp -c "$PREAMBLE
get $(q "$REMOTE_DIR/$MANIFEST_NAME") -o $(q "$WORK/remote");" >/dev/null 2>&1 || [[ ! -s "$WORK/remote" ]]; then
  full_deploy "no remote manifest found"; exit 0
fi
log "Remote manifest: $(wc -l < "$WORK/remote") files"

# 3. Diff
awk 'NR==FNR { r[substr($0,67)]=$1; next } { p=substr($0,67); if (r[p] != $1) print p }' "$WORK/remote" "$WORK/local" > "$WORK/changed"
awk 'NR==FNR { l[substr($0,67)]=1; next } { p=substr($0,67); if (!(p in l)) print p }' "$WORK/local" "$WORK/remote" > "$WORK/removed"
# HTML, service worker, manifests, sitemaps, feeds, dotfiles and pagefind entry go LAST so pages never point at missing assets
LAST_RE='(\.html|\.xml|\.txt|\.json|\.webmanifest|\.md)$|(^|/)\.[^/]+$|(^|/)(sw\.js|registerSW\.js|workbox-[^/]*\.js|pagefind[^/]*\.(js|css))$'
grep -Ev "$LAST_RE" "$WORK/changed" > "$WORK/first" || true
grep -E  "$LAST_RE" "$WORK/changed" > "$WORK/last"  || true
log "Changed: $(wc -l < "$WORK/changed") (assets: $(wc -l < "$WORK/first"), last: $(wc -l < "$WORK/last")), removed: $(wc -l < "$WORK/removed")"

# 4. Build lftp script
{
  echo "$PREAMBLE"
  echo "lcd $(q "$DIST");"
  echo "cd $(q "$REMOTE_DIR");"
  for list in first last; do
    if [[ -s "$WORK/$list" ]]; then
      printf 'mput -d -P %s' "$PARALLEL"
      while IFS= read -r f; do printf ' %s' "$(q "$f")"; done < "$WORK/$list"
      echo ";"
    fi
  done
  if [[ -s "$WORK/removed" ]]; then
    printf 'rm -f'
    while IFS= read -r f; do printf ' %s' "$(q "$f")"; done < "$WORK/removed"
    echo ";"
  fi
  echo "put $(q "$WORK/local") -o $(q "$MANIFEST_NAME");"
} > "$WORK/script.lftp"

if [[ ! -s "$WORK/changed" && ! -s "$WORK/removed" ]]; then
  log "Nothing changed; skipping upload"
  exit 0
fi
lftp -f "$WORK/script.lftp"
log "Incremental deploy done"
