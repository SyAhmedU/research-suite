// Brand-bar generator. Regenerates each consumer's SyedBar file from core.mjs + registry.mjs.
//
//   node tools/brand-bar/build.mjs          # write all files
//   node tools/brand-bar/build.mjs --dry    # print what would change, write nothing
//
// repoPath in registry.mjs is relative to the home dir (all projects are siblings).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY, HTML_REGISTRY } from './registry.mjs';
import { emitReact } from './emit-react.mjs';
import { emitHtmlBar } from './emit-html.mjs';

const MARKER_START = '<!-- SYED-BAR:START — generated from research-suite/tools/brand-bar; run: node tools/brand-bar/build.mjs -->';
const MARKER_END = '<!-- SYED-BAR:END -->';
// The bar div contains no nested <div>, so a non-greedy match is unambiguous.
const MARKER_RE = /<!-- SYED-BAR:START[\s\S]*?<!-- SYED-BAR:END -->/;
const BAR_RE = /(?:<!-- SYED BRAND BAR -->\s*)?<div class="syed-bar">[\s\S]*?<\/div>/;

const here = dirname(fileURLToPath(import.meta.url));
const HOME = resolve(here, '../../..'); // research-suite/tools/brand-bar -> home
const dry = process.argv.includes('--dry');

let changed = 0, unchanged = 0, missing = 0;
for (const entry of REGISTRY) {
  const out = emitReact(entry);
  const abs = join(HOME, entry.repoPath);
  const prev = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (prev === null) {
    console.log(`  ?  ${entry.repoPath}  (target does not exist — skipping write)`);
    missing++;
    continue;
  }
  if (prev === out) { unchanged++; console.log(`  =  ${entry.repoPath}`); continue; }
  changed++;
  if (dry) {
    console.log(`  ~  ${entry.repoPath}  (would change: ${prev.length} -> ${out.length} chars)`);
  } else {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, out, 'utf8');
    console.log(`  ✔  ${entry.repoPath}`);
  }
}

// --- HTML suite-step bars (markup between markers; CSS + theme JS stay in-page) ---
for (const entry of HTML_REGISTRY) {
  const abs = join(HOME, entry.repoPath);
  if (!existsSync(abs)) { console.log(`  ?  ${entry.repoPath}  (target does not exist — skipping)`); missing++; continue; }
  const src = readFileSync(abs, 'utf8');
  const block = `${MARKER_START}\n${emitHtmlBar(entry)}\n${MARKER_END}`;
  let next;
  if (MARKER_RE.test(src)) next = src.replace(MARKER_RE, block);
  else if (BAR_RE.test(src)) next = src.replace(BAR_RE, block);   // first run: wrap the existing bar
  else { console.log(`  !  ${entry.repoPath}  (no <div class="syed-bar"> or markers found — skipping)`); missing++; continue; }
  if (next === src) { unchanged++; console.log(`  =  ${entry.repoPath}`); continue; }
  changed++;
  if (dry) console.log(`  ~  ${entry.repoPath}  (would change: ${src.length} -> ${next.length} chars)`);
  else { writeFileSync(abs, next, 'utf8'); console.log(`  ✔  ${entry.repoPath}`); }
}

const total = REGISTRY.length + HTML_REGISTRY.length;
console.log(`\n${dry ? '[dry] ' : ''}${total} targets · ${changed} ${dry ? 'to change' : 'written'} · ${unchanged} unchanged · ${missing} missing`);
