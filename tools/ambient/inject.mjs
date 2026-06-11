// syed-ambient injector — stamps the living ambient backdrop (three brand-hued
// aurora blobs in slow infinite drift + a faint conic sheen rotating forever +
// the throughline flowing endlessly across the background) into every live
// project. Purely ambient, never cursor-reactive; hidden under
// prefers-reduced-motion and in print. Re-run after changing the snippet:
//   node tools/ambient/inject.mjs
//
// HTML projects get an inline <script> between SYED-AMBIENT markers (idempotent
// replace); Vite projects get src/ambient.{ts,js} + an import in the entry file.
// Excluded: throughline-studio (native React Ambient component),
// research-suite (WebGL aurora already mounted), nexus (WebGL backdrop),
// cadence (participant-facing instrument), karmamap (full-bleed data-viz).
import fs from 'fs';
import path from 'path';

const HOME = 'C:/Users/Syed Asrar';

const PROJECTS = [
  { kind: 'html', file: 'journaltime/index.html', slug: 'journaltime' },
  { kind: 'html', file: 'scholarscope/index.html', slug: 'scholarscope' },
  { kind: 'html', file: 'syeds-research-book/index.html', slug: 'syeds-research-book' },
  { kind: 'html', file: 'bookscope/index.html', slug: 'bookscope' },
  { kind: 'html', file: 'fallacyscope/index.html', slug: 'fallacyscope' },
  { kind: 'html', file: 'ideabox/public/index.html', slug: 'ideabox' },
  { kind: 'html', file: 'career-compass/index.html', slug: 'career-compass' },
  { kind: 'html', file: 'bachelor-meal-plan/index.html', slug: 'bachelor-meal-plan' },
  { kind: 'vite', entry: 'researchflow/src/main.tsx', mod: 'researchflow/src/ambient.ts', slug: 'researchflow' },
  { kind: 'vite', entry: 'theoryscope/src/main.tsx', mod: 'theoryscope/src/ambient.ts', slug: 'theoryscope' },
  { kind: 'vite', entry: 'scalebase/client/src/main.tsx', mod: 'scalebase/client/src/ambient.ts', slug: 'scalescope' },
  { kind: 'vite', entry: 'toolsscope/src/main.tsx', mod: 'toolsscope/src/ambient.ts', slug: 'toolsscope' },
  { kind: 'vite', entry: 'paperpulse/src/main.tsx', mod: 'paperpulse/src/ambient.ts', slug: 'papercards' },
  { kind: 'vite', entry: 'tracewise/src/main.tsx', mod: 'tracewise/src/ambient.ts', slug: 'tracewise' },
  { kind: 'vite', entry: 'task-manager/client/src/main.jsx', mod: 'task-manager/client/src/ambient.js', slug: 'taskflow' },
];

