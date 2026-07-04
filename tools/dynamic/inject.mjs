// syed-dynamic injector — the "rich but tasteful" motion layer (2026-07-04
// design-elevation wave 1). Stamps four effects into every live project:
//   1. orchestrated page entrance (one soft fade on load)
//   2. staggered scroll-reveals for below-the-fold cards/sections
//   3. count-up animation on bare-number stats (final text restored VERBATIM —
//      no-fab safe; year-like integers skipped)
//   4. hover depth on card-shaped elements that don't already animate transform
// Plus brand-coloured :focus-visible and smooth anchor scrolling.
// Everything transform/opacity-only; every failure mode ends "content visible"
// (classes added by JS, IntersectionObserver failsafes, print + reduced-motion
// overrides). NO particles, NO confetti, NO cursor-reactive effects.
// Opt-out: [data-no-dynamic] on any ancestor. Opt-in reveal: [data-reveal].
// Re-run after changing the snippet:  node tools/dynamic/inject.mjs
//
// HTML projects get an inline <script> between SYED-DYNAMIC markers (idempotent
// replace); Vite projects get src/dynamic.{ts,js} + an import after ./ambient.
// Excluded: cadence + karmamap (untouched-by-design per CLAUDE.md), letters +
// runway (private), timetable-generator / faceprep-campus / campusdesk (wave 2,
// hand-wire after inspection), throughline-studio (native motion system).
import fs from 'fs';
import path from 'path';

const HOME = 'C:/Users/Syed Asrar';

const PROJECTS = [
  { kind: 'html', file: 'nexus/index.html', slug: 'nexus' },
  { kind: 'html', file: 'research-suite/index.html', slug: 'research-suite' },
  { kind: 'html', file: 'journaltime/index.html', slug: 'journaltime' },
  { kind: 'html', file: 'scholarscope/index.html', slug: 'scholarscope' },
  { kind: 'html', file: 'syeds-research-book/index.html', slug: 'syeds-research-book' },
  { kind: 'html', file: 'bookscope/index.html', slug: 'bookscope' },
  { kind: 'html', file: 'fallacyscope/index.html', slug: 'fallacyscope' },
  { kind: 'html', file: 'ideabox/public/index.html', slug: 'ideabox' },
  { kind: 'html', file: 'career-compass/index.html', slug: 'career-compass' },
  { kind: 'html', file: 'bachelor-meal-plan/index.html', slug: 'bachelor-meal-plan' },
  { kind: 'html', file: 'callback/index.html', slug: 'callback' },
  { kind: 'html', file: 'greenroom/index.html', slug: 'greenroom' },
  { kind: 'html', file: 'mirrorscope/index.html', slug: 'mirrorscope' },
  { kind: 'html', file: 'throughline-cs/index.html', slug: 'throughline-cs' },
  { kind: 'vite', entry: 'researchflow/src/main.tsx', mod: 'researchflow/src/dynamic.ts', slug: 'researchflow' },
  { kind: 'vite', entry: 'theoryscope/src/main.tsx', mod: 'theoryscope/src/dynamic.ts', slug: 'theoryscope' },
  { kind: 'vite', entry: 'scalebase/client/src/main.tsx', mod: 'scalebase/client/src/dynamic.ts', slug: 'scalescope' },
  { kind: 'vite', entry: 'toolsscope/src/main.tsx', mod: 'toolsscope/src/dynamic.ts', slug: 'toolsscope' },
  { kind: 'vite', entry: 'paperpulse/src/main.tsx', mod: 'paperpulse/src/dynamic.ts', slug: 'papercards' },
  { kind: 'vite', entry: 'tracewise/src/main.tsx', mod: 'tracewise/src/dynamic.ts', slug: 'tracewise' },
  { kind: 'vite', entry: 'task-manager/client/src/main.jsx', mod: 'task-manager/client/src/dynamic.js', slug: 'taskflow' },
];

