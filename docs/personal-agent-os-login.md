# Personal Agent OS Login Protection

`/personal-agent-os` is currently a static page on Simply hosting.  
The recommended long-term protection is **Cloudflare Access** (identity-aware access control).

Until that is in place, this repo supports an interim **Basic Auth** setup that is compatible with Simply and does not store real credentials in git.

## Current repo behavior

In `.github/workflows/simply-deploy.yml`, after build and before upload:

1. If both GitHub secrets below are set, the workflow writes:
   - `dist/.agent-os.htpasswd` from `AGENT_OS_HTPASSWD`
   - `dist/personal-agent-os/.htaccess` with Basic Auth directives
2. If either secret is missing, it skips auth setup and deploy behavior remains unchanged.

The root `public/.htaccess` also denies direct web access to `.agent-os.htpasswd`.

## Required GitHub Actions secrets

Set these in repo settings:

- `AGENT_OS_HTPASSWD`
- `AGENT_OS_HTPASSWD_PATH`

### `AGENT_OS_HTPASSWD` value format

Use a single htpasswd line in Apache format, for example:

```text
agentos:$2y$12$...
```

Create it with bcrypt (do not commit it to the repo):

```bash
htpasswd -nbB agentos 'REPLACE_WITH_STRONG_PASSWORD'
```

Copy the output line exactly into the `AGENT_OS_HTPASSWD` secret.

### `AGENT_OS_HTPASSWD_PATH` value format

This must be the **absolute server path** that Apache/PHP hosting resolves at runtime, matching where the deployed file exists.

Example pattern:

```text
/absolute/path/to/site/.agent-os.htpasswd
```

Use your actual Simply webroot path (not a URL path).

## Deploy steps

1. Add/update the two secrets in GitHub.
2. Trigger `.github/workflows/simply-deploy.yml` (manual dispatch or push to `main`).
3. Verify:
   - Visiting `/personal-agent-os` prompts for username/password.
   - Other site paths stay public.
   - Accessing `/.agent-os.htpasswd` returns denied/not found.

## Why Cloudflare Access is still preferred

Basic Auth is a practical interim control for static hosting, but Cloudflare Access is stronger for production:

- central identity provider integration (Google/Microsoft/Okta, etc.)
- policy controls by user/group/device posture
- better auditing and revocation workflows

Use this Basic Auth setup as a compatibility bridge until Access is implemented.
