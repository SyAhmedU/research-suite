// suggest-sources.mjs — Crossref lookups for the candidate queues (NO AI).
//
// For each candidate theory/scale phrase (mined verbatim from the recent
// corpus but NOT in the catalogs), queries Crossref for the most plausible
// canonical work and records it as a SUGGESTION — title/authors/year/DOI all
// straight from the Crossref record, never composed. Nothing is added to any
// catalog here; this only speeds up Syed's hand-verification (the no-fab gate
// stays: a candidate enters TheoryScope/ScaleScope only after he verifies the
// source himself).
//
// Gate: the suggestion is kept only when every content word of the candidate
// phrase appears in the suggested work's title (order-free) — otherwise the
// candidate is marked "no confident match" rather than given a loose guess.
//
// Output: updates reports/candidate-{theories,scales}.json in place
// (adds `suggested` per candidate) + writes reports/verification-worksheet.md
// Run:    node research-suite/tools/corpus-mine/suggest-sources.mjs
//         (resumable: candidates that already have `suggested` are skipped)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORTS = join(HERE, 'reports');
const MAILTO = 'asrarsaa@gmail.com'; // polite pool
const PAUSE_MS = 1100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.toLowerCase().replace(/[‐-―−]/g, '-').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const GENERIC = new Set(['theory', 'model', 'scale', 'inventory', 'questionnaire', 'the', 'of', 'and', 'a', 'an', 'for', 'in']);
function contentWords(phrase) {
  return norm(phrase).split(/[\s-]+/).filter((w) => w.length > 2 && !GENERIC.has(w));
}

async function crossrefTop(phrase) {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(phrase)}&rows=20&select=DOI,title,author,issued,container-title,is-referenced-by-count&mailto=${MAILTO}`;
  const r = await fetch(url, { headers: { 'User-Agent': `corpus-mine/1.0 (mailto:${MAILTO})` } });
  if (!r.ok) throw new Error(`Crossref ${r.status}`);
  const items = (await r.json()).message?.items || [];
  const words = contentWords(phrase);
  // strict gate: every content word in the title; rank by citations
  const ok = items.filter((it) => {
    const title = norm((it.title || [])[0] || '');
    if (!(it.author || []).length) return false;            // no authors → not a usable record
    if (/\/(fig|table|supp|peer-review)[-./]/i.test(it.DOI)) return false; // component DOIs
    return words.length && words.every((w) => title.includes(w));
  });
  ok.sort((a, b) => (b['is-referenced-by-count'] || 0) - (a['is-referenced-by-count'] || 0));
  const top = ok[0];
  if (!top) return null;
  // a canonical statement/development paper is cited; an uncited match is
  // almost certainly just a recent paper USING the name — say "no match"
  if ((top['is-referenced-by-count'] || 0) < 5) return null;
  return {
    doi: top.DOI,
    title: (top.title || [])[0] || '',
    authors: (top.author || []).slice(0, 4).map((a) => [a.family, a.given].filter(Boolean).join(', ')).join('; '),
    year: top.issued?.['date-parts']?.[0]?.[0] ?? null,
    journal: (top['container-title'] || [])[0] || '',
    citedBy: top['is-referenced-by-count'] || 0,
    note: 'Crossref top match — SUGGESTED ONLY, hand-verify before any catalog entry',
  };
}

// discourse fragments that survived frame extraction — not real candidates
const JUNK_PHRASE = /^(it |this |that |toward s? ?a |towards a |unique contribution|unified theory$|advances? theory$|extends? theory$|implications)/i;
// a suggestion must be a real article: authors on record, no figure/table/supp DOIs
const BAD_DOI = /\/(fig|table|supp|peer-review)[-./]/i;
const saneSuggestion = (s) => s && s.authors && !BAD_DOI.test(s.doi);

async function processFile(file, kind) {
  const path = join(REPORTS, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const before = data.candidates.length;
  data.candidates = data.candidates.filter((c) => !JUNK_PHRASE.test(c.phrase));
  if (data.candidates.length !== before) console.log(`  [${kind}] pruned ${before - data.candidates.length} junk phrases`);
  for (const c of data.candidates) {
    if (c.suggested && !saneSuggestion(c.suggested)) delete c.suggested; // re-look-up under the stricter gate
    if (c.suggested === null) delete c.suggested; // null = earlier no-match; retry under new ranking
  }
  let looked = 0, matched = 0;
  for (const c of data.candidates) {
    if ('suggested' in c) continue; // resumable
    try {
      c.suggested = await crossrefTop(c.phrase);
      matched += c.suggested ? 1 : 0;
    } catch (e) {
      console.log(`  [${kind}] "${c.phrase}" lookup failed: ${e.message} — leaving for a re-run`);
      continue; // do not mark; retry next run
    }
    looked++;
    if (looked % 10 === 0) console.log(`  [${kind}] ${looked} looked up…`);
    writeFileSync(path, JSON.stringify(data, null, 2)); // checkpoint
    await sleep(PAUSE_MS);
  }
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`[suggest] ${kind}: ${looked} new lookups, ${matched} confident matches`);
  return data;
}

const th = await processFile('candidate-theories.json', 'theories');
const sc = await processFile('candidate-scales.json', 'scales');

// worksheet
const row = (c) =>
  `| ${c.phrase} | ${c.n} | ${c.suggested ? `${c.suggested.authors} (${c.suggested.year}). *${c.suggested.title}*. ${c.suggested.journal} — [${c.suggested.doi}](https://doi.org/${c.suggested.doi}) · cited ${c.suggested.citedBy}×` : '_no confident match — search manually_'} | ☐ |`;
const md = `# Candidate verification worksheet — ${new Date().toISOString().slice(0, 10)}

Phrases mined verbatim from the recent corpus (≥5 papers) that are NOT in the catalogs.
The suggested source is Crossref's top match whose title contains every content word of
the phrase — a real record, but **suggested only**: verify it is the canonical
development/statement paper before adding anything to TheoryScope/ScaleScope/Cadence.

## Theories (${th.candidates.length})
| Phrase | papers | Suggested canonical source (verify!) | ✓ |
|---|---|---|---|
${th.candidates.map(row).join('\n')}

## Scales (${sc.candidates.length})
| Phrase | papers | Suggested canonical source (verify!) | ✓ |
|---|---|---|---|
${sc.candidates.map(row).join('\n')}
`;
writeFileSync(join(REPORTS, 'verification-worksheet.md'), md);
console.log('[suggest] wrote reports/verification-worksheet.md');
