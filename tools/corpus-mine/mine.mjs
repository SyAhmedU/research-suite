// mine.mjs — deterministic corpus-mention miner (NO AI).
//
// Matches the TheoryScope catalog (theories.json) and ScaleScope catalog
// (scales.json) verbatim against the Research Book RECENT tier
// (recent.index.json + recent.abstracts/*.json — real OpenAlex 2024→ papers).
// A hit means the theory/scale name (or strict acronym) literally appears in
// that paper's title or abstract — nothing inferred, nothing invented.
//
// Outputs (committed, served as static CORS JSON):
//   theoryscope/public/data/corpus-usage.json        { slug → {n, byYear, dois[≤6]} }
//   scalebase/client/public/data/scale-usage.json    { id   → {n, byYear, dois[≤6]} }
// Reports (hand-verification queue — candidates are NEVER auto-added):
//   research-suite/tools/corpus-mine/reports/candidate-theories.json
//   research-suite/tools/corpus-mine/reports/candidate-scales.json
//   research-suite/tools/corpus-mine/reports/summary.md
//
// Gates (under-count rather than fabricate):
//   - full names: case-insensitive, word-boundary, dash/space-normalized
//   - acronyms:   case-SENSITIVE, word-boundary, len≥3, and if the acronym is
//                 also an English word it only counts followed by
//                 theory|model|framework|perspective
//   - family base names (text before " — ..." / " (" ) match only when unique
//     across the catalog (no double attribution)
//
// Run:  node research-suite/tools/corpus-mine/mine.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const HOME = os.homedir();
const HERE = dirname(fileURLToPath(import.meta.url));
const BOOK = join(HOME, 'syeds-research-book', 'data');
const MAX_DOIS = 6;

// ---------- normalization ----------
const DASHES = /[‐-―−]/g; // hyphen…em-dash, minus
function norm(s) {
  return s
    .toLowerCase()
    .replace(DASHES, '-')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
const isWordChar = (c) => /[a-z0-9]/i.test(c);
/** word-boundary indexOf on a pre-normalized haystack */
function hasPhrase(hay, phrase) {
  let i = -1;
  while ((i = hay.indexOf(phrase, i + 1)) !== -1) {
    const before = i === 0 ? '' : hay[i - 1];
    const after = i + phrase.length >= hay.length ? '' : hay[i + phrase.length];
    if ((!before || !isWordChar(before)) && (!after || !isWordChar(after))) return true;
  }
  return false;
}
/** case-sensitive word-boundary search on ORIGINAL text (for acronyms) */
function hasAcronym(raw, acro, requireKeyword) {
  let i = -1;
  while ((i = raw.indexOf(acro, i + 1)) !== -1) {
    const before = i === 0 ? '' : raw[i - 1];
    const after = i + acro.length >= raw.length ? '' : raw[i + acro.length];
    if ((before && isWordChar(before)) || (after && isWordChar(after))) continue;
    if (!requireKeyword) return true;
    const tail = raw.slice(i + acro.length, i + acro.length + 30).toLowerCase();
    if (/^\W{0,3}(theory|model|framework|perspective)\b/.test(tail)) return true;
  }
  return false;
}

// English-word acronyms: only count with a theory/model keyword right after.
const AMBIGUOUS = new Set([
  'SET', 'FIT', 'COR', 'JOB', 'CASE', 'PLAN', 'TEAM', 'LEAD', 'SELF', 'ROLE',
  'GOAL', 'WORK', 'CARE', 'HOPE', 'ACT', 'AIM', 'ART', 'CAN', 'MAP', 'NET',
  'PACE', 'PEN', 'RANGE', 'SAFE', 'SPAN', 'STAR', 'TOP', 'WISE', 'FLOW',
]);
// Acronyms that collide with statistics reported in nearly every SEM paper
// (fit indices, reliability stats) — never matched bare at all.
const STAT_ACRO = new Set([
  'CFI', 'GFI', 'AGFI', 'NFI', 'NNFI', 'TLI', 'IFI', 'RFI', 'RMR', 'SRMR',
  'RMSEA', 'AVE', 'CR', 'CI', 'OR', 'HR', 'SD', 'SE', 'ES', 'MI', 'FL', 'PCA',
]);

// ---------- load corpus ----------
console.log('[mine] loading recent tier…');
const index = JSON.parse(readFileSync(join(BOOK, 'recent.index.json'), 'utf8'));
const papers = Array.isArray(index) ? index : index.papers;
const absDir = join(BOOK, 'recent.abstracts');
const abstracts = new Map();
for (const f of readdirSync(absDir).filter((f) => f.endsWith('.json'))) {
  const shard = JSON.parse(readFileSync(join(absDir, f), 'utf8'));
  for (const [doi, text] of Object.entries(shard)) {
    if (typeof text === 'string' && text.length > 40) abstracts.set(doi, text);
  }
}
console.log(`[mine] ${papers.length} papers, ${abstracts.size} abstracts`);

// ---------- load catalogs ----------
const thPayload = JSON.parse(
  readFileSync(join(HOME, 'theoryscope', 'public', 'data', 'theories.json'), 'utf8'),
);
const theories = thPayload.theories || thPayload;
const scPayload = JSON.parse(
  readFileSync(join(HOME, 'scalebase', 'client', 'public', 'data', 'scales.json'), 'utf8'),
);
const scales = scPayload.scales || scPayload;
console.log(`[mine] catalogs: ${theories.length} theories, ${scales.length} scales`);

// ---------- build patterns ----------
function nameVariants(name) {
  const out = new Set();
  const full = norm(name);
  if (full.length >= 8) out.add(full); // exact catalog name, parenthetical intact
  const base = norm(name.replace(/\s*\([^)]*\)/g, '')); // drop parentheticals
  if (base.length >= 8) out.add(base);
  if (base.includes('-')) out.add(base.replace(/-/g, ' ').replace(/\s+/g, ' '));
  return [...out];
}
/** text before an em-dash/colon suffix — the "family" name */
function familyOf(name) {
  const m = name.split(/\s+[—–:]\s+|\s+— /)[0];
  return m && m.length < name.length ? norm(m.replace(/\s*\([^)]*\)/g, '')) : null;
}
// Family fallbacks for instruments must themselves name an instrument —
// "Maslach Burnout Inventory" yes, "Generalized Anxiety Disorder" (the
// disorder, not the measure) no.
const INSTRUMENT_TAIL = /\b(scale|inventory|questionnaire|index|survey|test|measure|checklist|battery)$/;

