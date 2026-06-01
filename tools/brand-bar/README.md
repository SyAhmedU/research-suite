# Brand bar — single generated source

The "Syed Fire" sticky brand bar (S-mark + project name + suite/generic nav + theme
toggle) used to be **hand-copied across ~14 sites** in three forms. It now has **one
source of truth here**, and a generator emits each project's file.

## Edit once, then sync

1. Change shared values in **`core.mjs`** (gradient, suite step list / labels / hrefs,
   generic-link presets) or a project's knobs in **`registry.mjs`**.
2. Run the generator from the `research-suite` repo root:

   ```
   node tools/brand-bar/build.mjs --dry   # preview which files would change
   node tools/brand-bar/build.mjs         # write them
   ```

3. Each consuming repo now has an updated `SyedBar` file with a `// GENERATED …` header.
   Commit each repo (the home `Stop` auto-commit hook handles this).

## How it works

- `core.mjs` — shared constants + the `SUITE` step list (the `SuiteStep` union is derived
  from it, so type and data can't drift) + named generic-link presets.
- `registry.mjs` — one entry per consumer with its knobs: `format` (tsx/jsx), `themeMode`
  (`attr` / `storage-media` / `none`), `theme` (CSS-var family or literals), `toggle`
  (`class`/`inline`/`none`), `mobileCollapse`, `nav` (`conditional`/`suite-only`/`generic-only`),
  optional prop defaults, and the generic link set. Values are captured to reproduce each
  project's current look (e.g. scalebase uses `--bar-*`; researchflow uses `--text-h`/`--text`;
  theoryscope/toolsscope/paperpulse use `--ink*`/`--line`; karmamap is static light-only).
- `emit-react.mjs` — turns an entry into a clean `.tsx`/`.jsx` file string.
- `build.mjs` — writes each `entry.repoPath` (relative to the home dir; assumes all projects
  are siblings under the home directory).

## Scope

- **Done — React tier (8 files):** researchflow, theoryscope, scalebase, toolsscope,
  paperpulse, tracewise (`.tsx`); task-manager, karmamap (`.jsx`).
- **TODO — Pass 2:** the inline-HTML apps (nexus, wordmap, journaltime, cadence,
  bachelor-meal-plan, career-compass) and the Next layout (timetable-generator), via
  `emit-html.mjs` / `emit-next.mjs` inserting between `<!-- SYED-BAR:START/END -->` markers.

This directory is **dev-only tooling** — it is not shipped in any deploy bundle.
