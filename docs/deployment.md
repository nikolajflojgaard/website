# Deployment

The production site currently lives on **Simply**, not Vercel.

`vercel.json` is still useful for platform/runtime config, but the active production deploy path for `nikolajflojgaard.me` is:

1. Build the static Astro site into `dist/`
2. Deploy `dist/` to Simply over FTPS
3. Or trigger the existing GitHub Actions workflow that does the same thing

## `npm run deploy`

`npm run deploy` now does the following:

- always runs `npm run build` first
- deploys directly to Simply over FTPS when the required env vars are present
- otherwise falls back to dispatching `simply-deploy.yml` through `gh workflow run`
- otherwise exits with a clear explanation instead of failing on a missing file

## Direct Simply deploy

Required env vars:

- `SIMPLY_SFTP_HOST`
- `SIMPLY_SFTP_USER`
- `SIMPLY_SFTP_PASS`
- `SIMPLY_REMOTE_DIR`

Optional:

- `SIMPLY_SFTP_PORT` (defaults to `21`)

Local requirement:

- `lftp`

## GitHub Actions deploy fallback

Requirements:

- `gh` installed and authenticated
- clean working tree
- branch fully pushed to `origin`

Then:

```bash
npm run deploy
```

The script dispatches:

- `.github/workflows/simply-deploy.yml`

Check the latest run with:

```bash
gh run list --workflow simply-deploy.yml --limit 1
```

## Notes

- The repo still contains `vercel.json`, but production DNS for `nikolajflojgaard.me` is currently served by Simply.
- If hosting is moved to Vercel later, update this document and `scripts/deploy.sh` together so the local deploy command does not drift again.
- For optional `/personal-agent-os` Basic Auth setup in GitHub Actions, see `docs/personal-agent-os-login.md`.