function snippetJs() {
  return `(function () {
  if (typeof document === 'undefined' || document.getElementById('syed-dynamic')) return;
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = ':where(a,button,input,select,textarea,summary,[role=button]):focus-visible{outline:2px solid #F14575;outline-offset:2px}';
  if (!RM) css += [
    'html{scroll-behavior:smooth}',
    '@keyframes sdyn-page{from{opacity:0}to{opacity:1}}',
    '.sdyn-in body{animation:sdyn-page .45s ease-out both}',
    '.sdyn-hide{opacity:0;transform:translateY(16px)}',
    '.sdyn-show{opacity:1;transform:none;transition:opacity .65s cubic-bezier(.22,1,.36,1) var(--sdyn-d,0ms),transform .65s cubic-bezier(.22,1,.36,1) var(--sdyn-d,0ms)}',
    '@media (hover:hover){.sdyn-lift{transition:transform .28s cubic-bezier(.22,1,.36,1),box-shadow .28s cubic-bezier(.22,1,.36,1)}.sdyn-lift:hover{transform:translateY(-3px);box-shadow:0 2px 8px rgba(20,17,28,.08),0 14px 32px -12px rgba(146,112,244,.30)}}',
    '@media print{.sdyn-hide{opacity:1!important;transform:none!important}}'
  ].join('');
  var style = document.createElement('style');
  style.id = 'syed-dynamic';
  style.textContent = css;
  document.head.appendChild(style);
  if (RM) return;
  document.documentElement.classList.add('sdyn-in');

  var SEL = '[data-reveal],section,article,[class*="card" i],[class*="tile"],[class*="panel"],[class*="station"],[class*="feature"]';

  function countUp() {
    var cand = document.querySelectorAll('[data-count],[class*="stat"],[class*="metric"],[class*="kpi"],[class*="count" i]');
    var list = [];
    for (var i = 0; i < cand.length && list.length < 40; i++) {
      var el = cand[i];
      if (el.children.length || el.closest('[data-no-dynamic]')) continue;
      var t = (el.textContent || '').trim();
      if (!t || t.length > 14) continue;
      var m = /^([^0-9+-]{0,3})([0-9][0-9,]*)(\\.[0-9]+)?( ?[%+kKMx\\u00d7]?)$/.exec(t);
      if (!m) continue;
      var v = parseFloat(m[2].replace(/,/g, '') + (m[3] || ''));
      if (!v) continue;
      if (!m[1] && !m[3] && !m[4].trim() && m[2].indexOf(',') === -1 && v >= 1900 && v <= 2099) continue;
      list.push({ el: el, t: t, v: v, pre: m[1], dec: m[3] ? m[3].length - 1 : 0, suf: m[4], sep: m[2].indexOf(',') !== -1 });
    }
    if (!list.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var d = en.target.__sdyn;
        if (!d || d.done) return;
        d.done = true;
        var t0 = performance.now(), DUR = 900;
        requestAnimationFrame(function tick(now) {
          var p = Math.min((now - t0) / DUR, 1), e = 1 - Math.pow(1 - p, 3);
          if (p >= 1) { d.el.textContent = d.t; return; }
          var cur = d.v * e;
          var s = d.dec ? cur.toFixed(d.dec) : (d.sep ? Math.round(cur).toLocaleString('en-US') : String(Math.round(cur)));
          d.el.textContent = d.pre + s + d.suf;
          requestAnimationFrame(tick);
        });
      });
    }, { threshold: 0.4 });
    list.forEach(function (d) { d.el.__sdyn = d; io.observe(d.el); });
  }

  function arm() {
    if (!('IntersectionObserver' in window)) return;
    try {
      var vh = window.innerHeight, vw = window.innerWidth;
      var els = document.querySelectorAll(SEL);
      var reveal = [];
      for (var i = 0; i < els.length && reveal.length < 140; i++) {
        var el = els[i];
        if (el.closest('[data-no-dynamic]') || el.closest('#syed-ambient')) continue;
        var cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.position === 'sticky' || cs.display === 'none') continue;
        var r = el.getBoundingClientRect();
        if (r.height < 24 || r.width < 40 || r.height > vh * 0.9) continue;
        if (r.height < vh * 0.7 && r.width < vw * 0.92 && !/transform|all/.test(cs.transitionProperty)) el.classList.add('sdyn-lift');
        if (r.top > vh * 0.88 && !el.closest('.sdyn-hide')) { el.classList.add('sdyn-hide'); reveal.push(el); }
      }
      if (reveal.length) {
        var io = new IntersectionObserver(function (entries) {
          var n = 0;
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var t = en.target;
            io.unobserve(t);
            t.style.setProperty('--sdyn-d', (Math.min(n++, 5) * 70) + 'ms');
            t.classList.add('sdyn-show');
            setTimeout(function () { t.classList.remove('sdyn-hide', 'sdyn-show'); t.style.removeProperty('--sdyn-d'); }, 1500);
          });
        }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
        reveal.forEach(function (el) { io.observe(el); });
        window.addEventListener('beforeprint', function () {
          reveal.forEach(function (el) { el.classList.remove('sdyn-hide', 'sdyn-show'); });
        });
      }
      countUp();
    } catch (e) { /* never break the host page */ }
  }

  function boot() { setTimeout(arm, 350); }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();`;
}

const OPEN = '<!-- SYED-DYNAMIC (generated by research-suite/tools/dynamic/inject.mjs - edit there) -->';
const CLOSE = '<!-- /SYED-DYNAMIC -->';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let changed = 0;
for (const p of PROJECTS) {
  if (p.kind === 'html') {
    const file = path.join(HOME, p.file);
    let html = fs.readFileSync(file, 'utf8');
    const block = `${OPEN}\n<script>\n${snippetJs()}\n</script>\n${CLOSE}`;
    const re = new RegExp(`${esc(OPEN)}[\\s\\S]*?${esc(CLOSE)}`);
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
      (p.mod.endsWith('.ts') ? '// @ts-nocheck — generated plain JS\n' : '') +
      '// syed-dynamic — rich-but-tasteful motion layer (generated by\n// research-suite/tools/dynamic/inject.mjs — edit there, then re-run).\n';
    const footer = p.mod.endsWith('.ts') ? '\nexport {}\n' : '\n';
    fs.writeFileSync(modFile, header + snippetJs() + footer);
    const entryFile = path.join(HOME, p.entry);
    let entry = fs.readFileSync(entryFile, 'utf8');
    if (!entry.includes('./dynamic')) {
      if (entry.includes("import './ambient'")) {
        entry = entry.replace("import './ambient'", "import './ambient'\nimport './dynamic'");
      } else if (entry.includes("import './juice'")) {
        entry = entry.replace("import './juice'", "import './juice'\nimport './dynamic'");
      } else {
        throw new Error(`${p.entry}: no ambient/juice import anchor`);
      }
      fs.writeFileSync(entryFile, entry);
    }
    console.log(`vite  ${p.slug}`);
    changed++;
  }
}
console.log(`done — ${changed} projects stamped`);
