// syed-pwa — make every live project installable as an app (PWA), the way
// bachelor-meal-plan already is. ONE source of truth, idempotent, marker-based —
// same convention as research-suite/tools/{ambient,tour-button,brand-bar}.
//
//   node research-suite/tools/pwa/inject.mjs            # stamp all projects
//   node research-suite/tools/pwa/inject.mjs --dry      # preview, write nothing
//
// For each project it writes (next to / in the served root): manifest.webmanifest,
// a branded maskable icon.svg, and a generic runtime-caching sw.js — then injects
// the <head> tags + SW-registration <script> into the served index.html between
// <!-- SYED-PWA --> markers. Re-running replaces the block cleanly.
//
// The Next.js app (timetable-generator) has no index.html and is hand-wired in its
// app/layout.tsx instead — it is intentionally NOT in this registry.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOME = resolve(HERE, '..', '..', '..');           // tools/pwa -> tools -> research-suite -> HOME
const DRY = process.argv.includes('--dry');

// base: '.'  -> served under a path prefix (GitHub Pages /<project>/) — relative refs
// base: '/'  -> served at a domain root (Vercel *.vercel.app)          — absolute refs
const PROJECTS = [
  // --- GitHub Pages, single-file static (subpath) ---
  { slug: 'nexus',               html: 'nexus/index.html',               base: '.', theme: '#FBF7EF', name: 'Nexus — Project Portfolio',     short: 'Nexus',        desc: "Syed's project portfolio — a filterable, searchable grid of every tool in the suite." },
  { slug: 'scholarscope',        html: 'scholarscope/index.html',        base: '.', theme: '#FBF7EF', name: 'ScholarScope',                  short: 'ScholarScope', desc: 'Leading institutions, journals & authors in social science + a publish desk.' },
  { slug: 'fallacyscope',        html: 'fallacyscope/index.html',        base: '.', theme: '#FBF7EF', name: 'FallacyScope',                  short: 'FallacyScope', desc: 'A field guide to research paradoxes, fallacies & biases — every entry sourced.' },
  { slug: 'journaltime',         html: 'journaltime/index.html',         base: '.', theme: '#FBF7EF', name: 'JournalTime — Research Writing', short: 'JournalTime',  desc: 'Research writing workspace: gap finder, draft developer, journal studio & formatter.' },
  { slug: 'syeds-research-book', html: 'syeds-research-book/index.html', base: '.', theme: '#0d0a15', name: "Syed's Research Book",          short: 'Research Book',desc: 'Browsable corpus — 9,388 papers across 167 management/OB constructs.' },
  { slug: 'throughline-cs',      html: 'throughline-cs/index.html',      base: '.', theme: '#FBF7EF', name: 'Throughline CS',                short: 'Throughline CS', desc: 'CS-researcher workflow: discover, frame, design, experiment, analyze, write, publish.' },
  { slug: 'research-suite',      html: 'research-suite/index.html',      base: '.', theme: '#FBF7EF', name: 'Throughline — Research Suite',   short: 'Throughline',  desc: 'The front door to the research suite — one guided throughline across six stations.' },
  { slug: 'cadence',             html: 'cadence/index.html',             base: '.', theme: '#FBF7EF', name: 'Cadence — Surveys',             short: 'Cadence',      desc: 'Immersive, Typeform-style survey tool with consent gating and live analytics.' },

  // --- Vercel root-domain, single-file static ---
  { slug: 'bookscope',           html: 'bookscope/index.html',           base: '/', theme: '#0d0a15', name: 'BookScope',                     short: 'BookScope',    desc: 'Full-text search over 288 reference books (141,077 pages).' },
  { slug: 'career-compass',      html: 'career-compass/index.html',      base: '/', theme: '#FBF7EF', name: 'Career Compass',                short: 'Career Compass', desc: 'Class-10 career counselling — RIASEC, Big Five, aptitude & values in one report.' },

  // --- Vercel root-domain, Vite/React (assets live in public/) ---
  { slug: 'researchflow',        html: 'researchflow/index.html',        base: '/', pub: 'researchflow/public',        theme: '#FBF7EF', name: 'ResearchFlow',          short: 'ResearchFlow', desc: 'A 10-stage research wizard with stage-by-stage pitfalls.' },
  { slug: 'theoryscope',         html: 'theoryscope/index.html',         base: '/', pub: 'theoryscope/public',         theme: '#14111C', name: 'TheoryScope',           short: 'TheoryScope',  desc: 'Curated theory library — matchmaker, comparator, influence map & canvas.' },
  { slug: 'toolsscope',          html: 'toolsscope/index.html',          base: '/', pub: 'toolsscope/public',          theme: '#14111C', name: 'ToolsScope',            short: 'ToolsScope',   desc: 'In-browser analysis & visualisation workbench — stats run client-side.' },
  { slug: 'paperpulse',          html: 'paperpulse/index.html',          base: '/', pub: 'paperpulse/public',          theme: '#FBF7EF', name: 'PaperCards',            short: 'PaperCards',   desc: 'Research papers as glanceable cards — constructs, effects & forest plots.' },
  { slug: 'tracewise',           html: 'tracewise/index.html',           base: '/', pub: 'tracewise/public',           theme: '#FBF7EF', name: 'Tracewise',             short: 'Tracewise',    desc: "Document a role's as-is workflow before automating it." },
  { slug: 'throughline-studio',  html: 'throughline-studio/index.html',  base: '/', pub: 'throughline-studio/public',  theme: '#14111C', name: 'Throughline Studio',    short: 'Studio',       desc: 'An A→Z research workspace unifying the whole suite.' },
  { slug: 'scalebase',           html: 'scalebase/client/index.html',    base: '/', pub: 'scalebase/client/public',    theme: '#FBF7EF', name: 'ScaleScope',            short: 'ScaleScope',   desc: 'Validated measurement-scales library with local reliability analysis.' },
  { slug: 'karmamap',            html: 'karmamap/client/index.html',     base: '/', pub: 'karmamap/client/public',     theme: '#0F172A', name: 'KarmaMap — India AI Jobs', short: 'KarmaMap',  desc: 'India AI-jobs visualiser — automation-risk scoring for roles.' },
  { slug: 'task-manager',        html: 'task-manager/client/index.html', base: '/', pub: 'task-manager/client/public', theme: '#FBF7EF', name: 'TaskFlow',              short: 'TaskFlow',     desc: 'Full-stack team task manager with recurring tasks and multi-assignee.' },
  { slug: 'faceprep-campus',     html: 'faceprep-campus/client/index.html', base: '/', pub: 'faceprep-campus/client/public', theme: '#F14575', name: 'FACE Prep Campus', short: 'FACE Prep', desc: 'Placement-prep portal & campus ERP for FACE Prep @ AMET.' },

  // --- Vercel root-domain, Express + static SPA (public/ is the served root) ---
  { slug: 'ideabox',             html: 'ideabox/public/index.html',      base: '/', theme: '#FBF7EF', name: 'IdeaBox',                       short: 'IdeaBox',      desc: 'Capture ideas by voice or text, tag and triage them.' },
];