function buildEntries(items, getName, getAcro, getKey, { instrument = false } = {}) {
  const entries = items.map((it) => {
    const phrases = new Set(nameVariants(getName(it)));
    const f = familyOf(getName(it));
    if (f && f.length >= 10 && (!instrument || INSTRUMENT_TAIL.test(f))) {
      for (const v of nameVariants(f)) phrases.add(v);
    }
    let acro = (getAcro(it) || '').trim();
    if (!/^[A-Z][A-Za-z0-9.-]{2,}$/.test(acro) || STAT_ACRO.has(acro.toUpperCase())) acro = '';
    return {
      key: getKey(it),
      name: getName(it),
      normName: norm(getName(it)),
      normBase: norm(getName(it).replace(/\s*\([^)]*\)/g, '')),
      phrases,
      acro,
      acroNeedsKeyword: acro ? AMBIGUOUS.has(acro.toUpperCase()) : false,
    };
  });
  // Ownership rule — a phrase claimed by >1 entries goes only to the entry
  // whose own name IS that phrase; otherwise it is dropped from all (no
  // double attribution, under-count over fabricate).
  const claims = new Map();
  for (const e of entries) for (const p of e.phrases) claims.set(p, (claims.get(p) || 0) + 1);
  for (const e of entries) {
    for (const p of [...e.phrases]) {
      if (claims.get(p) > 1 && p !== e.normName) e.phrases.delete(p);
    }
  }
  return entries.map((e) => ({ ...e, phrases: [...e.phrases] }));
}

const thEntries = buildEntries(theories, (t) => t.name, (t) => t.acronym, (t) => t.slug);
const scEntries = buildEntries(scales, (s) => s.name, (s) => s.abbreviation, (s) => s.id, { instrument: true });

// catalog phrase set — used to exclude known names from the candidates queue
const GENERIC_TAIL = /\s+(theory|model|framework|perspective|view|scale|scales|inventory|questionnaire|index|survey)$/;
const knownPhrases = new Set();
const knownStems = new Set(); // catalog names minus the generic tail word
for (const e of [...thEntries, ...scEntries]) {
  for (const p of e.phrases) {
    knownPhrases.add(p);
    const stem = p.replace(GENERIC_TAIL, '');
    if (stem.length >= 8) knownStems.add(stem);
  }
  if (e.acro) knownStems.add(norm(e.acro));
}

