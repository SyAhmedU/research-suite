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