// ---- branded maskable icon: theme-tinted full-bleed bg + Syed-fire "S" -------
function luminance(hex) {
  let m = hex.replace('#', '');
  if (m.length === 3) m = m.split('').map((c) => c + c).join('');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function iconSVG(theme) {
  const lum = luminance(theme);
  // light bg or dark bg -> the warm gradient reads well; mid-tone bg -> white for contrast.
  const sFill = lum > 0.55 || lum < 0.25 ? 'url(#sg)' : '#ffffff';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF9656"/>
      <stop offset=".55" stop-color="#F14575"/>
      <stop offset="1" stop-color="#9270F4"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="${theme}"/>
  <text x="256" y="372" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="340" letter-spacing="-8" fill="${sFill}">S</text>
</svg>
`;
}

// ---- manifest ----------------------------------------------------------------
function manifestJSON(p) {
  const root = p.base === '/' ? '/' : '.';
  const icon = p.base === '/' ? '/icon.svg' : 'icon.svg';
  return JSON.stringify(
    {
      name: p.name,
      short_name: p.short,
      description: p.desc,
      start_url: root,
      scope: root,
      display: 'standalone',
      background_color: p.theme,
      theme_color: p.theme,
      icons: [{ src: icon, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    null,
    2,
  ) + '\n';
}

// ---- service worker (generic; only the cache-name slug is templated) ----------
// Derives its own scope from self.location, so this exact file is correct whether
// served at a domain root (/) or a GitHub Pages subpath (/<project>/).
function swJS(slug) {
  return `// GENERATED by research-suite/tools/pwa/inject.mjs — do not hand-edit; edit the source.
// Offline app-shell for the "${slug}" PWA. Bump the version suffix to force clients
// onto a fresh cache. Scope is derived from this worker's own URL, so the same code
// works at a domain root and under a /<project>/ path.
const PREFIX = 'syed-pwa-${slug}-';
const CACHE = PREFIX + 'v1';
const ROOT = new URL('./', self.location).href;          // scope root (absolute)
const SHELL = [ROOT, ROOT + 'manifest.webmanifest', ROOT + 'icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map((u) => c.add(u)));  // one 404 must not abort install
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // Only ever touch THIS project's caches — sibling projects can share our origin
    // (e.g. syahmedu.github.io), so never delete a cache that isn't ours.
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // cross-origin: untouched
  if (url.pathname.includes('/api/')) return;              // never cache API / auth traffic

  // Navigations: network-first (new deploys show up), cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(ROOT, cp)); return res; })
        .catch(() => caches.match(ROOT).then((r) => r || caches.match(req))),
    );
    return;
  }

  // Other same-origin assets: stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const cp = res.clone();
            caches.open(CACHE).then((c) => c.put(req, cp));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    }),
  );
});
`;
}

// ---- HTML injection ----------------------------------------------------------
function headBlock(p) {
  const man = p.base === '/' ? '/manifest.webmanifest' : 'manifest.webmanifest';
  const ico = p.base === '/' ? '/icon.svg' : 'icon.svg';
  return [
    '<!-- SYED-PWA -->',
    `<link rel="manifest" href="${man}">`,
    `<link rel="apple-touch-icon" href="${ico}">`,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    `<meta name="apple-mobile-web-app-title" content="${p.short}">`,
    '<!-- /SYED-PWA -->',
  ].join('\n');
}
function themeMeta(p) {
  return `<meta name="theme-color" content="${p.theme}">`;
}
function swBlock(p) {
  const sw = p.base === '/' ? '/sw.js' : 'sw.js';
  return [
    '<!-- SYED-PWA-SW -->',
    `<script>if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('${sw}').catch(function(){})})}</script>`,
    '<!-- /SYED-PWA-SW -->',
  ].join('\n');
}

function stripBlock(html, open, close) {
  const re = new RegExp(`\\s*${open}[\\s\\S]*?${close}`, 'g');
  return html.replace(re, '');
}
function insertBefore(html, tagRe, payload) {
  return html.replace(tagRe, `${payload}\n$&`);
}

function inject(p, html) {
  let out = stripBlock(html, '<!-- SYED-PWA -->', '<!-- /SYED-PWA -->');
  out = stripBlock(out, '<!-- SYED-PWA-SW -->', '<!-- /SYED-PWA-SW -->');

  // Add a theme-color meta only if the page doesn't already declare one.
  const hasTheme = /<meta[^>]+name=["']theme-color["']/i.test(out);
  const head = hasTheme ? headBlock(p) : `${themeMeta(p)}\n${headBlock(p)}`;

  if (/<\/head>/i.test(out)) out = insertBefore(out, /<\/head>/i, head);
  else return { out: null, why: 'no </head>' };

  if (/<\/body>/i.test(out)) out = insertBefore(out, /<\/body>/i, swBlock(p));
  else return { out: null, why: 'no </body>' };

  return { out, why: null };
}

function writeFile(abs, content) {
  if (DRY) return;
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

// ---- run ---------------------------------------------------------------------
let ok = 0;
const skipped = [];
for (const p of PROJECTS) {
  const htmlAbs = join(HOME, p.html);
  if (!existsSync(htmlAbs)) { skipped.push(`${p.slug}: missing ${p.html}`); continue; }

  const assetDir = p.pub ? join(HOME, p.pub) : dirname(htmlAbs);
  writeFile(join(assetDir, 'manifest.webmanifest'), manifestJSON(p));
  writeFile(join(assetDir, 'icon.svg'), iconSVG(p.theme));
  writeFile(join(assetDir, 'sw.js'), swJS(p.slug));

  const html = readFileSync(htmlAbs, 'utf8');
  const { out, why } = inject(p, html);
  if (!out) { skipped.push(`${p.slug}: ${why}`); continue; }
  if (out !== html) writeFile(htmlAbs, out);

  ok++;
  console.log(`  ${DRY ? '[dry] ' : ''}${p.slug.padEnd(20)} -> ${p.pub || dirname(p.html)} (base ${p.base})`);
}

console.log(`\n${DRY ? 'DRY RUN — ' : ''}stamped ${ok}/${PROJECTS.length} projects.`);
if (skipped.length) { console.log('skipped:'); for (const s of skipped) console.log('  - ' + s); }
