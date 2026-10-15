// build.mjs — the "corpus river" snapshot for the hub hero (NO AI, No-fab).
//
// Reads the hand-coded Research Book (syeds-research-book/data/papers.index.json
// + constructs.json) and writes research-suite/data/corpus-river.json:
//   per construct, per year, the paper weight it carries. A paper coded to k
//   constructs contributes 1/k to each, so every year's streams sum EXACTLY to
//   that year's real paper count (river width = papers, never double-counted).
// Recent / imported tiers are never read — this is the verified, hand-coded moat.
//
// Run from the workspace root:  node research-suite/tools/river/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WS = join(HERE, '..', '..', '..');
const BOOK = join(WS, 'syeds-research-book', 'data');
const OUT = join(WS, 'research-suite', 'data', 'corpus-river.json');
const read = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));

const Y0 = 1990, Y1 = 2024;          // drawn span; earlier years are a thin trickle (counted in `before`)
const papers = read(join(BOOK, 'papers.index.json'));
const constructs = read(join(BOOK, 'constructs.json'));
const nameOf = new Map(constructs.map((c) => [c.code, c.name]));

const years = [];
for (let y = Y0; y <= Y1; y++) years.push(y);
const series = new Map();            // code -> Float64Array(years)  (fractional weight → width)
const counts = new Map();            // code -> Int32Array(years)    (papers coded to it → readout)
const papersByYear = new Array(years.length).fill(0);
let before = 0, after = 0, noYear = 0, uncoded = 0;

for (const p of papers) {
  const y = +p.year;
  if (!y) { noYear++; continue; }
  if (y < Y0) { before++; continue; }
  if (y > Y1) { after++; continue; }
  const codes = [...new Set(p.constructCodes || [])].filter((c) => nameOf.has(c));
  if (!codes.length) { uncoded++; continue; }
  const yi = y - Y0;
  papersByYear[yi]++;
  for (const c of codes) {
    if (!series.has(c)) series.set(c, new Float64Array(years.length));
    series.get(c)[yi] += 1 / codes.length;
    if (!counts.has(c)) counts.set(c, new Int32Array(years.length));
    counts.get(c)[yi]++;
  }
}

const streams = [...series.entries()].map(([code, s]) => {
  let total = 0, peak = 0, peakYear = Y0, onset = null, wy = 0;
  s.forEach((v, i) => {
    total += v; wy += v * years[i];
    if (v > peak) { peak = v; peakYear = years[i]; }
    if (onset === null && v > 0) onset = years[i];
  });
  return {
    code, name: nameOf.get(code), total: +total.toFixed(2), peakYear, onset,
    meanYear: +(wy / total).toFixed(2),   // weighted average year of its papers — drives colour
    s: [...s].map((v) => +v.toFixed(2)),
    c: [...counts.get(code)],
  };
}).sort((a, b) => b.total - a.total);

const drawn = papersByYear.reduce((a, b) => a + b, 0);
const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "Syed's Research Book — hand-coded tier only (papers.index.json). Each paper's weight is split 1/k across its k constructs.",
  url: 'https://syahmedu.github.io/syeds-research-book/',
  totalPapers: papers.length,
  drawn, before, after, noYear, uncoded,
  years, papersByYear,
  // coding of the corpus ran into mid-2024 — the last year is a partial year, not a decline
  partialYears: [2024],
  streams,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
// self-check: every year's streams must sum to that year's paper count
for (let i = 0; i < years.length; i++) {
  const sum = streams.reduce((a, st) => a + st.s[i], 0);
  if (Math.abs(sum - papersByYear[i]) > 0.6) throw new Error(`year ${years[i]}: streams ${sum} ≠ papers ${papersByYear[i]}`);
}
console.log(`[river] ${streams.length} constructs · ${drawn} papers drawn ${Y0}–${Y1} (before ${before}, after ${after}, no year ${noYear}, uncoded ${uncoded}) of ${papers.length}`);
console.log(`[river] top: ${streams.slice(0, 8).map((s) => `${s.name} (${Math.round(s.total)}, mean ${s.meanYear})`).join(' · ')}`);
console.log(`[river] wrote ${OUT} (${(JSON.stringify(out).length / 1024).toFixed(1)} kB)`);