// ---------- candidate extraction (hand-verification queue) ----------
const CAND_STOP = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'our', 'their', 'its',
  'one', 'two', 'three', 'each', 'such', 'proposed', 'present', 'novel', 'new',
  'final', 'full', 'first', 'second', 'best', 'mixed', 'null', 'baseline',
]);
const CAND_JUNK =
  /^(structural equation|measurement|regression|equation|mediation|moderation|conceptual|theoretical|hypothesized|hypothesised|research|integrated|integrative|extended|modified|revised|likert|rating|point|item|study|survey|business|mathematical|statistical|logit|probit|panel|growth|random|fixed|linear|nonlinear|machine|deep|language|hybrid|prediction|predictive|classification|acceptance of)\b/;
const candTheories = new Map();
const candScales = new Map();
const DISCOURSE_PREFIX = /^(drawing (?:on|upon|from)|grounded in|based (?:on|upon)|building on|rooted in|anchored in|guided by|informed by|using|applying|through|via|extends?|extending|integrat\w+|implications? for|contributions? to|test of|the|a|an|our|this)\s+/i;
function addCand(map, phrase, doi) {
  // strip leading discourse words ("Drawing on Social Exchange theory" → "Social Exchange theory")
  let ph = phrase;
  for (let prev = ''; prev !== ph; ) { prev = ph; ph = ph.replace(DISCOURSE_PREFIX, ''); }
  if (ph.split(/[ -]/).length < 2 || !/^[A-Z]/.test(ph)) return;
  const k = norm(ph);
  if (knownPhrases.has(k)) return;
  if (knownStems.has(k.replace(GENERIC_TAIL, ''))) return; // naming variant of a catalog entry
  let rec = map.get(k);
  if (!rec) map.set(k, (rec = { phrase: ph, n: 0, dois: [] }));
  rec.n++;
  if (rec.dois.length < 3) rec.dois.push(doi);
}
const TH_CAND_RE = /\b([A-Z][\w''-]*(?:[ -](?:of|the|and|in|[A-Za-z][\w''-]*)){0,4})[ -](?:theory|Theory)\b/g;
const SC_CAND_RE = /\b([A-Z][\w''-]*(?:[ -](?:of|the|and|for|[A-Z][\w''-]*)){0,6})[ -](Scale|Inventory|Questionnaire)\b/g;
function harvestCandidates(raw, doi) {
  let m;
  TH_CAND_RE.lastIndex = 0;
  while ((m = TH_CAND_RE.exec(raw))) {
    const head = m[1].trim();
    const first = head.split(/[ -]/)[0].toLowerCase();
    if (CAND_STOP.has(first) || head.split(/[ -]/).length < 2) continue;
    const full = `${head} theory`;
    if (CAND_JUNK.test(norm(full))) continue;
    addCand(candTheories, full, doi);
  }
  SC_CAND_RE.lastIndex = 0;
  while ((m = SC_CAND_RE.exec(raw))) {
    const head = m[1].trim();
    const first = head.split(/[ -]/)[0].toLowerCase();
    if (CAND_STOP.has(first) || head.split(/[ -]/).length < 2) continue;
    const full = `${head} ${m[2]}`;
    if (CAND_JUNK.test(norm(full))) continue;
    addCand(candScales, full, doi);
  }
}

// ---------- scan ----------
console.log('[mine] scanning…');
const thHits = new Map(); // key → {n, byYear, dois[]}
const scHits = new Map();
function record(map, key, doi, year) {
  let rec = map.get(key);
  if (!rec) map.set(key, (rec = { n: 0, byYear: {}, dois: [] }));
  rec.n++;
  if (year) rec.byYear[year] = (rec.byYear[year] || 0) + 1;
  if (rec.dois.length < MAX_DOIS) rec.dois.push(doi);
}

