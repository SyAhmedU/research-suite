/* Generated copies: edit this file and catalog.json, then run build.mjs. */
(()=>{'use strict';
 const catalog=[{"group":"Continue your work","name":"Throughline Studio","url":"https://throughline-studio.vercel.app/","feature":true,"stat":"7","statLabel":"checkpoints","short":"Take one study from first source to submission.","description":"The main research workspace: Discover → Frame → Measure → Collect → Analyze → Write → Publish. Research Kitchen lives inside Analyze."},{"group":"Continue your work","name":"Working Papers","url":"https://syed-papers.vercel.app/","stat":"22","statLabel":"papers","short":"Reviews, protocols and ethics packs, ready to continue.","description":"22 review drafts, 22 proposed study protocols and 17 ethics packs. Continue a paper in Studio."},{"group":"Continue your work","name":"Solo Publish","url":"https://solo-publish.vercel.app","short":"Plan the submission and track it.","description":"Separate private workspace for publication planning, journal evidence and submission tracking. Its saved work stays there."},{"group":"Four research libraries","name":"Research Book","url":"https://syeds-research-book.vercel.app/","stat":"9,388","statLabel":"hand-coded papers","short":"Find what's been studied, construct by construct.","description":"9,388 hand-coded papers across 167 constructs, plus a machine-tagged imported tier (1,950,549 records in the checked release of 16 Oct 2026). Construct maps and term trends."},{"group":"Four research libraries","name":"TheoryScope","url":"https://theoryscope.vercel.app/","stat":"632","statLabel":"theories","short":"Choose and compare the lens for your study.","description":"Theory catalogue, comparisons, influence maps, construct maps and Canvas."},{"group":"Four research libraries","name":"ScaleScope","url":"https://scalescope.vercel.app/","stat":"332","statLabel":"scales","short":"Pick a validated measure and check its reliability.","description":"Measurement scales, available verbatim items, comparisons and reliability analysis."},{"group":"Four research libraries","name":"BookScope","url":"https://bookscope.vercel.app/","stat":"288","statLabel":"reference books","short":"Search methods and concepts across the shelf.","description":"288 reference books; extracted text indexed for 283."},{"group":"Plan, analyze and write","name":"ResearchFlow","url":"https://researchflow-syahmedus-projects.vercel.app/","stat":"10","statLabel":"stages","short":"Turn an idea into a full proposal.","description":"Ten-stage proposal wizard with catalogue grounding and stage-specific research pitfalls."},{"group":"Plan, analyze and write","name":"ToolsScope","url":"https://toolsscope.vercel.app/","stat":"36","statLabel":"methods","short":"Run the analysis in your browser.","description":"Analysis workbench and 12 executable R workflows. The R engines also run directly in Studio's Research Kitchen."},{"group":"Plan, analyze and write","name":"JournalTime","url":"https://syahmedu.github.io/journaltime/","stat":"1,959","statLabel":"journals","short":"Find the gap, draft and format for a journal.","description":"Writing and document formatting. AI drafting depends on backend availability; check every generated citation."},{"group":"Specialist companions","name":"PaperCards","url":"https://papercards.vercel.app/","short":"Read a paper as a diagram.","description":"Inspect and compare papers, dissect their evidence and explore citation networks."},{"group":"Specialist companions","name":"ScholarScope","url":"https://syahmedu.github.io/scholarscope/","short":"Who leads the field, and where to publish.","description":"Journal selection, institutions and authors, live from OpenAlex."},{"group":"Specialist companions","name":"Journal Explorer","url":"https://syahmedu.github.io/scholarscope/explorer/","short":"Journal-by-journal research evidence.","description":"Browse the journal research collection and journal-specific evidence."},{"group":"Specialist companions","name":"Journal Timelines","url":"https://syahmedu.github.io/journal-timelines/","short":"Filter by indexing and real publication speed.","description":"Index-coverage filters and observed publication timing where lifecycle evidence exists."},{"group":"Specialist companions","name":"Cadence","url":"https://syahmedu.github.io/cadence/","short":"Build the survey and collect responses.","description":"Survey design and collection. Export responses for analysis in ToolsScope."},{"group":"Specialist companions","name":"FallacyScope","url":"https://syahmedu.github.io/fallacyscope/","short":"48 sourced research pitfalls to avoid.","description":"Sourced field guide to research pitfalls, also embedded in ResearchFlow."},{"group":"Also here","name":"Throughline CS","url":"https://syahmedu.github.io/throughline-cs/","short":"The computer-science research workflow.","description":"A separate workflow for CS research, with its own projects and experiment records."},{"group":"Also here","name":"Throughline Guidebooks","url":"https://throughline-guidebooks.vercel.app/","short":"Illustrated guides to every research site.","description":"PDF guides to every research site, with real screenshots and DOI-verified references."}];
 const home='https://syahmedu.github.io/research-suite/';
 // one accent per group — the research journey reads left → right, top → bottom
 const ACCENT={'Continue your work':'#176557','Four research libraries':'#b5562f','Plan, analyze and write':'#6a58b8','Specialist companions':'#3d6fa3','Also here':'#7a6f63'};
 const BLURB={'Continue your work':'Pick up where you left off.','Four research libraries':'Hand-checked evidence to build on.','Plan, analyze and write':'From proposal to analysis to manuscript.','Specialist companions':'Sharp tools for one job each.','Also here':''};
 // the host page can line the bar up with its own header: research-navigation{--rn-pad:26px}
 const style=`
:host{display:block;position:relative;z-index:110;color:#1d2420;font:14px/1.5 'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;--pad:var(--rn-pad,max(16px,calc((100% - 1140px)/2 + 26px)))}
*{box-sizing:border-box}a{color:inherit;text-decoration:none}
a:focus-visible,summary:focus-visible,button:focus-visible{outline:3px solid #8154cf;outline-offset:2px;border-radius:8px}
.bar{display:flex;gap:4px 18px;align-items:center;flex-wrap:wrap;background:#f4f1ea;padding:8px var(--pad);border-bottom:1px solid #e2ddd2;font-size:13.5px}
.bar>a{min-height:30px;display:flex;align-items:center;font-weight:600;color:#3a443e}.bar>a:hover{color:#176557}
.bar details{margin-left:auto}
.bar summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:7px;min-height:30px;padding:0 12px;border-radius:99px;font-weight:600;color:#3a443e;border:1px solid transparent}
.bar summary::-webkit-details-marker{display:none}
.bar summary:hover,.bar details[open] summary{background:#fff;border-color:#e2ddd2;color:#176557}
.bar summary i{width:7px;height:7px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .2s}
.bar details[open] summary i{transform:translateY(1px) rotate(-135deg)}
.menu{position:absolute;top:calc(100% + 6px);right:var(--pad);width:min(1040px,calc(100vw - 32px));z-index:100000;background:#fffefb;border:1px solid #e2ddd2;border-radius:18px;padding:20px 22px 16px;box-shadow:0 24px 60px -18px rgba(20,30,25,.35);max-height:min(78vh,720px);overflow:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px 22px}
.menu>.col:nth-child(1){grid-column:1;grid-row:1}.menu>.col:nth-child(5){grid-column:1;grid-row:2;border-left:0;padding-left:0}.menu>.col:nth-child(2),.menu>.col:nth-child(3),.menu>.col:nth-child(4){grid-row:1/3}.menu-foot{grid-row:3}
.col h3+.row{margin-top:0}.col .row+h3{margin-top:18px}
.col h3{display:flex;align-items:center;gap:8px;font:700 11px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--c);margin:4px 0 10px}
.col h3::before{content:'';width:8px;height:8px;border-radius:2px;background:var(--c)}
.col+.col{border-left:1px solid #eee9df;padding-left:22px}
.row{display:block;padding:8px 10px;margin:0 -10px 2px;border-radius:10px}
.row:hover{background:color-mix(in srgb,var(--c) 8%,#fff)}
.row b{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 7px;font-weight:650;font-size:14px;color:#1d2420}
.row b em{font:500 11px 'IBM Plex Mono',monospace;font-style:normal;color:var(--c);white-space:nowrap}
.row span{display:block;font-size:12.5px;line-height:1.4;color:#66706a}
.menu-foot{grid-column:1/-1;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid #eee9df;margin-top:10px;padding-top:10px;font-size:12px;color:#7a837d}
.menu-foot a{font-weight:600;color:#176557}
.directory{display:grid;gap:30px}
.dir-head{max-width:760px}
.kick{font:700 11px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#176557}
.dir-head h2{font:500 clamp(28px,3.6vw,42px)/1.08 'Fraunces',Georgia,serif;letter-spacing:-.02em;margin:10px 0 10px;color:#172820}
.dir-head h2 em{font-style:italic;color:#176557}
.dir-head p{margin:0;font-size:15px;line-height:1.6;color:#4f5a53}
.group-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:0 0 12px}
.group-h h3{display:flex;align-items:center;gap:9px;margin:0;font:700 11.5px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--c)}
.group-h h3::before{content:'';width:9px;height:9px;border-radius:3px;background:var(--c)}
.group-h span{font-size:13px;color:#7a837d}
.grid{display:grid;gap:14px;grid-template-columns:repeat(var(--n),minmax(0,1fr))}
.card{position:relative;display:flex;flex-direction:column;gap:6px;min-height:100%;padding:18px 18px 16px;background:#fffefb;border:1px solid #e6e1d6;border-radius:16px;overflow:hidden;transition:transform .2s,box-shadow .2s,border-color .2s}
.card::before{content:'';position:absolute;inset:0 0 auto;height:3px;background:var(--c);opacity:.85}
.card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--c) 45%,#e6e1d6);box-shadow:0 18px 40px -26px color-mix(in srgb,var(--c) 70%,#000)}
.card .name{display:flex;justify-content:space-between;gap:8px;font-weight:700;font-size:16.5px;color:#172820}
.card .name::after{content:'↗';font-weight:500;color:var(--c);transition:transform .2s}
.card:hover .name::after{transform:translate(2px,-2px)}
.card .short{font-size:14px;line-height:1.45;color:#2f3833;font-weight:500}
.card .desc{font-size:12.5px;line-height:1.5;color:#6c756f;margin-top:auto;padding-top:6px}
.stat{display:flex;align-items:baseline;gap:7px;margin:2px 0 2px}
.stat b{font:500 34px/1 'Fraunces',Georgia,serif;letter-spacing:-.02em;color:var(--c)}
.stat span{font:500 11.5px 'IBM Plex Mono',monospace;color:#6c756f;text-transform:uppercase;letter-spacing:.06em}
.card.feature{grid-column:span 2;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 9%,#fffefb),#fffefb 60%)}
.card.feature .name{font:500 26px/1.15 'Fraunces',Georgia,serif;letter-spacing:-.01em}
.card.feature .short{font-size:16px}
.card.feature .stat b{font-size:46px}
.list{display:grid;gap:8px;grid-template-columns:repeat(var(--n),minmax(0,1fr))}
.item{display:flex;flex-direction:column;gap:2px;padding:12px 14px;background:#fffefb;border:1px solid #e6e1d6;border-left:3px solid var(--c);border-radius:12px;transition:border-color .2s,background .2s}
.item:hover{background:color-mix(in srgb,var(--c) 6%,#fffefb)}
.item b{font-weight:700;font-size:14.5px;color:#172820}.item b::after{content:' ↗';font-weight:500;color:var(--c)}
.item span{font-size:13px;color:#5f6963}
.note{font-size:12.5px;line-height:1.55;color:#7a837d;max-width:760px;margin:0}
@media(max-width:980px){.menu{grid-template-columns:repeat(2,minmax(0,1fr))}.menu>.col:nth-child(n){grid-column:auto;grid-row:auto}.menu-foot{grid-row:auto}.col:nth-child(3),.col:nth-child(5){border-left:0;padding-left:0}.grid{--n:2!important}.grid[data-n="3"]{--n:3!important}.list{--n:2!important}}
@media(max-width:600px){
 .bar{gap:2px 12px;font-size:12.5px;flex-wrap:nowrap}.bar>a{white-space:nowrap}.bar details{margin-left:auto;flex:none}.bar summary{padding:0 9px;white-space:nowrap}
 .menu{position:fixed;top:auto;left:8px;right:8px;width:auto;margin-top:6px;grid-template-columns:1fr;max-height:76vh;padding:16px}
 .col+.col{border-left:0;padding-left:0;border-top:1px solid #eee9df;padding-top:12px;margin-top:6px}
 .row span{display:none}
 .grid,.grid[data-n="3"],.list{--n:1!important}.card.feature{grid-column:auto}.card.feature .stat b{font-size:38px}
}
@media(prefers-reduced-motion:reduce){.card,.card .name::after,.bar summary i{transition:none}.card:hover{transform:none}}
@media print{.bar{display:none}}`;
 function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
 function link(cls,url,text){const a=el('a',cls,text);a.href=url;a.target='_blank';a.rel='noopener';return a;}
 const groupsOf=()=>[...new Set(catalog.map(x=>x.group))];
 const accent=(g)=>ACCENT[g]||'#176557';
 function menuBody(menu){
  // five blocks, last in source order (so phones read it last); on wide screens it tucks under column one
  const g=groupsOf(),cols=[[g[0]],[g[1]],[g[2]],[g[3]],g.slice(4)];
  for(const set of cols){if(!set.length)continue;const col=el('div','col');col.style.setProperty('--c',accent(set[0]));
   for(const name of set){const h=el('h3',null,name);h.style.setProperty('--c',accent(name));col.append(h);
    for(const it of catalog.filter(x=>x.group===name)){const a=link('row',it.url);a.style.setProperty('--c',accent(name));const b=el('b',null,it.name);if(it.stat){b.append(el('em',null,it.stat+' '+(it.statLabel||'')));}a.append(b,el('span',null,it.short||''));col.append(a);}}
   menu.append(col);}
  const foot=el('div','menu-foot');foot.append(el('span',null,'Each link opens its own workspace; saved work moves only through the hand-offs each tool supports.'));const all=el('a',null,'See everything, with details →');all.href=home+'#research-directory';foot.append(all);menu.append(foot);
 }
 class ResearchNavigation extends HTMLElement{connectedCallback(){if(this.shadowRoot)return;const root=this.attachShadow({mode:'open'});root.append(el('style',null,style));
  const nav=el('nav','bar');nav.setAttribute('aria-label','Research navigation');
  const mk=(t,u)=>{const a=el('a',null,t);a.href=u;return a;};
  nav.append(mk('Research home',home),mk('My papers','https://syed-papers.vercel.app/'),mk('Studio','https://throughline-studio.vercel.app/'));
  const more=el('details');const sum=el('summary',null,'All research');sum.append(el('i'));more.append(sum);const menu=el('div','menu');menuBody(menu);more.append(menu);nav.append(more);root.append(nav);
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&more.open){more.open=false;sum.focus();}});
  document.addEventListener('click',e=>{if(!e.composedPath().includes(this))more.open=false;});}}
 class ResearchDirectory extends HTMLElement{connectedCallback(){if(this.shadowRoot)return;const root=this.attachShadow({mode:'open'});root.append(el('style',null,style));
  const box=el('section','directory');const head=el('div','dir-head');head.append(el('div','kick','Everything in one place'));
  const h2=el('h2');h2.append('All your research, ',el('em',null,'connected.'));head.append(h2,el('p',null,'Resume one of your 22 papers, take it through Studio’s seven checkpoints, and reach every library and companion from here. Research Kitchen is inside Studio → Analyze.'));box.append(head);
  for(const g of groupsOf()){const items=catalog.filter(x=>x.group===g),c=accent(g);const sec=el('section');sec.style.setProperty('--c',c);
   const gh=el('div','group-h');gh.append(el('h3',null,g));if(BLURB[g])gh.append(el('span',null,BLURB[g]));sec.append(gh);
   const big=items.some(x=>x.stat);
   if(big){// cards: column count fits the group exactly (a feature card takes two), so no row is left ragged
    const grid=el('div','grid');const n=items.reduce((n,x)=>n+(x.feature?2:1),0);grid.style.setProperty('--n',String(n));grid.dataset.n=String(n);
    for(const it of items){const a=link('card'+(it.feature?' feature':''),it.url);a.style.setProperty('--c',c);a.append(el('span','name',it.name));
     if(it.stat){const s=el('div','stat');s.append(el('b',null,it.stat),el('span',null,it.statLabel||''));a.append(s);}
     a.append(el('span','short',it.short||''),el('span','desc',it.description));grid.append(a);}
    sec.append(grid);
   }else{// compact rows: 3 across for six, 2 across for two
    const list=el('div','list');list.style.setProperty('--n',String(items.length%3===0?3:items.length%2===0?2:Math.min(3,items.length)));
    for(const it of items){const a=link('item',it.url);a.style.setProperty('--c',c);a.title=it.description;a.append(el('b',null,it.name),el('span',null,it.short||it.description));list.append(a);}
    sec.append(list);}
   box.append(sec);}
  box.append(el('p','note','The papers desk carries a copy of a selected paper’s source documents into Studio. Independent apps and Solo Publish keep their own saved work; links don’t merge those records automatically.'));
  root.append(box);}}
 customElements.define('research-navigation',ResearchNavigation);customElements.define('research-directory',ResearchDirectory);
 if(!document.querySelector('research-navigation'))document.body.prepend(el('research-navigation'));
})();
