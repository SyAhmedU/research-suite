// ════════════════════════════════════════════════════════════════
//  suite-auth.js — the Research Suite's shared identity + cloud layer.
//
//  ONE source of truth for accounts across the suite. Built on Supabase
//  (hosted Postgres + Auth). Safe to ship in the browser: the anon key is
//  *meant* to be public — every row is protected by row-level security, so
//  a signed-in user can only ever read/write their own projects.
//
//  ▶ To go live, paste your project's URL + anon key into SUITE_CONFIG below
//    (see SETUP.md for the ~10-minute one-time setup). Until then the app
//    runs in "preview" mode: the account UI shows the setup hint instead of
//    breaking.
//
//  Origin note for later rollout: Supabase keeps the session in localStorage,
//  which is per-origin. All the github.io apps (hub, wordmap, cadence,
//  journaltime) share the `syahmedu.github.io` origin, so one sign-in covers
//  them. The *.vercel.app tools are separate origins and will each need their
//  own sign-in (or token hand-off, like the existing #pack= handoffs).
// ════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── FILL THESE IN (Project Settings → API in your Supabase dashboard) ──
export const SUITE_CONFIG = {
  url: 'https://hpupaqzebvrjhrpywtzl.supabase.co',
  anonKey: 'sb_publishable_HwG-E4cFEuoeV_XlVxSrdA_E8x7UweQ',  // public publishable key — safe to ship; RLS protects data
};

let _client = null;

export function isConfigured() {
  return Boolean(SUITE_CONFIG.url && SUITE_CONFIG.anonKey);
}

