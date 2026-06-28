// research-suite/tools/gate/inject.mjs
// Stamps a client-side "entry password" gate (29071993) into every project's HTML entry.
// Re-locks on EVERY page load (no persistence). Idempotent (marker: SYED-GATE). `--dry` to preview.
//
// NOTE: this is obscurity, not real security — the password lives in the page source.
// Excluded by design: letters (#27, own password), cadence (participant-facing),
// faceprep-campus (#25, real JWT auth), paper-dissection + wordmap (retired redirects),
// throughline-studio (#23, SHIPPED PUBLIC — the capstone is the suite's front door,
//   intentionally ungated; do not re-add it here),
// + the 4 read-only reference libraries Studio deep-links into — syeds-research-book,
//   bookscope, theoryscope, scalebase — also SHIPPED PUBLIC so the front-door's
//   "open in …" links work for everyone. Read-only data, no secrets; do not re-add.
//
// Run from anywhere:  node research-suite/tools/gate/inject.mjs [--dry]
import fs from "node:fs";
import path from "node:path";

const HOME = "C:\\Users\\Syed Asrar";
const DRY = process.argv.includes("--dry");

const GATE = `<!-- SYED-GATE · entry password, re-locks every load · injected by research-suite/tools/gate/inject.mjs -->
<script>(function(){"use strict";
if(window.__syedGate)return;window.__syedGate=1;
var PASS="29071993";
function mk(){
 if(document.getElementById("syed-gate"))return;
 var ov=document.createElement("div");ov.id="syed-gate";
 ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label","Password required");
 ov.style.cssText="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 90% at 50% 18%,#221c16 0%,#181410 60%,#120e0a 100%);color:#e9ddc9;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased;padding:24px";
 var box=document.createElement("div");box.style.cssText="width:min(380px,86vw);text-align:center";
 box.innerHTML="<div style='font-size:11.5px;letter-spacing:.4em;text-transform:uppercase;color:#7d6f5b;margin-bottom:24px'>private</div><div style='font:italic 400 30px/1.2 Georgia,serif;margin-bottom:30px'>Enter to continue</div><input id='syed-gate-i' inputmode='numeric' autocomplete='off' autocapitalize='off' spellcheck='false' aria-label='password' placeholder='········' maxlength='24' style='width:100%;background:transparent;border:0;border-bottom:1px solid #3a3128;color:#e9ddc9;font:400 24px/1 Georgia,serif;text-align:center;letter-spacing:.4em;padding:8px 0 10px;outline:none;caret-color:#bb6a57'/><div id='syed-gate-h' style='margin-top:18px;font-size:12px;letter-spacing:.12em;color:#7d6f5b;height:16px'>enter to open</div>";
 ov.appendChild(box);(document.body||document.documentElement).appendChild(ov);
 var html=document.documentElement,prev=html.style.overflow;html.style.overflow="hidden";
 var inp=box.querySelector("#syed-gate-i"),hint=box.querySelector("#syed-gate-h");
 function ok(){html.style.overflow=prev;if(ov.parentNode)ov.parentNode.removeChild(ov);}
 function tryit(){var v=(inp.value||"").trim();if(v===PASS){ok();return;}if(v.length>=PASS.length){hint.textContent="not quite";inp.value="";inp.style.borderBottomColor="#9c4a3c";setTimeout(function(){hint.textContent="enter to open";inp.style.borderBottomColor="#3a3128";},800);}}
 inp.addEventListener("input",function(){if((inp.value||"").trim().length>=PASS.length)tryit();});
 inp.addEventListener("keydown",function(e){if(e.key==="Enter")tryit();});
 setTimeout(function(){try{inp.focus();}catch(e){}},50);
}
mk();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mk);
})();</script>
<!-- /SYED-GATE -->
`;

const TARGETS = [
  // ── static single-file apps (index.html IS the deployed file) ──
  "bachelor-meal-plan/index.html",
  "callback/index.html",
  "career-compass/index.html",
  "fallacyscope/index.html",
  "greenroom/index.html",
  "journal-timelines/index.html",
  "journaltime/index.html",
  "mirrorscope/index.html",
  "my-thoughts/index.html",
  "nexus/index.html",
  "research-suite/index.html",
  "rethink-with-ai/index.html",
  "scholarscope/index.html",
  "throughline-cs/index.html",
  // syeds-research-book + bookscope intentionally ungated — shipped public (reference libraries)
  // ── Vite root shells (gate survives the build as an inline script) ──
  "researchflow/index.html",
  "toolsscope/index.html",
  "paperpulse/index.html",
  "tracewise/index.html",
  // throughline-studio + theoryscope intentionally ungated — shipped public (front door + library)
  // ── Vite apps with a client/ subdir ──
  "task-manager/client/index.html",
  "karmamap/client/index.html",
  // scalebase/client intentionally ungated — shipped public (reference library)
  // ── other static ──
  "ideabox/public/index.html",
  // NOTE: timetable-generator (Next.js) is gated separately in app/layout.tsx.
];

let stamped = 0, skipped = 0, missing = 0, noanchor = 0;
for (const rel of TARGETS) {
  const fp = path.join(HOME, rel);
  if (!fs.existsSync(fp)) { console.log("  MISSING ", rel); missing++; continue; }
  let html = fs.readFileSync(fp, "utf8");
  if (html.includes("SYED-GATE")) { console.log("  skip    ", rel, "(already gated)"); skipped++; continue; }
  const headIdx = html.search(/<\/head>/i);
  let out;
  if (headIdx !== -1) {
    out = html.slice(0, headIdx) + GATE + html.slice(headIdx);
  } else {
    const bodyMatch = html.match(/<body[^>]*>/i);
    if (!bodyMatch) { console.log("  NOANCHOR", rel); noanchor++; continue; }
    const end = html.indexOf(bodyMatch[0]) + bodyMatch[0].length;
    out = html.slice(0, end) + "\n" + GATE + html.slice(end);
  }
  if (!DRY) fs.writeFileSync(fp, out, "utf8");
  console.log("  stamped ", rel);
  stamped++;
}
console.log(`\n${DRY ? "[dry-run] " : ""}stamped ${stamped} · skipped ${skipped} · missing ${missing} · no-anchor ${noanchor}`);
