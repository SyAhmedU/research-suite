// build.mjs — the "corpus tree" snapshot for the hub hero (NO AI, No-fab).
//
// Reads the hand-coded Research Book (syeds-research-book/data/papers.index.json +
// constructs.json) and writes:
//   research-suite/data/corpus-tree.json     — per construct: papers per year, and every
//                                              construct it was co-coded with on the same paper
//   research-suite/data/tree/<code>.json     — per construct: the real joint papers behind its
//                                              top partners (title, year, DOI, journal), lazy-loaded
// "Co-coded" = the CM hand-coded both constructs on that paper. Recent / imported tiers
// (machine-matched) are never read — this is the verified, hand-coded moat.
//
// Run from the workspace root:  node research-suite/tools/tree/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WS = join(HERE, '..', '..', '..');
const BOOK = join(WS, 'syeds-research-book', 'data');
const OUT = join(WS, 'research-suite', 'data', 'corpus-tree.json');
const SHARDS = join(WS, 'research-suite', 'data', 'tree');
const read = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));

const TOP = 16;                          // partners drawn as branches (the shard carries their papers)
const Y0 = 1990, Y1 = 2024;
const papers = read(join(BOOK, 'papers.index.json'));
const constructs = read(join(BOOK, 'constructs.json'));
const nameOf = new Map(constructs.map((c) => [c.code, c.name]));

const years = []; for (let y = Y0; y <= Y1; y++) years.push(y);
const C = new Map();                     // code -> { n, y: Int32Array, before, noYear, ids: [] }
const pair = new Map();                  // "a|b" (sorted) -> [paperIdx]
let uncoded = 0;
const get = (c) => { if (!C.has(c)) C.set(c, { n: 0, y: new Int32Array(years.length), before: 0, after: 0, noYear: 0 }); return C.get(c); };

papers.forEach((p, idx) => {
  const codes = [...new Set(p.constructCodes || [])].filter((c) => nameOf.has(c)).sort();
  if (!codes.length) { uncoded++; return; }
  const y = +p.year || 0;
  for (const c of codes) {
    const r = get(c); r.n++;
    if (!y) r.noYear++; else if (y < Y0) r.before++; else if (y > Y1) r.after++; else r.y[y - Y0]++;
  }
  for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) {
    const k = codes[i] + '|' + codes[j];
    if (!pair.has(k)) pair.set(k, []);
    pair.get(k).push(idx);
  }
});

// partners per construct: [code, joint papers, first year together]
const partners = new Map([...C.keys()].map((c) => [c, []]));
for (const [k, ids] of pair) {
  const [a, b] = k.split('|');
  const ys = ids.map((i) => +papers[i].year).filter(Boolean);
  const first = ys.length ? Math.min(...ys) : null;
  partners.get(a).push({ code: b, ids, first });
  partners.get(b).push({ code: a, ids, first });
}

rmSync(SHARDS, { recursive: true, force: true });
mkdirSync(SHARDS, { recursive: true });
const shortJ = (j) => String(j || '').slice(0, 80);
const out = [];
for (const [code, r] of [...C.entries()].sort((a, b) => b[1].n - a[1].n)) {
  const ps = partners.get(code).sort((a, b) => b.ids.length - a.ids.length || (a.first ?? 9999) - (b.first ?? 9999) || a.code.localeCompare(b.code));
  out.push({
    code, name: nameOf.get(code), n: r.n, before: r.before, after: r.after, noYear: r.noYear,
    y: [...r.y],
    // every partner: [code, joint papers, first year together] — the gap seeds need the full set
    p: ps.map((q) => [q.code, q.ids.length, q.first]),
  });
  // shard: the real papers behind the drawn branches (verbatim title/year/DOI/journal)
  const shard = ps.slice(0, TOP).map((q) => [q.code, q.ids
    .map((i) => papers[i])
    .sort((a, b) => (+a.year || 0) - (+b.year || 0))
    .map((p) => [+p.year || null, p.title, p.doi || null, shortJ(p.journal)])]);
  writeFileSync(join(SHARDS, `${code}.json`), JSON.stringify(shard));
}

const doc = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "Syed's Research Book — hand-coded tier only (papers.index.json). Two constructs are partners when the same paper was hand-coded to both.",
  url: 'https://syahmedu.github.io/syeds-research-book/',
  totalPapers: papers.length, uncoded, years, partialYears: [2024], top: TOP,
  pairs: pair.size,
  coCoded: papers.filter((p) => new Set((p.constructCodes || []).filter((c) => nameOf.has(c))).size > 1).length,
  constructs: out,
};
writeFileSync(OUT, JSON.stringify(doc));

// self-checks: per-construct totals reconcile; partner counts are symmetric
let bad = 0;
for (const c of out) {
  const s = c.y.reduce((a, b) => a + b, 0) + c.before + c.after + c.noYear;
  if (s !== c.n) { bad++; console.error('total mismatch', c.code, s, c.n); }
}
const pn = new Map(out.map((c) => [c.code, new Map(c.p.map(([k, n]) => [k, n]))]));
for (const c of out) for (const [k, n] of c.p) if (pn.get(k)?.get(c.code) !== n) { bad++; console.error('asymmetric', c.code, k); }
console.log(`corpus-tree.json: ${out.length} constructs, ${pair.size} co-coded pairs, ${doc.coCoded} co-coded papers, ${(JSON.stringify(doc).length / 1024).toFixed(0)} KB${bad ? ` — ${bad} CHECK FAILURES` : ' — checks pass'}`);
process.exit(bad ? 1 : 0);