export function client() {
  if (!isConfigured()) return null;
  if (!_client) {
    _client = createClient(SUITE_CONFIG.url, SUITE_CONFIG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _client;
}

// ── Auth ──────────────────────────────────────────────────────────
export async function currentUser() {
  const c = client();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data?.user ?? null;
}

export function onAuthChange(cb) {
  const c = client();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
  return () => data?.subscription?.unsubscribe?.();
}

export async function signInWithGoogle() {
  const c = client();
  if (!c) throw new Error('not configured');
  // Return to wherever we are now so the dashboard opens on redirect back.
  const { error } = await c.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

// Passwordless email: Supabase sends a magic link; clicking it returns here
// with a session in the URL, which detectSessionInUrl picks up automatically.
export async function signInWithEmail(email) {
  const c = client();
  if (!c) throw new Error('not configured');
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function signOut() {
  const c = client();
  if (c) await c.auth.signOut();
}

// ── Connection self-test ────────────────────────────────────────────
// Lets the hub tell you, the moment you paste keys, whether everything is
// actually wired — turning the SETUP.md steps into a verifiable checklist
// instead of a guess. A lightweight `projects` select exercises the URL, the
// anon key, the table, and RLS in one call (RLS returns empty-but-no-error
// when signed out, which is exactly "connected & healthy").
export async function health() {
  if (!isConfigured()) return { state: 'unconfigured' };
  const c = client();
  try {
    const { error } = await c.from('projects').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || /relation .*does not exist/i.test(error.message || '')) {
        return { state: 'no-table', msg: 'Keys work, but the projects table is missing — run the SQL in SETUP.md (step 3).' };
      }
      return { state: 'error', msg: error.message || 'Query failed — check your table & RLS policy.' };
    }
    return { state: 'ok' };
  } catch (e) {
    return { state: 'error', msg: 'Could not reach Supabase — double-check the project URL. (' + (e?.message || e) + ')' };
  }
}

// Which login methods are actually turned on in the dashboard. Public
// endpoint (anon key only) — lets the UI hide buttons for providers that
// aren't enabled yet, instead of bouncing the user to a "provider not
// enabled" error page.
export async function enabledProviders() {
  if (!isConfigured()) return {};
  try {
    const r = await fetch(SUITE_CONFIG.url + '/auth/v1/settings', { headers: { apikey: SUITE_CONFIG.anonKey } });
    if (!r.ok) return {};
    return (await r.json()).external || {};
  } catch { return {}; }
}

// ── Projects (per-user, RLS-protected) ──────────────────────────────
// A "project" is a named research workspace. `data` (jsonb) is where each
// suite tool will later stash its per-project state during rollout; for now
// the hub just creates/lists/renames/deletes them.
export async function listProjects() {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('projects').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProject(name) {
  const c = client();
  if (!c) throw new Error('not configured');
  const user = await currentUser();
  if (!user) throw new Error('sign in first');
  const { data, error } = await c.from('projects')
    .insert({ name: name.trim() || 'Untitled project', user_id: user.id })
    .select().single();
  if (error) throw error;
  return data;
}

export async function renameProject(id, name) {
  const c = client();
  if (!c) throw new Error('not configured');
  const { error } = await c.from('projects')
    .update({ name: name.trim() || 'Untitled project', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id) {
  const c = client();
  if (!c) throw new Error('not configured');
  const { error } = await c.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ── Active project (cloud-backed, localStorage-mirrored) ─────────────
// "Which project am I working on right now" is a per-user preference, so it
// lives in Supabase **user metadata** — no extra table, RLS-free (it's the
// user's own record), and it follows the user across devices *and* origins
// once signed in. We also mirror it to localStorage so:
//   • the same-origin github.io tools can paint the active-project pill
//     instantly, before any network call, and
//   • anonymous / preview mode (no keys, not signed in) still works offline.
// This replaces the hub's old localStorage-only mechanism without breaking it.
const ACTIVE_ID_KEY = 'active_project_id';
const ACTIVE_NAME_KEY = 'active_project_name';

export function getActiveLocal() {
  try { return { id: localStorage.getItem(ACTIVE_ID_KEY), name: localStorage.getItem(ACTIVE_NAME_KEY) }; }
  catch { return { id: null, name: null }; }
}

function mirrorActive(p) {
  try {
    if (p && p.id) {
      localStorage.setItem(ACTIVE_ID_KEY, p.id);
      localStorage.setItem(ACTIVE_NAME_KEY, p.name || '');
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY);
      localStorage.removeItem(ACTIVE_NAME_KEY);
    }
  } catch {}
}

// Resolve the active project, preferring the cloud value (so a switch on
// another device wins) and falling back to the local mirror. Cheap to call:
// signed-out / unconfigured returns the mirror without a network round-trip.
export async function getActiveProject() {
  const local = getActiveLocal();
  const c = client();
  if (!c) return local;
  const user = await currentUser();
  const cloudId = user?.user_metadata?.active_project_id || null;
  if (!cloudId) return local;
  // Pull the current name so a rename elsewhere is reflected here.
  try {
    const { data } = await c.from('projects').select('id,name').eq('id', cloudId).single();
    if (data) { const p = { id: data.id, name: data.name }; mirrorActive(p); return p; }
  } catch {}
  // Project may have been deleted on another device — clear the stale pointer.
  if (local.id === cloudId) return local;
  return { id: cloudId, name: null };
}

// Set (or clear, with null) the active project. Mirrors locally immediately,
// then persists to user metadata so it travels with the account.
export async function setActiveProject(p) {
  mirrorActive(p);
  const c = client();
  if (!c) return;
  try { await c.auth.updateUser({ data: { active_project_id: p?.id || null } }); } catch {}
}

export async function clearActiveProject() {
  return setActiveProject(null);
}

// ── Per-project tool state (the `data` jsonb column) ─────────────────
// Each suite tool stashes its slice of a project under its own key, e.g.
//   data = { toolsscope: {...}, cadence: {...}, researchflow: {...} }
// so tools never clobber one another. These are the primitives a tool calls
// to sync its per-project state to the cloud during rollout.
export async function getProjectData(id) {
  const c = client();
  if (!c || !id) return {};
  const { data, error } = await c.from('projects').select('data').eq('id', id).single();
  if (error) throw error;
  return data?.data ?? {};
}

// Read one tool's slice. Returns null when absent so callers can fall back to
// their existing localStorage value (the offline/anonymous tier).
export async function getToolData(id, toolKey) {
  if (!id || !toolKey) return null;
  const all = await getProjectData(id);
  return all?.[toolKey] ?? null;
}

// Merge-write one tool's slice. Read-merge-write (not blind overwrite) so two
// tools saving close together don't wipe each other's slice. Bumps updated_at
// so the hub's project list re-sorts to most-recently-touched.
export async function setToolData(id, toolKey, value) {
  const c = client();
  if (!c) throw new Error('not configured');
  if (!id || !toolKey) throw new Error('project id and tool key required');
  const all = await getProjectData(id);
  const next = { ...all, [toolKey]: value };
  const { error } = await c.from('projects')
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return next;
}
