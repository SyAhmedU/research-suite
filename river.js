/* <corpus-river> — the hand-coded Research Book drawn as one river (hub hero).
 *
 * No-fab: every width, count and year comes from data/corpus-river.json, built by
 * tools/river/build.mjs from papers.index.json (hand-coded tier only). A paper on k
 * constructs adds 1/k to each current, so the river's width each year IS that year's
 * paper count. Hover readouts use the exact integer counts (`c`), never the weights.
 *
 * Motion: slow water-lines drift along each current + a one-time left→right fill.
 * Under prefers-reduced-motion the river is still and a "Let it flow" toggle lets the
 * viewer opt in (remembered per device). Paused when off-screen or the tab is hidden.
 */
(function () {
  if (customElements.get('corpus-river')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const DATA_URL = 'data/corpus-river.json';
  const BOOK = 'https://syahmedu.github.io/syeds-research-book/';
  const FLOW_KEY = 'river_flow';
  const MODE_KEY = 'river_mode';
  const VIEW_FROM = 2000;   // earlier years are a hairline trickle; they are counted in the 'upstream' note
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const esc = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // forest → moss → sage → wheat → peach → coral : established ← average paper year → newer
  const RAMP = {
    light: ['#0f4d42', '#1f6f5c', '#4f9a7a', '#97bf8f', '#d6c27a', '#eda46a', '#e2725f'],
    dark:  ['#2a8a73', '#3fa486', '#6cc09a', '#a8d39c', '#e4cf86', '#f5b07a', '#f0806c'],
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function ramp(t, dark) {
    const st = dark ? RAMP.dark : RAMP.light, x = Math.max(0, Math.min(1, t)) * (st.length - 1);
    const i = Math.min(st.length - 2, Math.floor(x)), f = x - i, a = hex(st[i]), b = hex(st[i + 1]);
    return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
  }

  // Display-only shortening of the long workbook names (full name stays in the readout).
  function shortName(n) {
    return n
      .replace(/\s*\((HRM|HRD|LMX|CSR)\)/g, '')
      .replace(/\s+(in|and its|and their)\s+(Various|Organizational|Work|Personal|Professional|Social|Research)\b.*$/i, '')
      .replace(/\s+and Its (Various )?(Dimensions|Forms|Manifestations|Implications|Dynamics|Impacts?|Components|Expressions|Applications).*$/i, '')
      .replace(/\s+in Organizational Contexts$/i, '')
      .trim();
  }

  // d3.curveBasis, hand-rolled: a uniform B-spline never overshoots its control polygon,
  // so thin currents stay non-negative and shared edges between neighbours match exactly.
  function basis(pts, cmd) {
    let s = '', x0, y0, x1, y1, st = 0;
    const r = (v) => Math.round(v * 10) / 10;
    const bez = (x, y) => { s += `C${r((2 * x0 + x1) / 3)},${r((2 * y0 + y1) / 3)},${r((x0 + 2 * x1) / 3)},${r((y0 + 2 * y1) / 3)},${r((x0 + 4 * x1 + x) / 6)},${r((y0 + 4 * y1 + y) / 6)}`; };
    for (const [x, y] of pts) {
      if (st === 0) { st = 1; s += `${cmd}${r(x)},${r(y)}`; }
      else if (st === 1) st = 2;
      else { if (st === 2) { st = 3; s += `L${r((5 * x0 + x1) / 6)},${r((5 * y0 + y1) / 6)}`; } bez(x, y); }
      x0 = x1; x1 = x; y0 = y1; y1 = y;
    }
    if (st === 3) bez(x1, y1);
    if (st >= 2) s += `L${r(x1)},${r(y1)}`;
    return s;
  }

  // Byron & Wattenberg "wiggle" baseline (as d3.stackOffsetWiggle) — minimises the
  // weighted slope of every current, which is what makes it read as moving water.
  function wiggle(vals) {
    const n = vals.length, m = vals[0].length, g = new Array(m).fill(0);
    let y = 0;
    for (let j = 1; j < m; j++) {
      let s1 = 0, s2 = 0;
      for (let i = 0; i < n; i++) {
        const a = vals[i][j], b = vals[i][j - 1];
        let s3 = (a - b) / 2;
        for (let k = 0; k < i; k++) s3 += vals[k][j] - vals[k][j - 1];
        s1 += a; s2 += s3 * a;
      }
      if (s1) y -= s2 / s1;
      g[j] = y;
    }
    return g;
  }

  // Inside-out order: earliest-centred currents in the middle, newer ones laid outward
  // on whichever bank is lighter — the classic streamgraph balance.
  function insideOut(streams) {
    const by = [...streams].sort((a, b) => a.meanYear - b.meanYear);
    const top = [], bot = []; let wt = 0, wb = 0;
    for (const s of by) { if (wt <= wb) { top.push(s); wt += s.total; } else { bot.push(s); wb += s.total; } }
    return [...bot.reverse(), ...top];
  }

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  class CorpusRiver extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true;
      this.innerHTML = `
        <p class="cr-finding"></p>
        <div class="cr-stage">
          <svg class="cr-svg" role="img" aria-labelledby="crTitle crDesc"><title id="crTitle">The Research Book as a river</title><desc id="crDesc">Loading the hand-coded corpus…</desc></svg>
          <div class="cr-tip" role="status" aria-live="polite" hidden></div>
        </div>
        <div class="cr-foot">
          <div class="cr-legend" aria-hidden="true"><span>established</span><i class="cr-ramp"></i><span>newer</span><em class="cr-legend-note">colour = a construct's average paper year</em></div>
          <div class="cr-tools">
            <div class="cr-mode" role="group" aria-label="River lens">
              <button type="button" data-mode="volume" title="Width = papers published that year">Papers</button>
              <button type="button" data-mode="share" title="Every year full height — how the mix of constructs drifts">Share of year</button>
            </div>
            <button type="button" class="cr-flow" hidden>▶ Let it flow</button>
          </div>
        </div>
        <nav class="cr-currents" aria-label="Rising, fading and largest currents — open in the Research Book"></nav>`;
      this.svg = this.querySelector('.cr-svg');
      this.tip = this.querySelector('.cr-tip');
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      let opted = false; try { opted = localStorage.getItem(FLOW_KEY) === '1'; } catch (_) {}
      this.flow = !this.reduce.matches || opted;
      const btn = this.querySelector('.cr-flow');
      const syncBtn = () => {
        btn.hidden = !this.reduce.matches;            // only offered where the OS asked for stillness
        btn.textContent = this.flow ? '❚❚ Hold still' : '▶ Let it flow';
        btn.setAttribute('aria-pressed', String(this.flow));
        this.classList.toggle('is-flowing', this.flow);
      };
      btn.addEventListener('click', () => {
        this.flow = !this.flow;
        try { localStorage.setItem(FLOW_KEY, this.flow ? '1' : '0'); } catch (_) {}
        syncBtn();
      });
      this.reduce.addEventListener?.('change', () => { if (!this.reduce.matches) this.flow = true; syncBtn(); });
      syncBtn();

      this.mode = 'volume'; try { if (localStorage.getItem(MODE_KEY) === 'share') this.mode = 'share'; } catch (_) {}
      const modeBtns = [...this.querySelectorAll('.cr-mode button')];
      const syncMode = () => modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === this.mode)));
      modeBtns.forEach((b) => b.addEventListener('click', () => {
        if (this.mode === b.dataset.mode) return;
        this.mode = b.dataset.mode; syncMode();
        try { localStorage.setItem(MODE_KEY, this.mode); } catch (_) {}
        if (this.data) this.render();
      }));
      syncMode();

      // pause the water when nobody can see it
      const io = new IntersectionObserver((es) => es.forEach((e) => this.classList.toggle('is-offscreen', !e.isIntersecting)));
      io.observe(this);
      document.addEventListener('visibilitychange', () => this.classList.toggle('is-offscreen', document.hidden));
      new MutationObserver(() => this.data && this.render()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      fetch(DATA_URL).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d) => {
        this.data = d;
        this.prep();
        this.render();
        let w = this.clientWidth;
        new ResizeObserver(() => { if (Math.abs(this.clientWidth - w) > 8) { w = this.clientWidth; clearTimeout(this._rt); this._rt = setTimeout(() => this.render(), 120); } }).observe(this);
      }).catch(() => { this.hidden = true; });  // no snapshot → no river, never a fake one
    }

    prep() {
      const d = this.data;
      // colour by RANK of average year, so the 2012–2023 spread fills the whole ramp
      const ranks = [...d.streams].sort((a, b) => a.meanYear - b.meanYear);
      ranks.forEach((s, i) => { s.t = i / Math.max(1, ranks.length - 1); });
      // the drawn window: VIEW_FROM → last year; everything earlier is counted, not drawn
      const k0 = Math.max(0, d.years.indexOf(VIEW_FROM));
      this.yrs = d.years.slice(k0);
      this.pby = d.papersByYear.slice(k0);
      this.upstream = d.before + d.papersByYear.slice(0, k0).reduce((a, b) => a + b, 0);
      for (const st of d.streams) {
        st.v = st.s.slice(k0);
        st.cv = st.c.slice(k0);
        st.sh = st.v.map((v, j) => (this.pby[j] ? v / this.pby[j] : 0));
      }
      this.order = insideOut(d.streams);
      const N = this.pby.reduce((a, b) => a + b, 0), nCon = d.streams.length;
      this.querySelector('#crDesc').textContent =
        `${fmt(N)} hand-coded papers published ${this.yrs[0]}–${this.yrs[this.yrs.length - 1]}, as ${nCon} construct currents. ` +
        `The river widens from ${this.pby[0]} papers in ${this.yrs[0]} to ${fmt(Math.max(...this.pby))} at its widest.`;
      // fill the band's copy from the same snapshot (no hard-coded counts in the page)
      document.querySelectorAll('[data-river="constructs"]').forEach((e) => { e.textContent = String(nCon); });
      document.querySelectorAll('[data-river="span"]').forEach((e) => {
        e.textContent = `Drawn ${this.yrs[0]}–${this.yrs[this.yrs.length - 1]}: ${fmt(N)} of ${fmt(d.totalPapers)} papers` +
          ` (${fmt(this.upstream)} earlier, ${fmt(d.after)} later and ${fmt(d.noYear)} undated aren't drawn).`;
      });
      // rising / fading: each current's share of its years' papers, the last four complete years
      // vs the four years five earlier (both straight from the snapshot; small currents skipped as noise)
      const done = d.years.map((y, i) => [y, i]).filter(([y]) => !(d.partialYears || []).includes(y));
      const late = done.slice(-4), early = done.filter(([y]) => y <= late[0][0] - 2 && y >= late[0][0] - 5);
      const sum = (ix, arr) => ix.reduce((t, [, i]) => t + arr[i], 0);
      const nE = sum(early, d.papersByYear), nL = sum(late, d.papersByYear);
      const MIN = 40;
      const moves = early.length === 4 && nE && nL ? d.streams
        .map((s) => { const a = sum(early, s.s), b = sum(late, s.s); return { s, a, b, pa: (a / nE) * 100, pb: (b / nL) * 100 }; })
        .filter((m) => m.a + m.b >= MIN)
        .map((m) => ({ ...m, dp: m.pb - m.pa })) : [];
      const rising = [...moves].sort((x, y) => y.dp - x.dp).filter((m) => m.dp > 0).slice(0, 4);
      const fading = [...moves].sort((x, y) => x.dp - y.dp).filter((m) => m.dp < 0).slice(0, 4);
      const span = (w) => `${w[0][0]}–${String(w[w.length - 1][0]).slice(2)}`;
      const pct = (v) => `${v.toFixed(1)}%`;
      const fd = this.querySelector('.cr-finding');
      if (rising.length && fading.length) {
        const r = rising[0], f = fading[0];
        fd.innerHTML = `<b>${esc(shortName(r.s.name))}</b> rose furthest: ${pct(r.pa)} of each year's papers in ${span(early)} → <b>${pct(r.pb)}</b> in ${span(late)}. ` +
          `<b>${esc(shortName(f.s.name))}</b> fell furthest: ${pct(f.pa)} → <b>${pct(f.pb)}</b>.` +
          `<span class="cr-finding-k"> Share of hand-coded papers, so a current can shrink while its count still grows · currents under ${MIN} papers across both windows skipped.</span>`;
      } else fd.hidden = true;
      const chip = (s, val, ttl) => `<a data-code="${esc(s.code)}" href="${BOOK}?construct=${encodeURIComponent(s.code)}" target="_blank" rel="noopener" style="--c:${ramp(s.t, false)}" title="${esc(ttl)}"><i></i>${esc(shortName(s.name))}<b>${val}</b></a>`;
      const mv = (m) => chip(m.s, `${m.dp > 0 ? '+' : '−'}${Math.abs(m.dp).toFixed(1)} pts`, `${m.s.name}: ${pct(m.pa)} of papers in ${span(early)} → ${pct(m.pb)} in ${span(late)}`);
      const nav = this.querySelector('.cr-currents');
      nav.innerHTML =
        (rising.length ? `<div class="cr-row"><span class="cr-currents-k">Rising</span>${rising.map(mv).join('')}</div>` : '') +
        (fading.length ? `<div class="cr-row"><span class="cr-currents-k">Fading</span>${fading.map(mv).join('')}</div>` : '') +
        `<div class="cr-row"><span class="cr-currents-k">Largest</span>${d.streams.slice(0, 6).map((s) => { const n = s.c.reduce((a, b) => a + b, 0); return chip(s, fmt(n), `${s.name} · ${fmt(n)} papers`); }).join('')}</div>`;
    }

    // light one current from outside the river (legend chips) — same look as hovering it
    focusCode(code) {
      const i = code == null ? -1 : this.order.findIndex((s) => s.code === code);
      this.paths?.forEach((p, k) => p.classList.toggle('is-on', k === i));
      this.svg.classList.toggle('is-reading', i >= 0);
    }

    render() {
      const d = this.data, svg = this.svg, dark = document.documentElement.dataset.theme === 'dark';
      const W = Math.max(320, this.clientWidth), mobile = W < 640;
      const H = mobile ? 250 : Math.min(440, Math.max(330, W * 0.3)), AX = 26, PAD = 8;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
      [...svg.children].forEach((c) => { if (c.tagName !== 'title' && c.tagName !== 'desc') c.remove(); });

      const years = this.yrs, m = years.length, n = this.order.length, share = this.mode === 'share';
      const key = share ? 'sh' : 'v';
      const g0 = wiggle(this.order.map((s) => s[key]));
      this.classList.toggle('is-share', share);
      // stacked bounds per current per year (in data units)
      const lo = [], hi = [];
      let yMin = Infinity, yMax = -Infinity;
      const run = g0.slice();
      for (let i = 0; i < n; i++) {
        lo[i] = []; hi[i] = [];
        for (let j = 0; j < m; j++) { lo[i][j] = run[j]; run[j] += this.order[i][key][j]; hi[i][j] = run[j]; }
      }
      for (let j = 0; j < m; j++) { yMin = Math.min(yMin, lo[0][j]); yMax = Math.max(yMax, hi[n - 1][j]); }
      const x = (j) => PAD + (j / (m - 1)) * (W - PAD * 2);
      const ky = (H - AX - PAD * 2) / (yMax - yMin);
      const y = (v) => PAD + (yMax - v) * ky;
      this.geo = { x, y, lo, hi, m, W, H, AX, PAD };

      const defs = el('defs', {}, svg);
      // depth: light from above, a darker bed below — water, not flat paint
      const sheen = el('linearGradient', { id: 'crSheen', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': dark ? 0.1 : 0.32 }, sheen);
      el('stop', { offset: 0.5, 'stop-color': '#fff', 'stop-opacity': 0 }, sheen);
      el('stop', { offset: 1, 'stop-color': dark ? '#000' : '#0b2b24', 'stop-opacity': dark ? 0.35 : 0.16 }, sheen);
      const reveal = el('clipPath', { id: 'crReveal' }, defs);
      el('rect', { class: 'cr-reveal', x: 0, y: 0, width: W, height: H }, reveal);
      // the partial year: hatch, not a fake decline
      const hatch = el('pattern', { id: 'crHatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: dark ? 'rgba(255,255,255,.22)' : 'rgba(23,40,32,.18)', 'stroke-width': 2 }, hatch);

      // decade grid + year axis (drawn under the water)
      const grid = el('g', { class: 'cr-grid' }, svg);
      // keep the axis row clear for the partial-year note on the right
      const pj = (d.partialYears || []).map((py) => years.indexOf(py)).filter((j) => j > 0);
      const noteW = pj.length ? (mobile ? 70 : 250) : 0;
      years.forEach((yr, j) => {
        if (yr % 5) return;
        if (noteW && j > 0 && x(j) + 16 > W - PAD - noteW) return;
        el('line', { x1: x(j), x2: x(j), y1: PAD, y2: H - AX + 4 }, grid);
        const t = el('text', { x: x(j), y: H - 8, 'text-anchor': j === 0 ? 'start' : j === m - 1 ? 'end' : 'middle' }, grid);
        t.textContent = yr;
      });

      const water = el('g', { class: 'cr-water', 'clip-path': 'url(#crReveal)' }, svg);
      const bank = el('g', { class: 'cr-streams' }, water);
      this.paths = [];
      for (let i = 0; i < n; i++) {
        const s = this.order[i];
        const top = hi[i].map((v, j) => [x(j), y(v)]);
        const bot = lo[i].map((v, j) => [x(j), y(v)]).reverse();
        const dPath = basis(top, 'M') + basis(bot, 'L') + 'Z';
        const p = el('path', { d: dPath, fill: ramp(s.t, dark), class: 'cr-stream' }, bank);
        p.dataset.i = i;
        this.paths.push(p);
        s._d = dPath;
      }
      // one sheen over the whole river, masked to the river's own silhouette
      const silhouette = el('clipPath', { id: 'crBody' }, defs);
      el('path', { d: basis(hi[n - 1].map((v, j) => [x(j), y(v)]), 'M') + basis(lo[0].map((v, j) => [x(j), y(v)]).reverse(), 'L') + 'Z' }, silhouette);
      el('rect', { x: 0, y: 0, width: W, height: H - AX, fill: 'url(#crSheen)', 'clip-path': 'url(#crBody)', class: 'cr-sheen' }, water);

      // water-lines: thin currents riding the centre of the larger streams, each clipped
      // to its own stream so a line never leaves its channel
      const lines = el('g', { class: 'cr-lines' }, water);
      const big = this.order.map((s, i) => [s, i]).filter(([s]) => s.total > (mobile ? 60 : 32));
      big.forEach(([s, i], k) => {
        const cp = el('clipPath', { id: `crC${i}` }, defs);
        el('path', { d: s._d }, cp);
        const mid = hi[i].map((v, j) => [x(j), y((v + lo[i][j]) / 2)]);
        const dur = 18 + ((k * 7) % 17);                       // 18–34 s: a slow, uneven river
        for (const off of [0, 0.5]) {                          // two staggered dash trains
          el('path', {
            d: basis(mid, 'M'), class: 'cr-line', 'clip-path': `url(#crC${i})`,
            // resting offset scatters the dashes when still (reduced motion); the negative
            // delay desynchronises the trains when flowing
            style: `--dur:${dur}s;--delay:${-(dur * (off + (k % 5) / 10)).toFixed(2)}s;stroke-dashoffset:${-(((k * 97 + off * 118) % 236) | 0)}`,
          }, lines);
        }
      });

      // partial final year veil
      (d.partialYears || []).forEach((py) => {
        const j = years.indexOf(py); if (j < 1) return;
        const x0 = (x(j - 1) + x(j)) / 2;
        el('rect', { x: x0, y: PAD, width: W - x0, height: H - AX - PAD, fill: 'url(#crHatch)', class: 'cr-partial' }, svg);
        // sits in the axis row (the 2020 tick is far enough left), never over the water
        const t = el('text', { x: W - PAD, y: H - 8, 'text-anchor': 'end', class: 'cr-note cr-note-partial' }, svg);
        t.textContent = mobile ? `’${String(py).slice(2)} partial` : `${py} · coding in progress (${fmt(this.pby[j])} so far)`;
      });

      // inline labels on the widest currents, placed where each runs widest (before the partial year)
      const lab = el('g', { class: 'cr-labels', 'aria-hidden': 'true' }, svg);
      const maxJ = m - 2, minJ = Math.floor(m * 0.45);
      const placed = [];
      const nLab = mobile ? 3 : W < 1000 ? 5 : 8;
      this.order.map((s, i) => [s, i]).sort((a, b) => b[0].total - a[0].total).forEach(([s, i]) => {
        if (placed.length >= nLab) return;
        let bj = -1, bw = 0;
        for (let j = minJ; j <= maxJ; j++) { const w = (hi[i][j] - lo[i][j]) * ky; if (w > bw) { bw = w; bj = j; } }
        if (bj < 0 || bw < (mobile ? 13 : 15)) return;
        const lx = x(bj), lyy = y((hi[i][bj] + lo[i][bj]) / 2);
        const name = shortName(s.name), tw = name.length * 6.4;
        if (placed.some((p) => Math.abs(p.x - lx) < (p.w + tw) / 2 + 10 && Math.abs(p.y - lyy) < 16)) return;
        if (lx - tw / 2 < PAD || lx + tw / 2 > W - PAD) return;
        placed.push({ x: lx, y: lyy, w: tw });
        const t = el('text', { x: lx, y: lyy + 4, 'text-anchor': 'middle', class: 'cr-label' }, lab);
        t.textContent = name;
      });

      // honest bookends, computed from the data
      // (volume lens only — in the share lens the water fills the frame)
      if (!share) {
        const ann = el('g', { class: 'cr-ann', 'aria-hidden': 'true' }, svg);
        const t0 = el('text', { x: PAD + 2, y: y(lo[0][0]) - 24, class: 'cr-note' }, ann);
        t0.textContent = `${years[0]} · ${fmt(this.pby[0])} papers`;
        if (this.upstream) {
          const tu = el('text', { x: PAD + 2, y: y(lo[0][0]) - 10, class: 'cr-note cr-note-faint' }, ann);
          tu.textContent = `+ ${fmt(this.upstream)} earlier, upstream`;
        }
        const pk = this.pby.indexOf(Math.max(...this.pby));
        const t1 = el('text', { x: x(pk) - 8, y: Math.max(PAD + 14, y(hi[n - 1][pk]) - 4), 'text-anchor': 'end', class: 'cr-note cr-note-strong' }, ann);
        t1.textContent = `${years[pk]} · ${fmt(this.pby[pk])} papers`;
      }

      // scrubber
      this.scrub = el('line', { class: 'cr-scrub', x1: 0, x2: 0, y1: PAD, y2: H - AX }, svg);
      this.bindPointer();
    }

    hit(px, py) {
      const { x, y, lo, hi, m, W, PAD } = this.geo;
      const f = Math.max(0, Math.min(m - 1, ((px - PAD) / (W - PAD * 2)) * (m - 1)));
      const j = Math.round(f), j0 = Math.floor(f), j1 = Math.min(m - 1, j0 + 1), u = f - j0;
      for (let i = 0; i < lo.length; i++) {
        const a = lo[i][j0] + (lo[i][j1] - lo[i][j0]) * u, b = hi[i][j0] + (hi[i][j1] - hi[i][j0]) * u;
        if (py <= y(a) + 1 && py >= y(b) - 1 && b - a > 0) return { i, j };
      }
      return { i: -1, j };
    }

    bindPointer() {
      if (this._bound) return; this._bound = true;
      const svg = this.svg, d = this.data;
      const pos = (e) => { const r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
      const clear = () => { svg.classList.remove('is-reading'); this.paths?.forEach((p) => p.classList.remove('is-on')); this.tip.hidden = true; this.scrub.style.opacity = 0; this._on = null; };
      const move = (e) => {
        const [px, py, r] = pos(e); const { i, j } = this.hit(px, py);
        const { x } = this.geo;
        this.scrub.setAttribute('x1', x(j)); this.scrub.setAttribute('x2', x(j)); this.scrub.style.opacity = 1;
        if (this._on !== i) {
          this.paths.forEach((p, k) => p.classList.toggle('is-on', k === i));
          svg.classList.toggle('is-reading', i >= 0);
          this._on = i;
        }
        const yr = this.yrs[j], tot = this.pby[j], partial = (d.partialYears || []).includes(yr);
        let html = `<div class="cr-tip-y">${yr}${partial ? ' <span>· partial year</span>' : ''}</div><div class="cr-tip-tot">${fmt(tot)} papers in the river</div>`;
        if (i >= 0) {
          const s = this.order[i], c = s.cv[j];
          html += `<div class="cr-tip-name" style="--c:${ramp(s.t, document.documentElement.dataset.theme === 'dark')}"><i></i>${esc(s.name)}</div>` +
            `<div class="cr-tip-n"><b>${fmt(c)}</b> paper${c === 1 ? '' : 's'} coded here in ${yr}${this.mode === 'share' ? ` · ${(s.sh[j] * 100).toFixed(1)}% of the year` : ''} · ${fmt(s.c.reduce((a, b) => a + b, 0))} all years</div>` +
            `<div class="cr-tip-hint">${e.pointerType === 'touch' ? 'Tap again' : 'Click'} to open in the Research Book ↗</div>`;
        }
        this.tip.innerHTML = html; this.tip.hidden = false;
        const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
        let tx = px + 16, ty = py - th - 14;
        if (tx + tw > r.width - 4) tx = px - tw - 16;
        if (ty < 4) ty = py + 18;
        this.tip.style.transform = `translate(${Math.max(4, tx)}px,${Math.min(r.height - th - 4, ty)}px)`;
        this._last = { i, j };
      };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') clear(); });
      svg.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { const prev = this._last; move(e); this._tapArmed = prev && this._last && prev.i === this._last.i && prev.i >= 0; } });
      svg.addEventListener('click', (e) => {
        const [px, py] = pos(e); const { i, j } = this.hit(px, py);
        if (i < 0) return;
        if (e.pointerType === 'touch' && !this._tapArmed) return;   // first tap reads, second opens
        const s = this.order[i];
        window.open(`${BOOK}?construct=${encodeURIComponent(s.code)}&year=${this.yrs[j]}`, '_blank', 'noopener');
      });
      document.addEventListener('pointerdown', (e) => { if (!this.contains(e.target)) clear(); });
      svg.style.cursor = 'crosshair';
      const nav = this.querySelector('.cr-currents');
      nav.addEventListener('pointerover', (e) => { const a = e.target.closest('a[data-code]'); if (a) this.focusCode(a.dataset.code); });
      nav.addEventListener('pointerleave', () => this.focusCode(null));
      nav.addEventListener('focusin', (e) => { const a = e.target.closest('a[data-code]'); if (a) this.focusCode(a.dataset.code); });
      nav.addEventListener('focusout', () => this.focusCode(null));
    }
  }
  customElements.define('corpus-river', CorpusRiver);
})();