// The snippet: one self-installing block. CSS + DOM, idempotent, no deps.
// Blobs use gradient falloff (no filter blur) and transform-only animation,
// so the whole layer is compositor-friendly.
function snippetJs() {
  return `(function () {
  if (typeof document === 'undefined' || document.getElementById('syed-ambient')) return;
  var css = [
    '#syed-ambient{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
    '#syed-ambient i{position:absolute;display:block;border-radius:50%;will-change:transform}',
    '#syed-ambient .sa-a{width:58vmax;height:58vmax;left:-16vmax;top:-20vmax;background:radial-gradient(circle,rgba(255,150,86,.17),transparent 62%);animation:sa-a 30s ease-in-out infinite alternate}',
    '#syed-ambient .sa-b{width:52vmax;height:52vmax;right:-18vmax;top:-2vmax;background:radial-gradient(circle,rgba(146,112,244,.17),transparent 62%);animation:sa-b 38s ease-in-out infinite alternate}',
    '#syed-ambient .sa-c{width:48vmax;height:48vmax;left:24vmax;bottom:-26vmax;background:radial-gradient(circle,rgba(241,69,117,.13),transparent 62%);animation:sa-c 46s ease-in-out infinite alternate}',
    '@keyframes sa-a{to{transform:translate(10vmax,8vmax) scale(1.15)}}',
    '@keyframes sa-b{to{transform:translate(-12vmax,10vmax) scale(.9)}}',
    '@keyframes sa-c{to{transform:translate(-9vmax,-9vmax) scale(1.18)}}',
    '#syed-ambient .sa-sheen{inset:-35%;width:auto;height:auto;border-radius:0;background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,rgba(241,69,117,.04) 50deg,transparent 110deg,rgba(146,112,244,.038) 215deg,transparent 280deg);animation:sa-spin 90s linear infinite}',
    '@keyframes sa-spin{to{transform:rotate(360deg)}}',
    '#syed-ambient svg{position:absolute;inset:0;width:100%;height:100%;opacity:.45}',
    '#syed-ambient svg path{fill:none;stroke:url(#syedAmbGrad);stroke-width:1.5;stroke-linecap:round;vector-effect:non-scaling-stroke;opacity:.32;stroke-dasharray:7 43;animation:sa-flow 26s linear infinite}',
    '@keyframes sa-flow{to{stroke-dashoffset:-100}}',
    "[data-theme='light'] #syed-ambient{opacity:.55}",
    '@media (prefers-reduced-motion: reduce){#syed-ambient{display:none}}',
    '@media print{#syed-ambient{display:none}}'
  ].join('');
  function init() {
    if (!document.body || document.getElementById('syed-ambient')) return;
    var style = document.createElement('style');
    style.id = 'syed-ambient-css';
    style.textContent = css;
    document.head.appendChild(style);
    var d = document.createElement('div');
    d.id = 'syed-ambient';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML =
      '<i class="sa-a"></i><i class="sa-b"></i><i class="sa-c"></i><i class="sa-sheen"></i>' +
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs>' +
      '<linearGradient id="syedAmbGrad" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#FF9656"/><stop offset=".5" stop-color="#F14575"/><stop offset="1" stop-color="#9270F4"/>' +
      '</linearGradient></defs>' +
      '<path d="M -4 82 C 20 66, 32 94, 52 72 C 68 54, 76 30, 104 14" pathLength="100"/></svg>';
    document.body.insertBefore(d, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();`;
}

const OPEN = '<!-- SYED-AMBIENT (generated by research-suite/tools/ambient/inject.mjs - edit there) -->';
const CLOSE = '<!-- /SYED-AMBIENT -->';

let changed = 0;
for (const p of PROJECTS) {
  if (p.kind === 'html') {
    const file = path.join(HOME, p.file);
    let html = fs.readFileSync(file, 'utf8');
    const block = `${OPEN}\n<script>\n${snippetJs()}\n</script>\n${CLOSE}`;
    const re = new RegExp(`${OPEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${CLOSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    if (re.test(html)) {
      html = html.replace(re, block);
    } else {
      const i = html.lastIndexOf('</body>');
      if (i === -1) throw new Error(`${p.file}: no </body>`);
      html = html.slice(0, i) + block + '\n' + html.slice(i);
    }
    fs.writeFileSync(file, html);
    console.log(`html  ${p.slug}`);
    changed++;
  } else {
    const modFile = path.join(HOME, p.mod);
    const header =
      '// syed-ambient — living ambient backdrop (generated by\n// research-suite/tools/ambient/inject.mjs — edit there, then re-run).\n';
    const footer = p.mod.endsWith('.ts') ? '\nexport {}\n' : '\n';
    fs.writeFileSync(modFile, header + snippetJs() + footer);
    const entryFile = path.join(HOME, p.entry);
    let entry = fs.readFileSync(entryFile, 'utf8');
    if (!entry.includes('./ambient')) {
      entry = entry.replace("import './juice'", "import './juice'\nimport './ambient'");
      if (!entry.includes('./ambient')) throw new Error(`${p.entry}: no juice import anchor`);
      fs.writeFileSync(entryFile, entry);
    }
    console.log(`vite  ${p.slug}`);
    changed++;
  }
}
console.log(`done — ${changed} projects stamped`);
