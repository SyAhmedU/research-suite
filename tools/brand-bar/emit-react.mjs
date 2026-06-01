// Emit a React SyedBar file (.tsx or .jsx) from a registry entry + shared core.
// Output is canonical/clean; values (theme tokens, nav mode, links) are behaviour-preserving.
import {
  WARM_GRAD, KEYFRAME_BASE, KEYFRAME_MOBILE, SUITE, SUITE_STEP_UNION, GENERATED_HEADER,
} from './core.mjs';
import { genericLinks } from './registry.mjs';

const BT = String.fromCharCode(96); // backtick

function effectiveThemeSrc(mode, tsx) {
  const rt = tsx ? ": 'light' | 'dark'" : '';
  if (mode === 'attr') {
    return `function effectiveTheme()${rt} {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
  }
  return 'light';
}`;
  }
  // storage-media
  return `function effectiveTheme()${rt} {
  try {
    const stored = localStorage.getItem('syed-theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* ignore */ }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}`;
}

function suiteArraySrc(tsx) {
  const anno = tsx ? ': { key: SuiteStep; label: string; href: string }[]' : '';
  const rows = SUITE.map(s => `  { key: '${s.key}', label: '${s.label}', href: '${s.href}' },`).join('\n');
  return `const SUITE${anno} = [\n${rows}\n];`;
}

function genericNavSrc(entry, indent) {
  const cls = entry.mobileCollapse ? ' className="syed-suite-nav"' : '';
  const links = genericLinks(entry.generic)
    .map(l => `${indent}  <a style={${l.primary ? 'linkAll' : 'link'}} href="${l.href}" target="_blank" rel="noopener noreferrer">${l.label}</a>`)
    .join('\n');
  return `${indent}<nav${cls} style={links}>\n${links}\n${indent}</nav>`;
}

function suiteNavSrc(entry, indent) {
  const cls = entry.mobileCollapse ? ' className="syed-suite-nav"' : '';
  return `${indent}<nav${cls} style={links} aria-label="Research Suite">
${indent}  <span style={suiteLabel}>Research Suite</span>
${indent}  {SUITE.map((s, i) => (
${indent}    <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
${indent}      {i > 0 && <span style={linkCaret} aria-hidden="true">›</span>}
${indent}      <a
${indent}        style={s.key === currentSuiteStep ? linkActive : link}
${indent}        href={s.href}
${indent}        aria-current={s.key === currentSuiteStep ? 'page' : undefined}
${indent}        target={s.key === currentSuiteStep ? undefined : '_blank'}
${indent}        rel={s.key === currentSuiteStep ? undefined : 'noopener noreferrer'}
${indent}      >
${indent}        {s.label}
${indent}      </a>
${indent}    </span>
${indent}  ))}
${indent}</nav>`;
}

