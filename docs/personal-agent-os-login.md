# Personal Agent OS Login Protection

`/personal-agent-os` stays public-safe by design.

`/personal-agent-os/private` is the hidden private login console for authenticated cards, prompt queueing, and private Agent OS controls.

## Security model

- Keep current Basic Auth as an optional outer lock at `/personal-agent-os` and `/personal-agent-os/private` when needed on Simply hosting.
- Supabase auth runs in the browser with public client keys only:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
- Never use or ship Supabase service role keys in Astro client code.
- Private card and prompt data is fetched client-side only after user auth. The initial HTML does not include private card content.

## Required local env vars

Use `.env` (local) and `.env.example` placeholders:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `PUBLIC_AGENT_OS_ALLOWED_EMAIL` (UI-side guard; blocks mismatching signed-in emails in the console)

If required Supabase vars are missing, `/personal-agent-os/private` shows a setup-needed state and disables auth actions.

## Supabase Auth setup

In Supabase Dashboard:

1. Enable providers:
   - Google OAuth
2. Add redirect URL:
   - `https://YOUR_DOMAIN/personal-agent-os/private`
   - For local dev also add: `http://localhost:4321/personal-agent-os/private`
3. Ensure your site URL/domain config in Supabase matches your production domain.

## SQL schema and RLS (minimum)

Run this in Supabase SQL editor (adapt fields as needed). Replace `YOUR_AUTH_USER_ID` and `YOUR_ALLOWED_EMAIL` before seeding real data.

```sql
create table if not exists public.agent_os_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  status text not null default 'note',
  link_url text,
  updated_at timestamptz not null default now()
);

alter table public.agent_os_cards enable row level security;

-- Read-only for the authenticated owner and configured email
create policy "agent_os_cards_select_authenticated"
on public.agent_os_cards
for select
to authenticated
using (
  auth.uid() = owner_id
  and lower(auth.jwt() ->> 'email') = lower('YOUR_ALLOWED_EMAIL')
);

-- Optional: keep write operations service-only or admin-only; no public write policy.
```

Seed a card only after you know your Supabase user id:

```sql
insert into public.agent_os_cards (owner_id, title, summary, status)
values (
  'YOUR_AUTH_USER_ID',
  'Headless gateway',
  'Sanitized private status card loaded only after login.',
  'healthy'
);
```

If `agent_os_cards` does not exist or policies block reads, the UI surfaces a safe setup error message instead of crashing.

## Prompt queue schema and RLS

The Chat tab writes prompts to a Supabase queue. A local/OpenClaw bridge can later poll this table and turn queued rows into real agent work.

```sql
create table if not exists public.agent_os_prompts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  status text not null default 'queued',
  response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_os_prompts enable row level security;

create policy "agent_os_prompts_insert_owner"
on public.agent_os_prompts
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and lower(auth.jwt() ->> 'email') = lower('YOUR_ALLOWED_EMAIL')
);

create policy "agent_os_prompts_select_owner"
on public.agent_os_prompts
for select
to authenticated
using (
  auth.uid() = owner_id
  and lower(auth.jwt() ->> 'email') = lower('YOUR_ALLOWED_EMAIL')
);

-- Updates should be done by the local bridge with admin/database credentials, not from the browser.
```

## GitHub Actions variables for deploy builds

In repository settings, add Actions **Variables** (not secrets) so build-time public vars are available:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_AGENT_OS_ALLOWED_EMAIL` (optional)

`.github/workflows/simply-deploy.yml` passes these into the Build step.

## Optional Basic Auth outer lock on Simply

Current behavior in `.github/workflows/simply-deploy.yml`:

1. If both secrets below are set, workflow writes:
   - `dist/.agent-os.htpasswd`
   - `dist/personal-agent-os/.htaccess`
2. If missing, it skips Basic Auth setup.

Required secrets:

- `AGENT_OS_HTPASSWD`
- `AGENT_OS_HTPASSWD_PATH`

Create `AGENT_OS_HTPASSWD` with bcrypt:

```bash
htpasswd -nbB agentos 'REPLACE_WITH_STRONG_PASSWORD'
```

`AGENT_OS_HTPASSWD_PATH` must be the absolute Simply server path to the deployed `.agent-os.htpasswd` file, not a URL path.

This keeps Basic Auth available as an extra outer gate while Supabase auth handles user identity inside the private console.

## Local-first data boundary

- Public page (`/personal-agent-os`): status-level, sanitized, no private logs/secrets.
- Private page (`/personal-agent-os/private`): user-authenticated, client-fetched read-only cards.
- Sensitive operations and secrets remain outside public/static HTML and outside browser bundle.
