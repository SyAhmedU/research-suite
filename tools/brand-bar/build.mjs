// Brand-bar generator. Regenerates each consumer's SyedBar file from core.mjs + registry.mjs.
//
//   node tools/brand-bar/build.mjs          # write all files
//   node tools/brand-bar/build.mjs --dry    # print what would change, write nothing
//
// repoPath in registry.mjs is relative to the home dir (all projects are siblings).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from './registry.mjs';
import { emitReact } from './emit-react.mjs';

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

console.log(`\n${dry ? '[dry] ' : ''}${REGISTRY.length} targets · ${changed} ${dry ? 'to change' : 'written'} · ${unchanged} unchanged · ${missing} missing`);
