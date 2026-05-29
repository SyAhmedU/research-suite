# Adopting suite sync in a tool (Phase 0 recipe)

How to wire any suite tool to the shared identity + cloud layer (`suite-auth.js`). This is the repeatable recipe behind roadmap **Phase 0** — see [ROADMAP.md](./ROADMAP.md).

The golden rule: **sync is additive, never a gate.** Anonymous, offline, single-device use must keep working exactly as it does today. Signing in *adds* cloud persistence on top of the existing `localStorage`; it never replaces it as the only path.

---

## The primitives (`suite-auth.js`)

```js
import * as Auth from '<path-or-url>/suite-auth.js';

Auth.isConfigured()            // false → preview mode, show the setup hint, do nothing else
Auth.currentUser()             // → user | null
Auth.onAuthChange(cb)          // cb(user|null); returns an unsubscribe fn

Auth.getActiveProject()        // → { id, name }  (cloud-preferred, mirror fallback)
Auth.getActiveLocal()          // → { id, name }  (sync, mirror only — for instant paint)
Auth.setActiveProject(p)       // persist active choice (cloud + mirror)

Auth.getToolData(id, key)      // → this tool's saved slice for a project, or null
Auth.setToolData(id, key, val) // merge-write this tool's slice (won't clobber other tools)
```

Each tool owns **one key** in the project's `data` jsonb. Use the suite step code as the key so they never collide: `ib, wm, pc, rf, ts, ss, cd, to, jt`.

---

## The pattern (load → edit → save)

```js
const TOOL_KEY = 'to'; // e.g. ToolsScope

async function hydrate() {
  if (!Auth.isConfigured()) return;            // preview mode → stay local-only
  const user = await Auth.currentUser();
  if (!user) return;                           // anonymous → stay local-only
  const { id } = await Auth.getActiveProject();
  if (!id) return;                             // no active project → stay local-only
  const cloud = await Auth.getToolData(id, TOOL_KEY);
  if (cloud) loadStateFrom(cloud);             // cloud wins when present
}

async function persist(state) {
  saveLocal(state);                            // ALWAYS keep the local copy
  if (!Auth.isConfigured()) return;
  const user = await Auth.currentUser();
  if (!user) return;
  const { id } = await Auth.getActiveProject();
  if (!id) return;
  try { await Auth.setToolData(id, TOOL_KEY, state); } catch (e) { /* offline is fine */ }
}
```

**Conflict policy (Phase 0):** last-write-wins, cloud-preferred on load. Good enough for a single researcher across devices. True multi-writer merge is **Phase 3 (collaboration)** — don't build it here.

---

## React tools (researchflow, theoryscope, scalebase, toolsscope, paperpulse)

- Add `suite-auth.js` to the app (or import from the hub origin) and call `hydrate()` in a top-level `useEffect`; call `persist()` from the same place the tool already writes `localStorage` (debounced).
- Reuse the existing autosave plumbing — most tools already debounce writes (`tw_autosave`, `rf_autosave`, etc.). Wrap that single write site, don't scatter calls.

## Vanilla single-file tools (wordmap, cadence, journaltime, ideabox hub)

- `<script type="module">import * as Auth from '...'</script>`, same `hydrate()`/`persist()` shape.
- These also show the **active-project pill**: read `Auth.getActiveLocal()` for instant paint.

---

## Origins — the one real gotcha

Supabase keeps the session in `localStorage`, which is **per-origin**:

- **Same origin as the hub** (`syahmedu.github.io` → wordmap, cadence, journaltime, ideabox-as-hosted): one sign-in covers them all. Zero extra auth work — they inherit the hub's session. **Wire these first.**
- **Separate origin** (`*.vercel.app` → researchflow, theoryscope, scalebase, toolsscope, papercards): each needs its **own** sign-in, OR a token hand-off via the existing `#pack=`-style fragment. For every such origin, add its URL to Supabase **Authentication → URL Configuration → Redirect URLs** (see SETUP.md step 4).

**Suggested rollout order:** github.io tools first (free session sharing), then one Vercel tool end-to-end to prove the cross-origin sign-in, then the rest.

---

## Reference implementation (copy this)

**JournalTime is wired and is the canonical example** — see the `<script type="module">` block at the end of `journaltime/index.html`. It's the vanilla, same-origin pattern: imports `suite-auth.js` by absolute URL, inherits the hub session (no auth UI), syncs one slice (`jt` → the Article Developer draft), cloud-wins-if-newer on load, pushes on `visibilitychange`/`pagehide` + a best-effort wrap of the existing writer. Clone its shape for the other github.io tools (wordmap, cadence) — change `TOOL_KEY` and the localStorage key(s) you read/write.

**ResearchFlow is the cross-origin reference** — see `researchflow/src/lib/suiteSync.ts` + `AccountButton` in `App.tsx`. It dynamically imports suite-auth via `import(/* @vite-ignore */ 'https://syahmedu.github.io/research-suite/suite-auth.js')` — **zero new npm dependency, no bundler/type friction** (Vite preserves the URL as a runtime import; GitHub Pages serves it with `Access-Control-Allow-Origin: *`, verified). Because the hub session isn't shared cross-origin, it ships its own `AccountButton` (Google + email magic link). Clone this for the other React tools (theoryscope/toolsscope/papercards) — change `TOOL_KEY` and wrap their autosave site.

> **One-time per new origin:** add the tool's URL to the Supabase dashboard → Authentication → URL Configuration → **Redirect URLs**, or sign-in can't return. (SETUP.md step 4.)

Remaining: **wordmap** (`wm`) has no per-project state — skip. **cadence** (`cd`) is same-origin but **gate behind Phase 1** (participant data). React tools left: theoryscope, toolsscope, papercards (clone ResearchFlow).

## Definition of done (per tool)
- [ ] Signed-out / preview behaviour is byte-for-byte unchanged.
- [ ] Signed in with an active project: edits round-trip across a reload and a second device.
- [ ] No active project (or signed out): silently local-only, no errors.
- [ ] The tool's slice never overwrites another tool's slice (verify two tools on one project).
- [ ] Redirect URL added in Supabase if it's a new origin.
