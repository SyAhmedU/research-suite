import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),home=path.resolve(here,'../../..');
const shared=fs.readFileSync(path.join(here,'usability.css'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(here,'consumers.json'),'utf8'));
for(const rel of manifest){const file=path.join(home,rel);let s=fs.readFileSync(file,'utf8');const marker='/* Usability review 2026-10-10:';const extra='/* Task-first review: 2026-10-10 */';const scale='nav[aria-label="ScaleScope workspaces"] [aria-current="page"]';const tail=s.includes(extra)?'\n'+s.slice(s.indexOf(extra)):s.includes(scale)?'\n'+extra+'\n'+s.slice(s.indexOf(scale)):'';s=s.split(marker)[0].trimEnd()+'\n'+shared+tail;fs.writeFileSync(file,s);}
console.log('Updated shared usability CSS in',manifest.length,'consumers.');
