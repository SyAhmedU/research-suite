// build.mjs — the "construct mycelium" snapshot for the PaperCards hero (NO AI, No-fab).
//
// Reads the Research Book's HAND-CODED tier only:
//   syeds-research-book/data/memberships.json  (paper ↔ construct edges)
//   syeds-research-book/data/constructs.json   (codes + names)
// Non-construct codes (DROP_CODES) and clean labels (LABEL_OVERRIDE) are read out of
// syeds-research-book/scripts/build-construct-lexicon.mjs so there is one source of truth.
//
// Writes paperpulse/public/data/construct-web.json:
//   nodes  = the N most-coded constructs (n = hand-coded papers)
//   links  = pairs coded together on the same paper (w = number of such papers),
//            kept if among a node's strongest partners by normalised co-coding
//   groups = deterministic label-propagation over the kept links (from counts only)
//   x,y    = deterministic force layout in [0,1]² — position is layout, not data
//
// Run from the workspace root:  node research-suite/tools/mycelium/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BOOK = join(WS, 'syeds-research-book');
const OUT = join(WS, 'paperpulse', 'public', 'data', 'construct-web.json');
const read = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));
const N_NODES = 64, PER_NODE = 3, MIN_W = 4;

// ---- single source of truth for "is this a construct?" + clean labels
const lexSrc = readFileSync(join(BOOK, 'scripts', 'build-construct-lexicon.mjs'), 'utf8');
const grab = (re, what) => { const m = lexSrc.match(re); if (!m) throw new Error(`could not read ${what} from build-construct-lexicon.mjs`); return Function(`return (${m[1]})`)(); };
const DROP = new Set(grab(/const DROP_CODES = new Set\((\[[\s\S]*?\])\);/, 'DROP_CODES'));
const LABEL = grab(/const LABEL_OVERRIDE = (\{[\s\S]*?\n\});/, 'LABEL_OVERRIDE');
const cleanLabel = (code, name) => LABEL[code] || name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();

const constructs = read(join(BOOK, 'data', 'constructs.json'));
const nameOf = new Map(constructs.map((c) => [c.code, c.name]));
const mem = read(join(BOOK, 'data', 'memberships.json'));

const byPaper = new Map();
for (const { c, p } of mem) {
  if (DROP.has(c) || !nameOf.has(c)) continue;
  if (!byPaper.has(p)) byPaper.set(p, new Set());
  byPaper.get(p).add(c);
}
const n = new Map();
for (const set of byPaper.values()) for (const c of set) n.set(c, (n.get(c) || 0) + 1);
const top = [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, N_NODES).map(([c]) => c);
const idx = new Map(top.map((c, i) => [c, i]));

const co = new Map();
for (const set of byPaper.values()) {
  const cs = [...set].filter((c) => idx.has(c)).sort();
  for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
    const k = cs[a] + '|' + cs[b]; co.set(k, (co.get(k) || 0) + 1);
  }
}
const allPairs = [...co.entries()].map(([k, w]) => { const [a, b] = k.split('|'); return { a, b, w, s: w / Math.sqrt(n.get(a) * n.get(b)) }; });
const pairs = allPairs.filter((p) => p.w >= MIN_W);
// keep each node's strongest PER_NODE partners (by normalised strength) — the hyphae
const keep = new Set();
for (const c of top) pairs.filter((p) => p.a === c || p.b === c).sort((x, y) => y.s - x.s || y.w - x.w).slice(0, PER_NODE).forEach((p) => keep.add(p.a + '|' + p.b));
// no construct floats alone: one with no partner above MIN_W keeps its single strongest real pair
for (const c of top) if (![...keep].some((k) => k.split('|').includes(c))) {
  const best = allPairs.filter((p) => p.a === c || p.b === c).sort((x, y) => y.w - x.w)[0];
  if (best) keep.add(best.a + '|' + best.b);
}
const links = allPairs.filter((p) => keep.has(p.a + '|' + p.b));

