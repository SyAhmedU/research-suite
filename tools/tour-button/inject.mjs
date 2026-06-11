// syed-tour injector — stamps a self-contained "▶ Tour" button + video
// lightbox into every live project. The videos are the narrated per-project
// tours rendered from E:\video\throughline-explainer (ProjectTour comp) and
// served from the SyAhmedU/throughline-media Pages repo (kept out of app
// repos). Re-run after changing the snippet: node tools/tour-button/inject.mjs
//
// HTML projects get an inline <script> between SYED-TOUR markers (idempotent
// replace); Vite projects get src/tour.{ts,js} + an import in the entry file.
// timetable-generator (Next.js) is wired by hand in app/layout.tsx.
import fs from 'fs';
import path from 'path';

const HOME = 'C:/Users/Syed Asrar';
const BASE = 'https://syahmedu.github.io/throughline-media/videos/tours/';

// guard: cadence participants arrive with the study config in the hash —
// never show the tour button over a running survey.
const PROJECTS = [
  { kind: 'html', file: 'journaltime/index.html', slug: 'journaltime', name: 'JournalTime' },
  { kind: 'html', file: 'scholarscope/index.html', slug: 'scholarscope', name: 'ScholarScope' },
  { kind: 'html', file: 'syeds-research-book/index.html', slug: 'syeds-research-book', name: "Syed's Research Book" },
  { kind: 'html', file: 'bookscope/index.html', slug: 'bookscope', name: 'BookScope' },
  { kind: 'html', file: 'fallacyscope/index.html', slug: 'fallacyscope', name: 'FallacyScope' },
  { kind: 'html', file: 'cadence/index.html', slug: 'cadence', name: 'Cadence', guard: 'if (location.hash) return;' },
  { kind: 'html', file: 'ideabox/public/index.html', slug: 'ideabox', name: 'IdeaBox' },
  { kind: 'html', file: 'career-compass/index.html', slug: 'career-compass', name: 'Career Compass' },
  { kind: 'html', file: 'bachelor-meal-plan/index.html', slug: 'bachelor-meal-plan', name: 'Bachelor Meal Plan', bottom: '84px' },
  { kind: 'html', file: 'throughline-cs/index.html', slug: 'throughline-cs', name: 'Throughline CS' },
  { kind: 'vite', entry: 'researchflow/src/main.tsx', tour: 'researchflow/src/tour.ts', slug: 'researchflow', name: 'ResearchFlow' },
  { kind: 'vite', entry: 'theoryscope/src/main.tsx', tour: 'theoryscope/src/tour.ts', slug: 'theoryscope', name: 'TheoryScope' },
  { kind: 'vite', entry: 'scalebase/client/src/main.tsx', tour: 'scalebase/client/src/tour.ts', slug: 'scalescope', name: 'ScaleScope' },
  { kind: 'vite', entry: 'toolsscope/src/main.tsx', tour: 'toolsscope/src/tour.ts', slug: 'toolsscope', name: 'ToolsScope' },
  { kind: 'vite', entry: 'tracewise/src/main.tsx', tour: 'tracewise/src/tour.ts', slug: 'tracewise', name: 'Tracewise' },
  { kind: 'vite', entry: 'karmamap/client/src/main.jsx', tour: 'karmamap/client/src/tour.js', slug: 'karmamap', name: 'KarmaMap' },
  { kind: 'vite', entry: 'task-manager/client/src/main.jsx', tour: 'task-manager/client/src/tour.js', slug: 'taskflow', name: 'TaskFlow' },
];

function snippetJs({ slug, name, bottom = '18px', guard = '', ts = false }) {
  const keyType = ts ? ': KeyboardEvent' : '';
  const clickType = ts ? ': MouseEvent' : '';
  return `(function () {
  ${guard ? guard + '\n  ' : ''}var SLUG = '${slug}';
  var NAME = ${JSON.stringify(name)};
  var BASE = '${BASE}';
  function init() {
    if (document.getElementById('syed-tour-btn') || !document.body) return;
    var btn = document.createElement('button');
    btn.id = 'syed-tour-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Watch the ' + NAME + ' tour');
    btn.style.cssText = 'position:fixed;right:18px;bottom:${bottom};z-index:9000;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;border:1px solid rgba(203,184,232,.4);background:rgba(21,16,31,.88);color:#f3eefc;font:600 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 4px 18px rgba(0,0,0,.35)';
    btn.innerHTML = '<span style="display:inline-grid;place-items:center;width:18px;height:18px;border-radius:999px;background:linear-gradient(135deg,#FF9656,#F14575 55%,#9270F4);color:#fff;font-size:8px;line-height:1">\\u25B6</span><span>Tour</span>';
    btn.addEventListener('click', open);
    document.body.appendChild(btn);
  }
  function open() {
    if (document.getElementById('syed-tour-box')) return;
    var bd = document.createElement('div');
    bd.id = 'syed-tour-box';
    bd.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,5,14,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:grid;place-items:center;padding:24px';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'width:min(1100px,94vw);display:flex;flex-direction:column;gap:10px';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', NAME + ' narrated tour');
    var v = document.createElement('video');
    v.src = BASE + SLUG + '.mp4';
    v.poster = BASE + 'posters/' + SLUG + '.jpg';
    v.controls = true; v.autoplay = true; v.playsInline = true;
    v.style.cssText = 'width:100%;border-radius:16px;border:1px solid rgba(203,184,232,.3);background:#000';
    var x = document.createElement('button');
    x.type = 'button';
    x.textContent = 'Close \\u2715';
    x.style.cssText = 'align-self:flex-end;padding:6px 14px;border-radius:999px;border:1px solid rgba(203,184,232,.4);background:transparent;color:#cbb8e8;font:600 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer';
    function close() { bd.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e${keyType}) { if (e.key === 'Escape') close(); }
    bd.addEventListener('click', function (e${clickType}) { if (e.target === bd) close(); });
    x.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    wrap.appendChild(v); wrap.appendChild(x); bd.appendChild(wrap);
    document.body.appendChild(bd);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();`;
}

const OPEN = '<!-- SYED-TOUR (generated by research-suite/tools/tour-button/inject.mjs - edit there) -->';
const CLOSE = '<!-- /SYED-TOUR -->';

let changed = 0;
for (const p of PROJECTS) {
  if (p.kind === 'html') {
    const file = path.join(HOME, p.file);
    let html = fs.readFileSync(file, 'utf8');
    const block = `${OPEN}\n<script>\n${snippetJs(p)}\n</script>\n${CLOSE}`;
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
    const tourFile = path.join(HOME, p.tour);
    const header = `// syed-tour — "Watch the tour" button + lightbox (generated by\n// research-suite/tools/tour-button/inject.mjs — edit there, then re-run).\n`;
    fs.writeFileSync(tourFile, header + snippetJs({ ...p, ts: p.tour.endsWith('.ts') }) + '\n');
    const entryFile = path.join(HOME, p.entry);
    let entry = fs.readFileSync(entryFile, 'utf8');
    if (!entry.includes("./tour")) {
      entry = entry.replace("import './juice'", "import './juice'\nimport './tour'");
      if (!entry.includes("./tour")) throw new Error(`${p.entry}: no juice import anchor`);
      fs.writeFileSync(entryFile, entry);
    }
    console.log(`vite  ${p.slug}`);
    changed++;
  }
}
console.log(`done: ${changed} projects stamped`);
