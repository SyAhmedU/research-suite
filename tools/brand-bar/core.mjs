// Brand bar — single source of truth (shared values & data).
// Consumed by emit-react.mjs. Edit here, then run: node tools/brand-bar/build.mjs
// See README.md.

export const WARM_GRAD = 'linear-gradient(135deg,#FF9656 0%,#F14575 55%,#9270F4 100%)';

// Base keyframe (always present). The mobile-collapse line is appended per-project
// (entries with mobileCollapse:true), because it only matters when the suite nav renders.
export const KEYFRAME_BASE =
  '@keyframes syed-glow{0%,100%{box-shadow:0 4px 14px -4px rgba(241,69,117,.45)}50%{box-shadow:0 6px 22px -4px rgba(146,112,244,.55)}}';
export const KEYFRAME_MOBILE =
  "/* Collapse the suite nav on mobile so it can't force a desktop-width layout */\n" +
  '@media (max-width:760px){.syed-suite-nav{display:none!important}}';

// The Research Suite chain (discovery → core pipeline). Was 9 steps; IdeaBox (ib)
// and Wordmap (wm) were cut from the product (simplification merges #3/#4, 2026-06):
// Wordmap folded into the Library's Term Trends view; IdeaBox decoupled to standalone.
// EDIT THE STEP LIST / LABELS / HREFS HERE ONLY — every consumer regenerates from this.
export const SUITE = [
  { key: 'pc', label: 'PaperCards',   href: 'https://papercards.vercel.app' },
  { key: 'rf', label: 'ResearchFlow', href: 'https://researchflow-syahmedus-projects.vercel.app' },
  { key: 'ts', label: 'TheoryScope',  href: 'https://theoryscope.vercel.app' },
  { key: 'ss', label: 'ScaleScope',   href: 'https://scalescope.vercel.app' },
  { key: 'cd', label: 'Cadence',      href: 'https://syahmedu.github.io/cadence/' },
  { key: 'to', label: 'ToolsScope',   href: 'https://toolsscope.vercel.app' },
  { key: 'jt', label: 'JournalTime',  href: 'https://syahmedu.github.io/journaltime/' },
];

// The SuiteStep union string, derived from SUITE so the type can never drift from the data.
export const SUITE_STEP_UNION = SUITE.map(s => `'${s.key}'`).join(' | ');

// Named generic-nav link presets (used when a project is NOT a suite-step page).
// `primary: true` renders with the gradient "All Projects" pill style.
export const LINK = {
  journaltime: { label: 'JournalTime', href: 'https://syahmedu.github.io/journaltime/' },
  cadence:     { label: 'Cadence',     href: 'https://syahmedu.github.io/cadence/' },
  taskflow:    { label: 'TaskFlow',    href: 'https://task-manager-production-5683.up.railway.app' },
  scalescope:  { label: 'ScaleScope',  href: 'https://scalescope.vercel.app' },
  theoryscope: { label: 'TheoryScope', href: 'https://theoryscope.vercel.app' },
  toolsscope:  { label: 'ToolsScope',  href: 'https://toolsscope.vercel.app' },
  allProjects: { label: 'All Projects →', href: 'https://syahmedu.github.io/nexus/', primary: true },
};

export const GENERATED_HEADER =
  '// GENERATED from research-suite/tools/brand-bar — do not edit by hand.\n' +
  '// Edit core.mjs / registry.mjs there, then run: node tools/brand-bar/build.mjs\n';
