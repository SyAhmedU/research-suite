// One directory and navigation source for the existing research entry points.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
const catalog=JSON.parse(readFileSync(resolve(here,'catalog.json'),'utf8'));
const code=readFileSync(resolve(here,'navigation.js'),'utf8').replace('/*CATALOG*/[]',JSON.stringify(catalog));
for(const [entry,output,src] of [
 ['research-suite/index.html','research-suite/research-links.js','research-links.js'],
 ['throughline-studio/index.html','throughline-studio/public/research-links.js','/research-links.js'],
 ['output/research-completion/site-src/index.html','output/research-completion/site/research-links.js','research-links.js'],
]){
 writeFileSync(resolve(root,output),code);
 let html=readFileSync(resolve(root,entry),'utf8').replace(/<!-- RESEARCH-LINKS:START -->[\s\S]*?<!-- RESEARCH-LINKS:END -->\s*/g,'');
 html=html.replace('</head>',`<!-- RESEARCH-LINKS:START -->\n<script defer src="${src}"></script>\n<!-- RESEARCH-LINKS:END -->\n</head>`);
 writeFileSync(resolve(root,entry),html);
}
console.log('Research directory and navigation generated for hub, Studio and Working Papers.');