let scanned = 0;
const t0 = Date.now();
for (const p of papers) {
  const doi = p.doi || p.id;
  const abs = abstracts.get(doi) || '';
  const raw = `${p.title || ''}. ${abs}`;
  if (raw.length < 20) continue;
  const hay = norm(raw);

  for (const e of thEntries) {
    let hit = e.phrases.some((ph) => hasPhrase(hay, ph));
    if (!hit && e.acro) hit = hasAcronym(raw, e.acro, e.acroNeedsKeyword);
    if (hit) record(thHits, e.key, doi, p.year);
  }
  for (const e of scEntries) {
    let hit = e.phrases.some((ph) => hasPhrase(hay, ph));
    if (!hit && e.acro) hit = hasAcronym(raw, e.acro, e.acroNeedsKeyword);
    if (hit) record(scHits, e.key, doi, p.year);
  }
  if (abs) harvestCandidates(raw, doi);

  if (++scanned % 10000 === 0) {
    console.log(`[mine] ${scanned}/${papers.length} (${((Date.now() - t0) / 1000) | 0}s)`);
  }
}
console.log(`[mine] done in ${((Date.now() - t0) / 1000) | 0}s — theory hits: ${thHits.size} theories, scale hits: ${scHits.size} scales`);

// ---------- write outputs ----------
const meta = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: 'syeds-research-book recent tier (OpenAlex, 2024→) — titles + abstracts',
  papersScanned: papers.length,
  abstracts: abstracts.size,
  method:
    'deterministic verbatim name match (word-boundary, dash-normalized); acronyms case-sensitive; machine-matched — verify before citing',
};

const thUsage = {};
for (const [k, v] of [...thHits].sort((a, b) => b[1].n - a[1].n)) thUsage[k] = v;
writeFileSync(
  join(HOME, 'theoryscope', 'public', 'data', 'corpus-usage.json'),
  JSON.stringify({ ...meta, kind: 'theories', usage: thUsage }),
);
console.log(`[mine] wrote theoryscope corpus-usage.json (${thHits.size} theories)`);

const scUsage = {};
for (const [k, v] of [...scHits].sort((a, b) => b[1].n - a[1].n)) scUsage[k] = v;
writeFileSync(
  join(HOME, 'scalebase', 'client', 'public', 'data', 'scale-usage.json'),
  JSON.stringify({ ...meta, kind: 'scales', usage: scUsage }),
);
console.log(`[mine] wrote scalebase scale-usage.json (${scHits.size} scales)`);

// reports
const repDir = join(HERE, 'reports');
mkdirSync(repDir, { recursive: true });
const candT = [...candTheories.values()].filter((c) => c.n >= 5).sort((a, b) => b.n - a.n).slice(0, 250);
const candS = [...candScales.values()].filter((c) => c.n >= 5).sort((a, b) => b.n - a.n).slice(0, 250);
writeFileSync(join(repDir, 'candidate-theories.json'), JSON.stringify({ ...meta, note: 'NOT in TheoryScope catalog; hand-verify before adding (real source + DOI required)', candidates: candT }, null, 2));
writeFileSync(join(repDir, 'candidate-scales.json'), JSON.stringify({ ...meta, note: 'NOT in ScaleScope catalog; hand-verify before adding (real items + citation required)', candidates: candS }, null, 2));

const topT = [...thHits].sort((a, b) => b[1].n - a[1].n).slice(0, 25);
const topS = [...scHits].sort((a, b) => b[1].n - a[1].n).slice(0, 25);
const nameOfTh = new Map(thEntries.map((e) => [e.key, e.name]));
const nameOfSc = new Map(scEntries.map((e) => [e.key, e.name]));
writeFileSync(
  join(repDir, 'summary.md'),
  `# Corpus-mention mining — ${meta.generatedAt}

Scanned **${papers.length}** recent-tier papers (${abstracts.size} with abstracts). Deterministic verbatim matching, no AI.

## Matched: ${thHits.size}/${theories.length} theories, ${scHits.size}/${scales.length} scales

### Top theories
${topT.map(([k, v]) => `- ${nameOfTh.get(k)} — ${v.n}`).join('\n')}

### Top scales
${topS.map(([k, v]) => `- ${nameOfSc.get(k)} — ${v.n}`).join('\n')}

## Candidates (hand-verification queue — NOT auto-added)
- candidate-theories.json: ${candT.length} phrases (≥5 papers)
- candidate-scales.json: ${candS.length} phrases (≥5 papers)
`,
);
console.log('[mine] wrote reports/');
