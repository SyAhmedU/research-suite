// Per-project brand-bar configuration. One entry per consumer file.
// Values here are captured to be BEHAVIOUR-PRESERVING vs. the current hand-written
// files (same CSS-var families, theme-init mode, toggle style, nav mode, links).
// `repoPath` is relative to the home dir (all projects are siblings).
//
// Knobs:
//   format     : 'react-tsx' | 'react-jsx'
//   themeMode  : 'attr' (read data-theme) | 'storage-media' (localStorage + matchMedia) | 'none' (no toggle)
//   theme      : { barBg, border, name, muted, divider?, toggleBg?, toggleBorder?, toggleColor? }
//                (divider defaults to border; toggle* only used when toggle === 'inline')
//   toggle     : 'class' (className="theme-toggle") | 'inline' | 'none'
//   mobileCollapse : include the @media collapse rule + .syed-suite-nav class on the nav
//   nav        : 'conditional' (suite if currentSuiteStep else generic) | 'suite-only' | 'generic-only'
//   stepDefault / projectNameDefault : optional prop defaults
//   suiteLabel : { color, opacity? }  (only needed when nav involves the suite block)
//   generic    : ordered LINK keys (only needed when a generic nav can render)

import { LINK } from './core.mjs';

const BAR = { barBg: 'var(--bar-bg)', border: 'var(--border)', name: 'var(--bar-text)', muted: 'var(--bar-muted)' };
const INK = { barBg: 'color-mix(in srgb, var(--bg-elev) 82%, transparent)', border: 'var(--line)', name: 'var(--ink)', muted: 'var(--ink-soft)' };
const TXT = { barBg: 'color-mix(in srgb, var(--bg) 82%, transparent)', border: 'var(--border)', name: 'var(--text-h)', muted: 'var(--text)' };

const INK_TOGGLE = { toggleBg: 'var(--bg-soft)', toggleBorder: 'var(--line)', toggleColor: 'var(--ink-soft)' };
const TXT_TOGGLE = { toggleBg: 'var(--code-bg)', toggleBorder: 'var(--border)', toggleColor: 'var(--text)' };

export const REGISTRY = [
  {
    name: 'scalebase',
    repoPath: 'scalebase/client/src/components/SyedBar.tsx',
    format: 'react-tsx', themeMode: 'attr', toggle: 'class', mobileCollapse: true,
    nav: 'conditional',
    theme: BAR,
    suiteLabel: { color: 'var(--bar-muted)' },
    generic: ['journaltime', 'cadence', 'taskflow', 'allProjects'],
  },
  {
    name: 'researchflow',
    repoPath: 'researchflow/src/components/SyedBar.tsx',
    format: 'react-tsx', themeMode: 'storage-media', toggle: 'inline', mobileCollapse: true,
    nav: 'conditional',
    theme: { ...TXT, ...TXT_TOGGLE },
    suiteLabel: { color: 'var(--text)', opacity: 0.6 },
    generic: ['journaltime', 'cadence', 'taskflow', 'allProjects'],
  },
  {
    name: 'theoryscope',
    repoPath: 'theoryscope/src/components/SyedBar.tsx',
    format: 'react-tsx', themeMode: 'storage-media', toggle: 'inline', mobileCollapse: true,
    nav: 'conditional', projectNameDefault: 'TheoryScope',
    theme: { ...INK, ...INK_TOGGLE },
    suiteLabel: { color: 'var(--ink-mute)' },
    generic: ['journaltime', 'cadence', 'allProjects'],
  },
  {
    name: 'toolsscope',
    repoPath: 'toolsscope/src/components/SyedBar.tsx',
    format: 'react-tsx', themeMode: 'storage-media', toggle: 'inline', mobileCollapse: true,
    nav: 'suite-only', projectNameDefault: 'ToolsScope', stepDefault: 'to',
    theme: { ...INK, ...INK_TOGGLE },
    suiteLabel: { color: 'var(--ink-mute)' },
  },
  {
    name: 'paperpulse',
    repoPath: 'paperpulse/src/components/SyedBar.tsx',
    format: 'react-tsx', themeMode: 'storage-media', toggle: 'inline', mobileCollapse: true,
    nav: 'conditional', projectNameDefault: 'PaperCards', stepDefault: 'pc',
    theme: { ...INK, ...INK_TOGGLE },
    suiteLabel: { color: 'var(--ink-soft)', opacity: 0.7 },
    generic: ['theoryscope', 'scalescope', 'toolsscope', 'allProjects'],
  },
  {
    name: 'tracewise',
    repoPath: 'tracewise/src/components/SyedBar.tsx',
    format: 'react-tsx', themeMode: 'storage-media', toggle: 'inline', mobileCollapse: false,
    nav: 'generic-only',
    theme: { ...TXT, ...TXT_TOGGLE },
    generic: ['journaltime', 'cadence', 'scalescope', 'allProjects'],
  },
  {
    name: 'task-manager',
    repoPath: 'task-manager/client/src/components/SyedBar.jsx',
    format: 'react-jsx', themeMode: 'attr', toggle: 'class', mobileCollapse: false,
    nav: 'generic-only',
    theme: BAR,
    generic: ['journaltime', 'cadence', 'scalescope', 'allProjects'],
  },
  {
    name: 'karmamap',
    repoPath: 'karmamap/client/src/components/SyedBar.jsx',
    format: 'react-jsx', themeMode: 'none', toggle: 'none', mobileCollapse: false,
    nav: 'generic-only',
    // Static, light-only variant — hardcoded literals, no CSS vars, no toggle.
    theme: { barBg: 'rgba(255,255,255,.82)', border: 'rgba(14,14,24,.08)', name: '#0E0E18', muted: '#6F6F7E', divider: 'rgba(14,14,24,.10)' },
    generic: ['journaltime', 'cadence', 'scalescope', 'allProjects'],
  },
];

// Resolve a generic link-key list to LINK objects.
export function genericLinks(keys) {
  return (keys || []).map(k => {
    const l = LINK[k];
    if (!l) throw new Error(`Unknown generic link key: ${k}`);
    return l;
  });
}