// ---- deterministic label propagation (weighted, fixed order, ties → smaller index)
const adj = top.map(() => []);
for (const l of links) { adj[idx.get(l.a)].push([idx.get(l.b), l.w]); adj[idx.get(l.b)].push([idx.get(l.a), l.w]); }
let lab = top.map((_, i) => i);
for (let it = 0; it < 30; it++) {
  let changed = false;
  for (let i = 0; i < top.length; i++) {
    const score = new Map();
    for (const [j, w] of adj[i]) score.set(lab[j], (score.get(lab[j]) || 0) + w);
    if (!score.size) continue;
    const best = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
    if (best !== lab[i]) { lab[i] = best; changed = true; }
  }
  if (!changed) break;
}
const groupIds = [...new Set(lab)].sort((a, b) => lab.filter((x) => x === b).length - lab.filter((x) => x === a).length);
const group = lab.map((l) => groupIds.indexOf(l));

// ---- deterministic force layout (Fruchterman–Reingold-ish, seeded on a circle by group)
const N = top.length;
const AR = 2.4;                                        // lay out in a wide box (the hero band), not a square
const P = top.map((_, i) => { const g = group[i], a = (g / groupIds.length) * Math.PI * 2 + i * 0.37; return [AR / 2 + AR * 0.3 * Math.cos(a), 0.5 + 0.3 * Math.sin(a)]; });
const k = 0.62 * Math.sqrt(AR / N);
for (let it = 0; it < 900; it++) {
  const t = 0.06 * (1 - it / 900) + 0.002;
  const D = top.map(() => [0, 0]);
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d = Math.max(1e-3, Math.hypot(dx, dy)), f = (k * k) / d;
    D[i][0] += (dx / d) * f; D[i][1] += (dy / d) * f; D[j][0] -= (dx / d) * f; D[j][1] -= (dy / d) * f;
  }
  for (const l of links) {
    const i = idx.get(l.a), j = idx.get(l.b), dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d = Math.max(1e-3, Math.hypot(dx, dy));
    const f = ((d * d) / k) * (0.5 + l.s * 2);
    D[i][0] -= (dx / d) * f; D[i][1] -= (dy / d) * f; D[j][0] += (dx / d) * f; D[j][1] += (dy / d) * f;
  }
  for (let i = 0; i < N; i++) {
    D[i][0] += (AR / 2 - P[i][0]) * 0.035; D[i][1] += (0.5 - P[i][1]) * 0.08;   // gravity, stronger vertically
    const d = Math.max(1e-6, Math.hypot(D[i][0], D[i][1]));
    P[i][0] += (D[i][0] / d) * Math.min(d, t); P[i][1] += (D[i][1] / d) * Math.min(d, t);
  }
}
// normalise into [0.04, 0.96]²
// percentile bounds so one far node can't squash the rest; clamp into the frame
const q = (arr, t) => { const a = [...arr].sort((x, y) => x - y); return a[Math.round(t * (a.length - 1))]; };
const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
const [x0, x1, y0, y1] = [q(xs, 0.02), q(xs, 0.98), q(ys, 0.02), q(ys, 0.98)];
const cl = (v) => Math.max(0, Math.min(1, v));
const nx = (v) => +(0.05 + cl((v - x0) / (x1 - x0)) * 0.9).toFixed(4), ny = (v) => +(0.08 + cl((v - y0) / (y1 - y0)) * 0.84).toFixed(4);

const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "Syed's Research Book — hand-coded paper↔construct memberships only. Link weight = papers hand-coded to both constructs.",
  url: 'https://syahmedu.github.io/syeds-research-book/',
  papers: byPaper.size,
  constructsInCorpus: n.size,
  nodes: top.map((c, i) => ({ code: c, label: cleanLabel(c, nameOf.get(c)), name: nameOf.get(c), n: n.get(c), g: group[i], x: nx(P[i][0]), y: ny(P[i][1]) })),
  links: links.map((l) => ({ a: idx.get(l.a), b: idx.get(l.b), w: l.w })),
  groups: groupIds.length,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`[mycelium] ${out.nodes.length} constructs (of ${n.size}, ${DROP.size} non-construct codes dropped), ${out.links.length} links, ${out.groups} groups, from ${byPaper.size} hand-coded papers`);
for (let g = 0; g < out.groups; g++) console.log(`  g${g}: ${out.nodes.filter((x) => x.g === g).sort((a, b) => b.n - a.n).slice(0, 5).map((x) => x.label).join(' · ')}`);
