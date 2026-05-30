# Syed Identity — the shared design system

The Throughline look, extracted for reuse so every project reads as part of one
family. Origin: `research-suite`. This is the single source of truth the
CLAUDE.md flagged as "overdue for extraction."

## What's in the identity

| Layer | What it is |
|-------|------------|
| **Palette** | paper `#FBF7EF` · ink `#211B2E` · coral `#FF9656` → magenta `#F14575` → violet `#9270F4`. Light/dark via `[data-theme]`, shared `localStorage['syed-theme']`. |
| **Type** | Fraunces (italic display serif) · Plus Jakarta Sans (body) · IBM Plex Mono (eyebrows/data). |
| **Ambience** | paper grain · slow liquid-drift blobs · cursor-following glow. |
| **Motion** | spring easing `cubic-bezier(.18,1.4,.25,1)` · gradient-text shimmer · scroll-reveal rise. |
| **Components** | `.sx-eyebrow` · `.sx-h1/2/3` (with `em` gradient) · `.sx-btn(-fill/-ghost)` · `.sx-card(-accent)` · `.sx-bar` brand bar. |

All identity classes are prefixed `sx-` so they never collide with a project's
existing styles. Tokens use canonical `--paper / --ink / --grad …` names.

## Drop-in (static HTML / GitHub Pages)

```html
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://syahmedu.github.io/research-suite/identity/syed-identity.css">
</head>
<body>
  <!-- ambience auto-injects, or add it yourself -->
  <script src="https://syahmedu.github.io/research-suite/identity/syed-identity.js" defer></script>
</body>
```

Same-origin `syahmedu.github.io` apps can link these directly. For resilience
(no runtime dependency on another deploy) the files are small enough to **inline**
— that's the recommended path for production single-file apps, matching the
existing copy-paste brand-bar convention.

## Per-stack rollout notes

- **Single-file HTML** (wordmap, cadence, journaltime, ideabox, career-compass,
  bachelor-meal-plan, nexus): inline the CSS in a `<style>` and the JS in a
  `<script>`; retag headings → Fraunces, eyebrows/labels → mono.
- **React / Vite + plain CSS** (paperpulse, theoryscope, toolsscope,
  researchflow, tracewise): import the CSS in the global stylesheet; render a
  small `<IdentityFX/>` once (the blobs + glow) or call the JS; apply classes.
- **Tailwind** (scalebase, task-manager): mirror the tokens into
  `tailwind.config` theme (`colors`, `fontFamily`, `boxShadow`) and include the
  ambience/effects layer.

## Pilot

`nexus` is the reference conversion — see how the identity was infused there
before applying the same pattern elsewhere.
