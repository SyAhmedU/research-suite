/* <corpus-tree> — one construct of the hand-coded Research Book, grown as a tree (hub hero).
 *
 * The question it answers: "What has my topic been studied WITH, since when, and how much?"
 *   trunk   = the construct; rings along it = its hand-coded papers per year (height = time)
 *   branch  = another construct coded on the same papers; it sprouts at the year they were
 *             first coded together; thickness/length = how many papers carry both
 *   leaf    = ONE real paper coded to both (hover for its title, click for the DOI);
 *             colour = its year, oldest at the cluster's heart, newest at the edge
 *   seed    = a large construct never coded together with it in this corpus — a gap hint,
 *             handed to ResearchFlow, never a claim about the wider literature
 *
 * No-fab: every count, year and title comes from data/corpus-tree.json + data/tree/<code>.json,
 * built by tools/tree/build.mjs from papers.index.json (hand-coded tier only).
 *
 * Motion: the tree grows once, year by year, when it first scrolls into view. Under
 * prefers-reduced-motion it is drawn still and "▶ Let it grow" replays it on request.
 */
(function () {
  if (customElements.get('corpus-tree')) return;
  const NS = 'http://www.w3.org/2000/svg';
  const DATA_URL = 'data/corpus-tree.json';
  const SHARD = (c) => `data/tree/${encodeURIComponent(c)}.json`;
  const BOOK = 'https://syahmedu.github.io/syeds-research-book/';
  const RF = 'https://researchflow-syahmedus-projects.vercel.app/';
  const LAST_KEY = 'tree_root';
  const LEAF_CAP = 90;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const esc = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // leaf colour = the paper's year: autumn (older) → spring (newer)
  const LEAF = {
    light: ['#b8692f', '#cf9440', '#bfae46', '#86ad55', '#3f9a62', '#16785a'],
    dark:  ['#d98a4f', '#e6ad5e', '#d6c862', '#9fcb6c', '#5cbf83', '#35a57f'],
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function ramp(t, dark) {
    const st = dark ? LEAF.dark : LEAF.light, x = clamp(t, 0, 1) * (st.length - 1);
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
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

  // "you are here" matching — the suite's deterministic helper (lib/topic.ts), inlined.
  const STOP = new Set(('work works working study studies effect effects impact impacts role roles among between within ' +
    'organizational organisational organization organisation organizations organisations research using based relationship ' +
    'relationships influence influences outcome outcomes affect affects does what which their from into with this that these ' +
    'those across toward towards factors factor case context contexts evidence analysis approach perspective level levels ' +
    'employee employees firms firm people theory theories scale scales measure measures model models about under over').split(' '));
  const topicStems = (q) => [...new Set(q.toLowerCase().replace(/[-‐–]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 6)))];
  const topicScore = (stems, text) => { const t = ' ' + text.toLowerCase().replace(/[-‐–]/g, '').replace(/[^a-z0-9]+/g, ' '); return stems.reduce((n, st) => n + (t.includes(' ' + st) ? 1 : 0), 0); };

  // d3.curveBasis, hand-rolled (same as the old river) — smooth trunk outlines without overshoot
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

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  class CorpusTree extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true;
      this.innerHTML = `
        <div class="ct-controls">
          <label class="ct-topic"><span>Your topic</span><input type="search" list="ctList" placeholder="e.g. burnout" aria-label="Grow the tree for your topic" autocomplete="off"><em hidden></em></label>
          <datalist id="ctList"></datalist>
          <div class="ct-try" aria-label="Or try one of these"></div>
        </div>
        <div class="ct-body">
          <div class="ct-stage">
            <svg class="ct-svg" role="img" aria-labelledby="ctTitle ctDesc"><title id="ctTitle">A construct grown as a tree</title><desc id="ctDesc">Loading the hand-coded corpus…</desc></svg>
            <div class="ct-tip" role="status" aria-live="polite" hidden></div>
            <div class="ct-loading" hidden>growing…</div>
          </div>
          <aside class="ct-read" aria-live="polite"></aside>
        </div>
        <div class="ct-foot">
          <div class="ct-legend" aria-hidden="true">
            <span class="ct-lg"><svg viewBox="0 0 14 8" width="14" height="8"><path d="M1 4 Q7 -1.5 13 4 Q7 9.5 1 4Z" fill="currentColor"/></svg>one paper coded to both</span>
            <span class="ct-lg">older<i class="ct-ramp"></i>newer</span>
            <span class="ct-lg">a branch sprouts the year the two were first coded together</span>
            <span class="ct-lg"><i class="ct-seed-k"></i>never coded together here</span>
          </div>
          <button type="button" class="ct-grow">▶ Let it grow</button>
        </div>`;
      this.svg = this.querySelector('.ct-svg');
      this.tip = this.querySelector('.ct-tip');
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this.shards = new Map();
      this.querySelector('.ct-grow').addEventListener('click', () => this.grow(true));

      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && !this._grown && this.ready) { this._grown = true; if (!this.reduce.matches) this.grow(); }
      }), { threshold: 0.25 });
      io.observe(this);
      new MutationObserver(() => this.data && this.render()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      fetch(DATA_URL).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d) => {
        this.data = d;
        this.byCode = new Map(d.constructs.map((c) => [c.code, c]));
        this.prep();
        // one topic for the page: the tree's box and the Quick Start box mirror each other
        const mine = this.querySelector('.ct-topic input'), qs = document.getElementById('qs-input');
        let t;
        const apply = (v) => { clearTimeout(t); t = setTimeout(() => this.setTopic(v), 220); };
        mine.addEventListener('input', () => { if (qs) qs.value = mine.value; apply(mine.value); });
        qs?.addEventListener('input', () => { mine.value = qs.value; apply(qs.value); });
        let start = null; try { start = localStorage.getItem(LAST_KEY); } catch (_) {}
        if (qs?.value) { mine.value = qs.value; this.setTopic(qs.value); }
        else this.show(this.byCode.has(start) ? start : this.defaultCode);
        let w = this.stageW();
        new ResizeObserver(() => { const nw = this.stageW(); if (Math.abs(nw - w) > 8) { w = nw; clearTimeout(this._rt); this._rt = setTimeout(() => this.render(), 120); } }).observe(this);
      }).catch(() => { this.hidden = true; });  // no snapshot → no tree, never a fake one
    }

    stageW() { return this.querySelector('.ct-stage').clientWidth; }

    prep() {
      const d = this.data;
      // the workbook has a few identical names (e.g. two "Mediation and Moderation in Research"
      // constructs) — tell them apart by their workbook number
      const seen = new Map(); d.constructs.forEach((c) => { const k = shortName(c.name); seen.set(k, (seen.get(k) || 0) + 1); });
      d.constructs.forEach((c) => { c.short = shortName(c.name); if (seen.get(c.short) > 1) { const no = parseInt(c.code, 10); c.name += ` (#${no})`; c.short += ` #${no}`; } });
      this.rank = [...d.constructs].sort((a, b) => b.n - a.n);
      this.querySelector('#ctList').innerHTML = this.rank.map((c) => `<option value="${esc(c.short)}"></option>`).join('');
      // default: well-being — a topic most readers recognise, with a full crown — else the largest
      const wb = this.rank.find((c) => /^well-being\b/i.test(c.name));
      this.defaultCode = (wb || this.rank[0]).code;
      const pick = ['burnout', 'engagement', 'transformational', 'creativity', 'turnover', 'trust'].map((w) => this.rank.find((c) => new RegExp('^' + w, 'i').test(c.name))?.code);
      const tries = [this.defaultCode, ...pick.filter(Boolean), ...this.rank.map((c) => c.code)]
        .filter((c, i, a) => a.indexOf(c) === i).slice(0, 7);
      this.querySelector('.ct-try').innerHTML = '<span>Try</span>' + tries.map((c) => `<button type="button" data-code="${esc(c)}">${esc(clip(this.byCode.get(c).short, 24))}</button>`).join('');
      this.querySelector('.ct-try').addEventListener('click', (e) => { const b = e.target.closest('button[data-code]'); if (b) this.show(b.dataset.code, true); });
      document.querySelectorAll('[data-tree="pairs"]').forEach((e) => { e.textContent = fmt(d.pairs); });
      document.querySelectorAll('[data-tree="papers"]').forEach((e) => { e.textContent = fmt(d.coCoded); });
      document.querySelectorAll('[data-tree="constructs"]').forEach((e) => { e.textContent = fmt(d.constructs.length); });
    }

    setTopic(q) {
      const d = this.data; if (!d) return;
      const stems = topicStems(q), em = this.querySelector('.ct-topic em');
      if (!stems.length) { em.hidden = true; return; }
      const exact = d.constructs.find((c) => c.short.toLowerCase() === q.trim().toLowerCase());
      const sc = d.constructs.map((c) => (exact ? (c === exact ? 9 : 0) : topicScore(stems, c.name)));
      const best = Math.max(0, ...sc);
      const hits = best ? d.constructs.filter((_, i) => sc[i] === best).sort((a, b) => b.n - a.n) : [];
      em.hidden = !!hits.length;
      em.textContent = 'no construct is named this — showing the last tree';
      this.alsoHits = hits.slice(1, 5).map((c) => c.code);
      if (hits.length) this.show(hits[0].code, true);
    }

    async show(code, replay) {
      if (!this.byCode.has(code)) return;
      this.code = code;
      try { localStorage.setItem(LAST_KEY, code); } catch (_) {}
      this.querySelectorAll('.ct-try button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.code === code)));
      const ld = this.querySelector('.ct-loading');
      if (!this.shards.has(code)) {
        ld.hidden = false;
        try { const r = await fetch(SHARD(code)); this.shards.set(code, r.ok ? await r.json() : []); }
        catch (_) { this.shards.set(code, []); }
        ld.hidden = true;
        if (this.code !== code) return;   // a newer pick arrived while loading
      }
      this.ready = true;
      this.render();
      this.reading();
      if (replay && this._grown && !this.reduce.matches) this.grow();
    }

    // the drawn partners: the strongest links, ≥2 joint papers where possible
    branches(mobile) {
      const c = this.byCode.get(this.code), shard = new Map(this.shards.get(this.code) || []);
      const K = mobile ? 8 : 14;
      let ps = c.p.filter((p) => p[1] >= 2);
      if (ps.length < 6) ps = c.p;
      return ps.slice(0, K).map(([code, n, first]) => ({ code, n, first, papers: shard.get(code) || [], o: this.byCode.get(code) }));
    }

    // gap seeds: the largest constructs never coded on the same paper as this one
    seeds(k) {
      const c = this.byCode.get(this.code), linked = new Set(c.p.map((p) => p[0]));
      return this.rank.slice(0, 40).filter((o) => o.code !== c.code && !linked.has(o.code)).slice(0, k);
    }

    render() {
      const d = this.data, c = this.byCode.get(this.code); if (!c) return;
      const svg = this.svg, dark = document.documentElement.dataset.theme === 'dark';
      const W = Math.max(300, this.stageW()), mobile = W < 560;
      const H = mobile ? 470 : 560;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
      [...svg.children].forEach((ch) => { if (ch.tagName !== 'title' && ch.tagName !== 'desc') ch.remove(); });

      const brs = this.branches(mobile);
      const G = H - (mobile ? 58 : 66), TOP = mobile ? 70 : 78, cx = W / 2, PAD = 10;
      const Y1 = d.years[d.years.length - 1];
      const firsts = brs.map((b) => b.first).filter(Boolean);
      const onset = d.years.find((y, i) => c.y[i] > 0) || d.years[0];
      const Y0 = clamp(Math.floor(Math.min(onset, ...firsts) / 5) * 5, d.years[0], Y1 - 10);
      const yearY = (y) => G - 26 - ((clamp(y, Y0, Y1) - Y0) / (Y1 - Y0)) * (G - 26 - TOP);
      const bw = clamp(5 + Math.sqrt(c.n) * 0.75, 9, mobile ? 18 : 24);
      const hw = (y) => 2.4 + (bw - 2.4) * clamp((y - TOP) / (G - TOP), 0, 1);
      this.geo = { yearY, Y0, Y1, G, TOP, cx, hw, W, H };

      const defs = el('defs', {}, svg);
      const bark = el('linearGradient', { id: 'ctBark', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
      el('stop', { offset: 0, 'stop-color': dark ? '#5a4535' : '#6b4f3a' }, bark);
      el('stop', { offset: 0.55, 'stop-color': dark ? '#7d6250' : '#8a6a4f' }, bark);
      el('stop', { offset: 1, 'stop-color': dark ? '#4a382c' : '#5a412f' }, bark);
      const soil = el('linearGradient', { id: 'ctSoil', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: 0, 'stop-color': dark ? '#3a2f26' : '#d9c7a6', 'stop-opacity': dark ? 0.75 : 0.65 }, soil);
      el('stop', { offset: 1, 'stop-color': dark ? '#1c1712' : '#efe4cc', 'stop-opacity': 0 }, soil);

      // time guides: one faint line every five years, labelled on the left
      const grid = el('g', { class: 'ct-grid', 'aria-hidden': 'true' }, svg);
      for (let y = Math.ceil(Y0 / 5) * 5; y <= Y1; y += 5) {
        const yy = yearY(y);
        el('line', { x1: PAD + 30, x2: W - PAD, y1: yy, y2: yy }, grid);
        el('text', { x: PAD, y: yy + 3.5 }, grid).textContent = y;
      }

      // ground + roots
      el('rect', { x: 0, y: G, width: W, height: H - G, fill: 'url(#ctSoil)', class: 'ct-soil' }, svg);
      el('line', { x1: PAD, x2: W - PAD, y1: G, y2: G, class: 'ct-ground' }, svg);
      const roots = el('g', { class: 'ct-roots', 'aria-hidden': 'true' }, svg);
      [-1, 1].forEach((s) => [0.6, 1.25, 2.1].forEach((k, i) => {
        el('path', { d: `M${cx + s * bw * 0.5},${G - 2} C${cx + s * bw * (1 + k)},${G + 4 + i * 3} ${cx + s * bw * (1.6 + k * 1.6)},${G + 8 + i * 5} ${cx + s * bw * (2.2 + k * 2.2)},${G + 14 + i * 7}`, 'stroke-width': 2.4 - i * 0.6 }, roots);
      }));

      // trunk — a taper with a root flare; rings across it = papers per year
      const tg = el('g', { class: 'ct-trunk' }, svg);
      const top = yearY(Y1) - 14, side = (s) => { const pts = []; for (let y = G + 2; y >= top; y -= 6) { const f = Math.exp(-(G - y) / 16) * bw * 0.9; pts.push([cx + s * (hw(y) + f), y]); } pts.push([cx, top - 6]); return pts; };
      const trunkD = basis(side(-1), 'M') + basis(side(1).reverse(), 'L') + 'Z';
      el('path', { d: trunkD, fill: 'url(#ctBark)', class: 'ct-trunk-body' }, tg);
      const maxY = Math.max(1, ...c.y);
      const rings = el('g', { class: 'ct-rings' }, tg);
      d.years.forEach((y, i) => {
        if (y < Y0 || !c.y[i]) return;
        const yy = yearY(y), w = hw(yy) * (0.25 + 0.75 * c.y[i] / maxY);
        el('line', { x1: cx - w, x2: cx + w, y1: yy, y2: yy, style: `--d:${this.delay(y)}` }, rings);
      });
      // a wide invisible hit strip so the trunk is easy to read
      el('rect', { x: cx - bw - 6, y: top, width: (bw + 6) * 2, height: G - top, class: 'ct-trunk-hit', fill: 'transparent' }, tg);

      // branches: alternate sides by strength so the crown stays balanced
      const maxN = Math.max(1, ...brs.map((b) => b.n));
      const lead = mobile ? 44 : 178, gutter = mobile ? 0 : 34;   // the left side also keeps the year labels clear
      // few joint papers → bigger leaves, so a small tree still reads
      const ls = (mobile ? 0.85 : 1) * (maxN <= 6 ? 1.75 : maxN <= 14 ? 1.45 : maxN <= 30 ? 1.2 : 1);
      const Lmin = mobile ? 28 : 46, LmaxR = Math.max(Lmin + 20, W / 2 - bw - lead), LmaxL = Math.max(Lmin + 20, LmaxR - gutter);
      const sides = [[], []];
      brs.forEach((b, i) => {
        const s = i % 2 ? -1 : 1, f = Math.sqrt(b.n / maxN);
        const nl = Math.min(b.n, LEAF_CAP);
        b.s = s; b.oy = yearY(b.first || Y0); b.ox = cx + s * hw(b.oy) * 0.7;
        b.r = (4.4 * Math.sqrt(nl) + 6) * ls;
        b.tx = cx + s * (bw + Lmin + ((s > 0 ? LmaxR : LmaxL) - Lmin) * f);
        b.ty = b.oy - (mobile ? 22 : 30) - 22 * f;
        b.w = 1.4 + (mobile ? 4 : 6) * f;
        sides[i % 2].push(b);
      });
      // keep clusters from colliding: order each side by where its branch leaves the trunk (so
      // limbs never cross), sweep top→down, then fit inside the crown
      for (const list of sides) {
        list.sort((a, b) => a.oy - b.oy || a.ty - b.ty);
        for (let i = 1; i < list.length; i++) { const p = list[i - 1], q = list[i]; const gap = p.r + q.r + (mobile ? 18 : 5); if (q.ty - p.ty < gap) q.ty = p.ty + gap; }
        const lo = G - 34, hi = TOP - 8;
        const last = list[list.length - 1];
        if (last && last.ty + last.r > lo) { const sh = last.ty + last.r - lo; list.forEach((b) => { b.ty -= sh; }); }
        const first = list[0];
        if (first && first.ty - first.r < hi) {
          // too tall: squeeze the spacing proportionally between the top and the ground
          const a = hi + first.r, z = lo - last.r, n = list.length;
          list.forEach((b, i) => { b.ty = n === 1 ? (a + z) / 2 : a + ((z - a) * i) / (n - 1); });
        }
      }

      const crown = el('g', { class: 'ct-crown' }, svg);
      this.brEls = [];
      brs.forEach((b, bi) => {
        const g = el('g', { class: 'ct-branch', 'data-i': bi }, crown);
        const dx = b.tx - b.ox, dy = b.ty - b.oy;
        const dPath = `M${b.ox.toFixed(1)},${b.oy.toFixed(1)} C${(b.ox + dx * 0.42).toFixed(1)},${(b.oy + dy * 0.05).toFixed(1)} ${(b.tx - dx * 0.38).toFixed(1)},${(b.ty - dy * 0.2 + 6).toFixed(1)} ${b.tx.toFixed(1)},${b.ty.toFixed(1)}`;
        el('path', { d: dPath, class: 'ct-limb', 'stroke-width': b.w.toFixed(1), style: `--d:${this.delay(b.first)}`, pathLength: 1 }, g);
        // leaves: one per joint paper, golden-angle spiral, oldest at the heart → newest at the edge
        const leaves = el('g', { class: 'ct-leaves' }, g);
        el('circle', { cx: b.tx, cy: b.ty, r: b.r * 0.92, class: 'ct-canopy' }, leaves);
        const ps = b.papers.slice(-LEAF_CAP);
        const step = (b.r - 6) / Math.sqrt(Math.max(1, ps.length));
        ps.forEach((p, i) => {
          const a = i * 2.39996 + bi, rad = step * Math.sqrt(i + 0.15);
          const x = b.tx + Math.cos(a) * rad, y = b.ty + Math.sin(a) * rad * 0.86;
          const yr = p[0] || b.first || Y1;
          const sz = ls;
          el('path', {
            d: 'M-6.5,0 Q-1,-4.4 6.5,0 Q-1,4.4 -6.5,0Z',
            transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${((i * 137 + bi * 41) % 360)}) scale(${sz})`,
            fill: ramp((yr - Y0) / Math.max(1, Y1 - Y0), dark), class: 'ct-leaf',
            'data-k': i, style: `--d:${this.delay(yr)}`,
          }, leaves);
        });
        // a generous invisible hit disc over the cluster
        el('circle', { cx: b.tx, cy: b.ty, r: b.r + 4, class: 'ct-hit', fill: 'transparent' }, g);
        if (mobile) {
          // phones: the name sits above its cluster, kept inside the frame; counts live in the tip + list
          const nm = clip(b.o.short, 16), tw = nm.length * 5.8;
          el('text', { x: clamp(b.tx, PAD + tw / 2, W - PAD - tw / 2), y: b.ty - b.r - 4, 'text-anchor': 'middle', class: 'ct-label', style: `--d:${this.delay(b.first)}` }, g).textContent = nm;
          this.brEls.push(g);
          return;
        }
        const lx = b.tx + b.s * (b.r + 6);
        const name = clip(b.o.short, 24);
        const t = el('text', { x: lx, y: b.ty - 1, 'text-anchor': b.s > 0 ? 'start' : 'end', class: 'ct-label', style: `--d:${this.delay(b.first)}` }, g);
        t.textContent = name;
        const t2 = el('text', { x: lx, y: b.ty + 12, 'text-anchor': b.s > 0 ? 'start' : 'end', class: 'ct-label-n', style: `--d:${this.delay(b.first)}` }, g);
        t2.textContent = `${fmt(b.n)} paper${b.n === 1 ? '' : 's'} · since ${b.first || '—'}`;
        this.brEls.push(g);
      });
      this.brs = brs;

      // crown label: the construct itself
      const head = el('g', { class: 'ct-head' }, svg);
      el('text', { x: cx, y: mobile ? 26 : 30, 'text-anchor': 'middle', class: 'ct-name' }, head).textContent = clip(c.short, mobile ? 30 : 60);
      el('text', { x: cx, y: mobile ? 44 : 50, 'text-anchor': 'middle', class: 'ct-sub' }, head).textContent =
        `${fmt(c.n)} hand-coded papers · coded with ${fmt(c.p.length)} other constructs`;

      // seeds on the ground: large constructs never coded with this one
      const seeds = this.seeds(mobile ? 3 : 4);
      this.seedList = seeds;
      if (seeds.length) {
        const sg = el('g', { class: 'ct-seeds' }, svg);
        const slots = seeds.map((_, i) => { const half = Math.ceil(seeds.length / 2); const left = i < half; const k = left ? i : i - half; const n = left ? half : seeds.length - half; const a = left ? PAD + 40 : cx + bw * 3 + 20, z = left ? cx - bw * 3 - 20 : W - PAD - 40; return n === 1 ? (a + z) / 2 : a + ((z - a) * (k + 0.5)) / n; });
        seeds.forEach((o, i) => {
          const x = slots[i], g = el('a', { href: this.rfLink(c, o), target: '_blank', rel: 'noopener', class: 'ct-seed', 'data-code': o.code }, sg);
          el('ellipse', { cx: x, cy: G + 9, rx: 5, ry: 3.4, transform: `rotate(-24 ${x} ${G + 9})` }, g);
          el('path', { d: `M${x},${G + 6} q-1,-7 3,-11`, class: 'ct-sprout' }, g);
          el('text', { x, y: G + 28, 'text-anchor': 'middle', class: 'ct-seed-l' }, g).textContent = clip(o.short, mobile ? 12 : 18);
          el('title', {}, g).textContent = `${o.name} (${fmt(o.n)} papers) is never coded on the same paper as ${c.name} in this corpus — explore the pairing in ResearchFlow`;
        });
        el('text', { x: W - PAD, y: H - 8, 'text-anchor': 'end', class: 'ct-note' }, sg).textContent = mobile ? 'seeds · never coded together here' : 'seeds · large constructs never coded together with it here — a gap hint, not a claim';
      }

      const strongest = brs[0];
      this.querySelector('#ctDesc').textContent = `${c.name}: ${fmt(c.n)} hand-coded papers, coded together with ${c.p.length} other constructs.` +
        (strongest ? ` Strongest link: ${strongest.o.name}, ${strongest.n} papers since ${strongest.first}.` : '');
      this.bindPointer();
      if (!this._growing) this.classList.add('is-grown');
    }

    rfLink(c, o) {
      return `${RF}?idea=${encodeURIComponent(`How does ${c.short.toLowerCase()} relate to ${o.short.toLowerCase()}?`)}`;
    }

    // growth delay for an element that appears in year y (seconds into the grow animation)
    delay(y) {
      const g = this.geo; if (!g || !y) return '0s';
      return `${(0.5 + 2.6 * clamp((y - g.Y0) / Math.max(1, g.Y1 - g.Y0), 0, 1)).toFixed(2)}s`;
    }

    grow(force) {
      if (!force && this.reduce.matches) return;
      this.classList.remove('is-grown', 'is-growing');
      void this.offsetWidth;          // restart the CSS animations
      this.classList.add('is-growing');
      this._growing = true;
      clearTimeout(this._gt);
      this._gt = setTimeout(() => { this._growing = false; this.classList.remove('is-growing'); this.classList.add('is-grown'); }, 4200);
    }

    reading() {
      const c = this.byCode.get(this.code), brs = this.brs || [];
      const aside = this.querySelector('.ct-read');
      const firstYr = this.data.years.find((y, i) => c.y[i] > 0);
      const s = brs[0];
      const newest = [...c.p].filter((p) => p[1] >= 2 && p[2]).sort((a, b) => b[2] - a[2] || b[1] - a[1])[0];
      const oldest = [...c.p].filter((p) => p[2]).sort((a, b) => a[2] - b[2] || b[1] - a[1])[0];
      const nm = (code) => esc(this.byCode.get(code).short);
      const also = (this.alsoHits || []).filter((k) => k !== c.code);
      const row = (b) => `<li><button type="button" data-root="${esc(b.code)}" title="Grow the tree from ${esc(b.o.name)}">${esc(clip(b.o.short, 34))}</button><a href="${BOOK}?construct=${encodeURIComponent(c.code)}&with=${encodeURIComponent(b.code)}" target="_blank" rel="noopener" title="Open the ${b.n} papers coded to both">${fmt(b.n)} ↗</a></li>`;
      aside.innerHTML = `
        <div class="ct-k">Reading the tree</div>
        <h3>${esc(c.short)}</h3>
        <p class="ct-meta">${fmt(c.n)} hand-coded papers${firstYr ? ` since ${firstYr}` : ''} · coded alongside ${fmt(c.p.length)} of the other ${fmt(this.data.constructs.length - 1)} constructs</p>
        <ul class="ct-facts">
          ${s ? `<li><b>Most studied with</b> ${nm(s.code)} — ${fmt(s.n)} papers carry both, first in ${s.first}.</li>` : ''}
          ${oldest && (!s || oldest[0] !== s.code) ? `<li><b>Oldest link</b> ${nm(oldest[0])}, first coded together in ${oldest[2]}.</li>` : ''}
          ${newest && (!s || newest[0] !== s.code) ? `<li><b>Newest link</b> ${nm(newest[0])}, first coded together in ${newest[2]} (${newest[1]} papers so far).</li>` : ''}
        </ul>
        <div class="ct-k ct-k2">Strongest branches · <span>click a name to grow its tree</span></div>
        <ol class="ct-list">${brs.slice(0, 6).map(row).join('')}</ol>
        ${this.seedList?.length ? `<div class="ct-k ct-k2">Seeds — never coded together here</div>
        <ul class="ct-seedlist">${this.seedList.map((o) => `<li><a href="${this.rfLink(c, o)}" target="_blank" rel="noopener">${esc(clip(o.short, 34))} <span>· ${fmt(o.n)} papers · plan it in ResearchFlow ↗</span></a></li>`).join('')}</ul>` : ''}
        ${also.length ? `<p class="ct-also">Also matching your topic: ${also.map((k) => `<button type="button" data-root="${esc(k)}">${nm(k)}</button>`).join(' ')}</p>` : ''}
        <a class="ct-open" href="${BOOK}?construct=${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Open all ${fmt(c.n)} papers in the Research Book ↗</a>
        <p class="ct-honest">Hand-coded tier only. A branch means the same paper was hand-coded to both constructs; a missing branch means missing from this corpus — not from the literature.</p>`;
      aside.onclick = (e) => { const b = e.target.closest('button[data-root]'); if (b) { this.alsoHits = []; this.show(b.dataset.root, true); } };
    }

    leafAt(target) {
      const leaf = target.closest?.('.ct-leaf'); if (!leaf) return null;
      const bi = +leaf.closest('.ct-branch').dataset.i, b = this.brs[bi];
      const ps = b.papers.slice(-LEAF_CAP);
      return { b, bi, p: ps[+leaf.dataset.k], leaf };
    }

    bindPointer() {
      if (this._bound) return; this._bound = true;
      const svg = this.svg;
      const pos = (e) => { const r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
      const place = (px, py, r) => {
        const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
        let tx = px + 16, ty = py - th - 14;
        if (tx + tw > r.width - 4) tx = px - tw - 16;
        if (ty < 4) ty = py + 18;
        this.tip.style.transform = `translate(${Math.max(4, tx)}px,${clamp(ty, 4, r.height - th - 4)}px)`;
      };
      const focus = (bi) => {
        this.brEls.forEach((g, k) => g.classList.toggle('is-on', k === bi));
        svg.classList.toggle('is-reading', bi >= 0);
      };
      const clear = () => { focus(-1); this.tip.hidden = true; this.svg.querySelectorAll('.ct-leaf.is-on').forEach((l) => l.classList.remove('is-on')); this._last = null; };
      const c = () => this.byCode.get(this.code);
      const move = (e) => {
        const [px, py, r] = pos(e);
        const lf = this.leafAt(e.target);
        const br = e.target.closest?.('.ct-branch');
        this.svg.querySelectorAll('.ct-leaf.is-on').forEach((l) => l.classList.remove('is-on'));
        let html = '', key = null;
        if (lf && lf.p) {
          lf.leaf.classList.add('is-on'); focus(lf.bi); key = 'l' + lf.bi + ':' + lf.leaf.dataset.k;
          const [yr, title, , journal] = lf.p;
          html = `<div class="ct-tip-y">${yr || 'undated'} · coded to both</div><div class="ct-tip-t">${esc(title)}</div>` +
            (journal ? `<div class="ct-tip-j">${esc(journal)}</div>` : '') +
            `<div class="ct-tip-hint">${e.pointerType === 'touch' ? 'Tap again' : 'Click'} to open the paper ↗</div>`;
        } else if (br) {
          const bi = +br.dataset.i, b = this.brs[bi]; focus(bi); key = 'b' + bi;
          const late = b.papers.filter((p) => p[0] >= 2020).length;
          html = `<div class="ct-tip-y">${esc(c().short)} + ${esc(b.o.short)}</div>` +
            `<div class="ct-tip-n"><b>${fmt(b.n)}</b> paper${b.n === 1 ? '' : 's'} coded to both · first together ${b.first || '—'}${late ? ` · ${late} since 2020` : ''}</div>` +
            `<div class="ct-tip-hint">${e.pointerType === 'touch' ? 'Tap again' : 'Click'} to open them in the Research Book ↗</div>`;
        } else if (e.target.closest?.('.ct-trunk')) {
          focus(-1);
          const g = this.geo, yr = Math.round(g.Y0 + ((g.G - 26 - py) / (g.G - 26 - g.TOP)) * (g.Y1 - g.Y0));
          const i = this.data.years.indexOf(clamp(yr, g.Y0, g.Y1)), n = i >= 0 ? c().y[i] : 0;
          key = 't' + yr;
          html = `<div class="ct-tip-y">${esc(c().short)} · ${clamp(yr, g.Y0, g.Y1)}${(this.data.partialYears || []).includes(yr) ? ' <span>· partial year</span>' : ''}</div>` +
            `<div class="ct-tip-n"><b>${fmt(n)}</b> hand-coded paper${n === 1 ? '' : 's'} that year · ring width = that count</div>`;
        } else { clear(); return; }
        this.tip.innerHTML = html; this.tip.hidden = false; place(px, py, r);
        this._prev = this._last; this._last = key;
      };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') clear(); });
      svg.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { const prev = this._last; move(e); this._tapArmed = prev && prev === this._last; } });
      svg.addEventListener('click', (e) => {
        if (e.target.closest('.ct-seed')) return;           // seeds are real links
        if (e.pointerType === 'touch' && !this._tapArmed) return;   // first tap reads, second opens
        const lf = this.leafAt(e.target);
        if (lf && lf.p && lf.p[2]) { window.open(`https://doi.org/${lf.p[2]}`, '_blank', 'noopener'); return; }
        const br = e.target.closest('.ct-branch');
        if (br) { const b = this.brs[+br.dataset.i]; window.open(`${BOOK}?construct=${encodeURIComponent(this.code)}&with=${encodeURIComponent(b.code)}`, '_blank', 'noopener'); }
      });
      document.addEventListener('pointerdown', (e) => { if (!this.contains(e.target)) clear(); });
    }
  }
  customElements.define('corpus-tree', CorpusTree);
})();
