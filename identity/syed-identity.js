/* ════════════════════════════════════════════════════════════════════════
   SYED IDENTITY — behaviour layer (companion to syed-identity.css).
   ────────────────────────────────────────────────────────────────────────
   Self-contained, dependency-free, idempotent. Drop in once:
       <script src="syed-identity.js" defer></script>
   …or inline its contents. It will, only if missing:
     • inject the ambient blobs (.sx-bg) + cursor glow (.sx-cursor-glow)
     • add the .sx-grain class to <body>
     • wire the page-wide cursor-following glow
     • initialise + persist the shared theme (localStorage 'syed-theme'),
       and bind any [data-sx-theme-toggle] button
     • reveal [data-sx-reveal] elements on scroll with a soft rise

   All motion bows to prefers-reduced-motion. Nothing here assumes a
   framework — it works on a static HTML file or alongside React/Vite.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__sxIdentityInit) return;          // idempotent — safe to include twice
  window.__sxIdentityInit = true;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  // ── Shared theme (must run ASAP to avoid a flash) ──────────────────
  var THEME_KEY = 'syed-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    document.querySelectorAll('[data-sx-theme-toggle]').forEach(function (b) {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
    });
  }
  (function initTheme() {
    var t = 'light';
    try {
      var s = localStorage.getItem(THEME_KEY);
      if (s === 'dark' || s === 'light') t = s;
      else if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) t = 'dark';
    } catch (e) {}
    applyTheme(t);
  })();
  window.sxToggleTheme = function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };

  // Px-accurate viewport-height unit (var(--sx-vh)) for mobile browsers
  // whose URL bar makes 100vh lie. CSS uses dvh first, this as the fallback.
  function setVH() { document.documentElement.style.setProperty('--sx-vh', (window.innerHeight * 0.01) + 'px'); }
  setVH();
  window.addEventListener('resize', setVH, { passive: true });
  window.addEventListener('orientationchange', setVH, { passive: true });

  ready(function () {
    var body = document.body;

    // ── Paper grain ────────────────────────────────────────────────
    body.classList.add('sx-grain');

    // ── Ambient blobs (inject if not already present) ──────────────
    if (!document.querySelector('.sx-bg')) {
      var bg = document.createElement('div');
      bg.className = 'sx-bg'; bg.setAttribute('aria-hidden', 'true');
      bg.innerHTML = '<span class="sx-blob b1"></span><span class="sx-blob b2"></span><span class="sx-blob b3"></span>';
      body.insertBefore(bg, body.firstChild);
    }

    // ── Cursor glow (inject if not already present) ────────────────
    var glow = document.querySelector('.sx-cursor-glow');
    if (!glow) {
      glow = document.createElement('div');
      glow.className = 'sx-cursor-glow'; glow.setAttribute('aria-hidden', 'true');
      body.appendChild(glow);
    }

    // ── Theme toggle buttons ───────────────────────────────────────
    document.querySelectorAll('[data-sx-theme-toggle]').forEach(function (b) {
      b.addEventListener('click', window.sxToggleTheme);
      b.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    });

    if (reduce) return;  // everything below is motion

    // ── Cursor-following glow (lazy lerp) ──────────────────────────
    var tx = 0.5, ty = 0.5, cx = 0.5, cy = 0.5, raf = null;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var root = document.documentElement;
      root.style.setProperty('--cx', e.clientX);
      root.style.setProperty('--cy', e.clientY);
    }, { passive: true });

    // ── Scroll reveal for [data-sx-reveal] ─────────────────────────
    var els = document.querySelectorAll('[data-sx-reveal]');
    if (els.length && 'IntersectionObserver' in window) {
      els.forEach(function (el) { el.classList.add('sx-reveal'); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('sx-in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
      els.forEach(function (el) { io.observe(el); });
    }
  });
})();
