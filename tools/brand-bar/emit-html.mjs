// Emit the class-based HTML brand-bar markup (the `<div class="syed-bar">…</div>` block).
// Only the MARKUP is generated; each page keeps its own `.syed-bar*` CSS and the
// `#themeToggle` script. Used for the suite-step single-file apps (cadence, wordmap,
// journaltime), whose 9-step nav must stay in sync with core.SUITE.
//
// Generic/hub bars (nexus, bachelor-meal-plan, career-compass) and the Next layout are
// intentionally NOT generated — their link lists are bespoke per page (see README).
import { SUITE } from './core.mjs';

const STD_LOGO =
  '  <a class="syed-bar-logo" href="https://syahmedu.github.io/nexus/" target="_blank" rel="noopener"><span class="syed-mark">S</span><span class="syed-name">Syed</span></a>';

const TOGGLE = [
  '  <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme" title="Toggle light/dark">',
  '    <span class="sun">☀️</span><span class="moon">🌙</span>',
  '  </button>',
].join('\n');

function suiteStep(s, i, activeStep) {
  const caret = i > 0 ? '<span class="syed-caret" aria-hidden="true">›</span>' : '';
  if (s.key === activeStep) {
    return `    <span class="syed-suite-step">${caret}< class="syed-link syed-link-active" href="#" aria-current="page">${s.label}</a></span>`;
  }
  return `    <span class="syed-suite-step">${caret}< class="syed-link" href="${s.href}" target="_blank" rel="noopener">${s.label}</a></span>`;
}

// entry: { projectName, activeStep }  (suite-step page)
export function emitHtmlBar(entry) {
  const steps = SUITE.map((s, i) => suiteStep(s, i, entry.activeStep)).join('\n');
  return [
    '<div class="syed-bar">',
    STD_LOGO,
    '  <span class="syed-divider"></span>',
    `  <span class="syed-project">${entry.projectName}</span>`,
    '  <nav class="syed-links" aria-label="Research Suite">',
    '    <span class="syed-suite-label">Research Suite</span>',
    steps,
    '  </nav>',
    TOGGLE,
    '</div>',
  ].join('\n');
}