export function emitReact(entry) {
  const tsx = entry.format === 'react-tsx';
  const T = tsx ? ': React.CSSProperties' : '';
  const t = entry.theme;
  const divider = t.divider || t.border;
  const needSuite = entry.nav === 'conditional' || entry.nav === 'suite-only';
  const needLinkAll = entry.nav === 'conditional' || entry.nav === 'generic-only';
  const hasTheme = entry.themeMode !== 'none';
  const L = [];

  L.push(GENERATED_HEADER.trimEnd());
  L.push('');
  if (hasTheme) L.push("import { useState } from 'react';");
  if (hasTheme) L.push('');

  const kfInner = entry.mobileCollapse ? `${KEYFRAME_BASE}\n${KEYFRAME_MOBILE}` : KEYFRAME_BASE;
  L.push(`const KEYFRAMES = ${BT}${kfInner}${BT};`);
  L.push('');
  L.push(`const WARM_GRAD = '${WARM_GRAD}';`);
  L.push('');
  if (hasTheme) { L.push(effectiveThemeSrc(entry.themeMode, tsx)); L.push(''); }

  // --- style objects ---
  L.push(`const bar${T} = {
  position: 'sticky', top: 0, zIndex: 9999,
  display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px',
  height: 48,
  background: '${t.barBg}',
  backdropFilter: 'blur(20px) saturate(150%)',
  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
  borderBottom: '1px solid ${t.border}',
  flexShrink: 0,
  fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif",
};`);
  L.push(`const logo${T} = { display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0, transition: 'opacity .15s' };`);
  L.push(`const mark${T} = {
  width: 28, height: 28, background: WARM_GRAD,
  borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '.78rem', fontWeight: 800, color: '#fff', flexShrink: 0,
  boxShadow: '0 4px 14px -4px rgba(241,69,117,.55)',
  animation: 'syed-glow 5s ease-in-out infinite',
};`);
  L.push(`const nm${T} = { fontSize: '.9rem', fontWeight: 800, color: '${t.name}', letterSpacing: '-.02em' };`);
  L.push(`const divider${T} = { width: 1, height: 16, background: '${divider}', flexShrink: 0, margin: '0 3px' };`);
  L.push(`const project${T} = { fontSize: '.74rem', color: '${t.muted}', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, letterSpacing: '.01em' };`);
  L.push(`const links${T} = { display: 'flex', alignItems: 'center', marginLeft: 'auto', flexShrink: 0, gap: 2 };`);
  L.push(`const link${T} = { fontSize: '.74rem', color: '${t.muted}', textDecoration: 'none', padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '.01em' };`);
  if (needLinkAll) {
    L.push(`const linkAll${T} = {
  fontSize: '.74rem', fontWeight: 700, textDecoration: 'none', padding: '5px 13px', borderRadius: 999,
  background: WARM_GRAD,
  color: '#fff', whiteSpace: 'nowrap', letterSpacing: '.01em',
  boxShadow: '0 6px 16px -6px rgba(241,69,117,.55)',
};`);
  }
  if (entry.toggle === 'inline') {
    L.push(`const toggle${T} = {
  width: 34, height: 34, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '${t.toggleBg}', border: '1px solid ${t.toggleBorder}', color: '${t.toggleColor}',
  cursor: 'pointer', fontSize: '1rem', flexShrink: 0, marginLeft: 4, fontFamily: 'inherit',
  transition: 'transform .2s',
};`);
  }

  // --- suite block (type + data + suite-only styles) ---
  if (needSuite) {
    L.push('');
    if (tsx) L.push(`// Discovery tier (wm, pc) precedes the six-step core pipeline.\ntype SuiteStep = ${SUITE_STEP_UNION};`);
    L.push(suiteArraySrc(tsx));
    const sl = entry.suiteLabel || { color: t.muted };
    const op = sl.opacity != null ? ` opacity: ${sl.opacity},` : '';
    L.push(`const suiteLabel${T} = { fontSize: '.66rem', color: '${sl.color}',${op} textTransform: 'uppercase', letterSpacing: '.08em', marginRight: 6, whiteSpace: 'nowrap' };`);
    L.push(`const linkActive${T} = { ...link, color: '#fff', background: WARM_GRAD, fontWeight: 700, boxShadow: '0 4px 12px -4px rgba(241,69,117,.45)' };`);
    L.push(`const linkCaret${T} = { ...link, opacity: 0.4, padding: '5px 4px', fontSize: '.8rem' };`);
  }

  // --- props signature ---
  const pnDef = entry.projectNameDefault;
  const stepDef = entry.stepDefault;
  let sig;
  if (needSuite) {
    const pnPart = `projectName${pnDef ? ` = '${pnDef}'` : ''}`;
    const stepPart = `currentSuiteStep${stepDef ? ` = '${stepDef}'${tsx ? ' as SuiteStep' : ''}` : ''}`;
    sig = `{ ${pnPart}, ${stepPart} }`;
    if (tsx) sig += `: { projectName${pnDef ? '?' : ''}: string; currentSuiteStep?: SuiteStep }`;
  } else {
    sig = `{ projectName${pnDef ? ` = '${pnDef}'` : ''} }`;
    if (tsx) sig += `: { projectName${pnDef ? '?' : ''}: string }`;
  }

  L.push('');
  L.push(`export default function SyedBar(${sig}) {`);
  if (hasTheme) {
    const st = tsx ? "<'light' | 'dark'>" : '';
    L.push(`  const [theme, setTheme] = useState${st}(effectiveTheme);`);
    L.push('');
    L.push(`  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('syed-theme', next); } catch { /* ignore */ }
    setTheme(next);
  };`);
  }

  if (entry.nav === 'conditional') {
    L.push('');
    L.push(`  const suiteNav = currentSuiteStep ? (`);
    L.push(suiteNavSrc(entry, '    '));
    L.push(`  ) : (`);
    L.push(genericNavSrc(entry, '    '));
    L.push(`  );`);
  }

  // --- button ---
  let button = '';
  if (entry.toggle === 'class') {
    button = `        <button className="theme-toggle" onClick={flip} aria-label="Toggle light/dark theme" title="Toggle light/dark">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>`;
  } else if (entry.toggle === 'inline') {
    button = `        <button style={toggle} onClick={flip} aria-label="Toggle light/dark theme" title="Toggle light/dark">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>`;
  }

  // --- nav markup inside return ---
  let navMarkup;
  if (entry.nav === 'conditional') navMarkup = '        {suiteNav}';
  else if (entry.nav === 'suite-only') navMarkup = suiteNavSrc(entry, '        ');
  else navMarkup = genericNavSrc(entry, '        ');

  L.push('');
  L.push('  return (');
  L.push('    <>');
  L.push('      <style>{KEYFRAMES}</style>');
  L.push('      <div style={bar}>');
  L.push('        <a style={logo} href="https://syahmedu.github.io/nexus/" target="_blank" rel="noopener noreferrer">');
  L.push('          <span style={mark}>S</span>');
  L.push('          <span style={nm}>Syed</span>');
  L.push('        </a>');
  L.push('        <span style={divider} />');
  L.push('        <span style={project}>{projectName}</span>');
  L.push(navMarkup);
  if (button) L.push(button);
  L.push('      </div>');
  L.push('    </>');
  L.push('  );');
  L.push('}');

  return L.join('\n') + '\n';
}
