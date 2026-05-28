# Accounts setup — Throughline (Research Suite hub)

Accounts run on **Supabase** (free tier). This is a one-time, ~10-minute setup.
Until it's done, the hub runs in **preview mode** — everything works except the
"Sign in" button, which just shows this reminder.

The `anon` key you'll paste below is **public by design** — it's safe to commit
and ship in the browser. Every row is protected by row-level security (RLS), so a
signed-in user can only ever touch their own projects. (Never paste the
`service_role` key into client code.)

---

## 1. Create the project
1. Go to <https://supabase.com> → sign in → **New project**.
2. Pick a name/region, set a database password (you won't need it again), create.

## 2. Paste your keys into `suite-auth.js`
1. In Supabase: **Project Settings → API**.
2. Copy **Project URL** and the **anon / public** key.
3. Open `suite-auth.js`, fill in `SUITE_CONFIG`:
   ```js
   export const SUITE_CONFIG = {
     url: 'https://YOURPROJECT.supabase.co',
     anonKey: 'eyJhbGciOi...the long anon key...',
   };
   ```

## 3. Create the `projects` table + RLS
In Supabase: **SQL Editor → New query**, paste and run:

```sql
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  data       jsonb default '{}'::jsonb,   -- suite tools will stash per-project state here later
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "users manage their own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 4. Allow the hub URL to redirect back
**Authentication → URL Configuration:**
- **Site URL:** `https://syahmedu.github.io/research-suite/`
- **Redirect URLs:** add `https://syahmedu.github.io/research-suite/`
  (and `http://localhost:*` if you test locally).

## 5. Login methods

**Email magic-link — works immediately, free.** Nothing else to do.

**Google — free, needs a Google OAuth client (~5 min):**
1. [Google Cloud Console](https://console.cloud.google.com) → create/select a project → **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID → Web application.**
3. **Authorized redirect URI:** `https://YOURPROJECT.supabase.co/auth/v1/callback`
4. Copy the **Client ID + Client Secret**.
5. In Supabase: **Authentication → Providers → Google** → enable, paste them, save.

**Phone (SMS OTP) — skipped for now.** It needs a *paid* SMS provider (Twilio etc.).
Not worth it at this scale; add later only if someone actually needs it.

## 6. Done
Reload the hub and click **Sign in**. Create a project — it's now stored in your
cloud, visible only to you, and ready for the suite tools to sync into during rollout.

---

### Rollout note (later)
The github.io tools (wordmap, cadence, journaltime) share the `syahmedu.github.io`
origin, so they can reuse this same sign-in session via `suite-auth.js`. The
`*.vercel.app` tools are separate origins and will each need their own sign-in (or a
token hand-off like the existing `#pack=` URL payloads). Per-app data sync = writing
that app's state into `projects.data` (jsonb) under the active project.
