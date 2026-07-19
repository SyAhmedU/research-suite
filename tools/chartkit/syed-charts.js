/*! syed-charts v1 — canonical source: research-suite/tools/chartkit/syed-charts.js
 * Dependency-free SVG chart helpers for the Syed fleet (marker: SYED-CHARTS).
 * Copies are stamped per project like juice/ambient — edit THIS file, then re-copy;
 * never hand-edit a copy. React/TS projects implement native components with the
 * same tokens instead of importing this.
 *
 * Theme: inherits text color (works light+dark); overridable via CSS vars
 *   --sch-c1..--sch-c8 (series), --sch-grid, --sch-muted.
 * No animation (reduced-motion safe by default); no external fonts; print-safe.
 * No-fab: helpers render exactly the numbers given — formatting only, never inference.
 */
(function (root) {
  'use strict';

  var PALETTE = ['#F14575', '#9270F4', '#FF9656', '#2DD4BF', '#EAB308', '#60A5FA', '#34D399', '#FB7185'];

  function seriesColor(i) {
    return 'var(--sch-c' + ((i % PALETTE.length) + 1) + ', ' + PALETTE[i % PALETTE.length] + ')';
  }
  var GRID = 'var(--sch-grid, color-mix(in srgb, currentColor 14%, transparent))';
  var MUTED = 'var(--sch-muted, color-mix(in srgb, currentColor 55%, transparent))';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmt(v, d) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    if (Math.abs(v) >= 10000) return Math.round(v).toLocaleString('en-IN');
    var dec = d != null ? d : (Math.abs(v) < 1 && v !== 0 ? 2 : 1);
    var r = +v.toFixed(dec);
    return String(r);
  }

  function extent(vals) {
    var mn = Infinity, mx = -Infinity;
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i];
      if (typeof v === 'number' && isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; }
    }
    if (mn === Infinity) { mn = 0; mx = 1; }
    if (mn === mx) { mn -= 1; mx += 1; }
    return [mn, mx];
  }

  function niceTicks(min, max, count) {
    count = count || 4;
    var span = max - min;
    if (!(span > 0)) return [min];
    var step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = (span / count) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var ticks = [];
    for (var t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) {
      ticks.push(Math.abs(t) < step * 1e-9 ? 0 : +t.toPrecision(12));
    }
    return ticks;
  }

  function lin(d0, d1, r0, r1) {
    var span = (d1 - d0) || 1;
    return function (v) { return r0 + ((v - d0) / span) * (r1 - r0); };
  }

  function open(w, h, label) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" role="img" aria-label="' + esc(label) + '" style="width:100%;height:auto;display:block;font-family:inherit;overflow:visible">';
  }

  function axisText(x, y, txt, anchor, size, opts) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') +
      '" font-size="' + (size || 10) + '" fill="' + ((opts && opts.strong) ? 'currentColor' : MUTED) + '"' +
      ((opts && opts.rotate) ? ' transform="rotate(' + opts.rotate + ' ' + x + ' ' + y + ')"' : '') + '>' + esc(txt) + '</text>';
  }

  // ---- sparkline(values, {w,h,color,band:[{lo,hi}...]}) --------------------
  function sparkline(values, o) {
    o = o || {};
    var w = o.w || 160, h = o.h || 40, pad = 3;
    var vals = (values || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (vals.length < 2) return '<span style="color:' + MUTED + ';font-size:11px">not enough data</span>';
    var e = extent(vals), x = lin(0, values.length - 1, pad, w - pad), y = lin(e[0], e[1], h - pad, pad);
    var col = o.color || seriesColor(0);
    var pts = values.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
    var s = open(w, h, o.label || 'trend sparkline');
    s += '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>';
    var lastX = x(values.length - 1), lastY = y(values[values.length - 1]);
    s += '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="2.6" fill="' + col + '"/>';
    return s + '</svg>';
  }

  // ---- line({series:[{name,points:[{x,y,lo,hi}]}], ...}) -------------------
  function line(cfg) {
    cfg = cfg || {};
    var w = cfg.w || 560, h = cfg.h || 260, m = { t: 14, r: 12, b: 34, l: 44 };
    var series = cfg.series || [];
    var allX = [], allY = [];
    series.forEach(function (s) {
      (s.points || []).forEach(function (p) {
        allX.push(p.x); allY.push(p.y);
        if (p.lo != null) allY.push(p.lo);
        if (p.hi != null) allY.push(p.hi);
      });
    });
    if (!allX.length) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var ex = cfg.xDomain || extent(allX), ey = cfg.yDomain || extent(allY);
    if (cfg.yZero && ey[0] > 0) ey = [0, ey[1]];
    var x = lin(ex[0], ex[1], m.l, w - m.r), y = lin(ey[0], ey[1], h - m.b, m.t);
    var s = open(w, h, cfg.label || 'line chart');
    niceTicks(ey[0], ey[1], 4).forEach(function (t) {
      s += '<line x1="' + m.l + '" y1="' + y(t).toFixed(1) + '" x2="' + (w - m.r) + '" y2="' + y(t).toFixed(1) + '" stroke="' + GRID + '"/>';
      s += axisText(m.l - 6, y(t) + 3, (cfg.yFmt || fmt)(t), 'end');
    });
    niceTicks(ex[0], ex[1], Math.min(6, allX.length)).forEach(function (t) {
      s += axisText(x(t), h - m.b + 16, (cfg.xFmt || fmt)(t, 0), 'middle');
    });
    series.forEach(function (ser, i) {
      var col = ser.color || seriesColor(i);
      var pts = (ser.points || []).slice().sort(function (a, b) { return a.x - b.x; });
      var hasBand = pts.some(function (p) { return p.lo != null && p.hi != null; });
      if (hasBand) {
        var top = pts.map(function (p) { return x(p.x).toFixed(1) + ',' + y(p.hi != null ? p.hi : p.y).toFixed(1); });
        var bot = pts.slice().reverse().map(function (p) { return x(p.x).toFixed(1) + ',' + y(p.lo != null ? p.lo : p.y).toFixed(1); });
        s += '<polygon points="' + top.concat(bot).join(' ') + '" fill="' + col + '" opacity="0.13"/>';
      }
      s += '<polyline points="' + pts.map(function (p) { return x(p.x).toFixed(1) + ',' + y(p.y).toFixed(1); }).join(' ') +
        '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round"/>';
      pts.forEach(function (p) {
        s += '<circle cx="' + x(p.x).toFixed(1) + '" cy="' + y(p.y).toFixed(1) + '" r="2.4" fill="' + col + '"><title>' +
          esc((ser.name ? ser.name + ' · ' : '') + (cfg.xFmt || fmt)(p.x, 0) + ': ' + (cfg.yFmt || fmt)(p.y)) + '</title></circle>';
      });
    });
    if (cfg.markers) cfg.markers.forEach(function (mk) {
      var mx = x(mk.x);
      s += '<line x1="' + mx.toFixed(1) + '" y1="' + m.t + '" x2="' + mx.toFixed(1) + '" y2="' + (h - m.b) + '" stroke="' + (mk.color || MUTED) + '" stroke-dasharray="3 3"/>';
      if (mk.label) s += axisText(mx, m.t - 3, mk.label, 'middle', 9);
    });
    return s + '</svg>';
  }

  // ---- bars(items:[{label,value,color,title}], opts) -----------------------
  function bars(items, o) {
    o = o || {};
    items = items || [];
    if (!items.length) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var w = o.w || 560, h = o.h || 240, m = { t: 14, r: o.cumulativeLine ? 34 : 10, b: 46, l: 40 };
    var vmax = o.yMax != null ? o.yMax : Math.max.apply(null, items.map(function (d) { return d.value; }).concat([0]));
    if (!(vmax > 0)) vmax = 1;
    var y = lin(0, vmax, h - m.b, m.t);
    var iw = (w - m.l - m.r) / items.length, bw = Math.min(iw * 0.68, 46);
    var s = open(w, h, o.label || 'bar chart');
    niceTicks(0, vmax, 4).forEach(function (t) {
      s += '<line x1="' + m.l + '" y1="' + y(t).toFixed(1) + '" x2="' + (w - m.r) + '" y2="' + y(t).toFixed(1) + '" stroke="' + GRID + '"/>';
      s += axisText(m.l - 6, y(t) + 3, (o.yFmt || fmt)(t), 'end');
    });
    var total = items.reduce(function (a, d) { return a + d.value; }, 0), run = 0, cum = [];
    items.forEach(function (d, i) {
      var cx = m.l + iw * i + iw / 2;
      s += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y(d.value).toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(0, (h - m.b) - y(d.value)).toFixed(1) + '" rx="3" fill="' + (d.color || o.color || seriesColor(0)) +
        '" opacity="0.92"><title>' + esc((d.title || d.label) + ': ' + (o.yFmt || fmt)(d.value)) + '</title></rect>';
      var lab = String(d.label == null ? '' : d.label);
      if (lab) s += axisText(cx, h - m.b + 14, lab.length > 9 && items.length > 7 ? lab.slice(0, 8) + '…' : lab, 'middle', 9.5, items.length > 9 ? { rotate: -28 } : null);
      run += d.value; cum.push({ cx: cx, pct: total > 0 ? run / total : 0 });
    });
    if (o.cumulativeLine && total > 0) {
      var yp = lin(0, 1, h - m.b, m.t);
      s += '<polyline points="' + cum.map(function (p) { return p.cx.toFixed(1) + ',' + yp(p.pct).toFixed(1); }).join(' ') +
        '" fill="none" stroke="' + seriesColor(1) + '" stroke-width="1.8" stroke-dasharray="4 3"/>';
      cum.forEach(function (p) {
        s += '<circle cx="' + p.cx.toFixed(1) + '" cy="' + yp(p.pct).toFixed(1) + '" r="2.2" fill="' + seriesColor(1) + '"><title>' + esc('cumulative ' + Math.round(p.pct * 100) + '%') + '</title></circle>';
      });
      s += axisText(w - m.r + 4, yp(1) + 3, '100%', 'start', 9);
    }
    if (o.marker != null) {
      // marker is a value on the x-scale expressed as item index fraction — used by histogram()
      var mx2 = m.l + (w - m.l - m.r) * o.marker;
      s += '<line x1="' + mx2.toFixed(1) + '" y1="' + (m.t - 2) + '" x2="' + mx2.toFixed(1) + '" y2="' + (h - m.b) + '" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"/>';
      if (o.markerLabel) s += axisText(mx2, m.t - 5, o.markerLabel, 'middle', 10, { strong: true });
    }
    return s + '</svg>';
  }

  // ---- hbars(items:[{label,value,color,note}], opts) -----------------------
  function hbars(items, o) {
    o = o || {};
    items = items || [];
    if (!items.length) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var w = o.w || 560, rowH = o.rowH || 26, labW = o.labW || 150, m = { t: 6, r: 54, b: 6 };
    var h = m.t + m.b + rowH * items.length;
    var vmax = o.max != null ? o.max : Math.max.apply(null, items.map(function (d) { return d.value; }).concat([0]));
    if (!(vmax > 0)) vmax = 1;
    var x = lin(0, vmax, labW, w - m.r);
    var s = open(w, h, o.label || 'horizontal bar chart');
    items.forEach(function (d, i) {
      var cy = m.t + rowH * i + rowH / 2;
      var lab = String(d.label == null ? '' : d.label);
      s += axisText(labW - 8, cy + 3.5, lab.length > 22 ? lab.slice(0, 21) + '…' : lab, 'end', 10.5, { strong: true });
      s += '<rect x="' + labW + '" y="' + (cy - rowH * 0.3).toFixed(1) + '" width="' + Math.max(0, x(d.value) - labW).toFixed(1) +
        '" height="' + (rowH * 0.6).toFixed(1) + '" rx="3" fill="' + (d.color || o.color || seriesColor(0)) + '" opacity="0.92"><title>' +
        esc(lab + ': ' + (o.vFmt || fmt)(d.value) + (d.note ? ' — ' + d.note : '')) + '</title></rect>';
      s += axisText(x(d.value) + 6, cy + 3.5, (o.vFmt || fmt)(d.value), 'start', 10);
    });
    return s + '</svg>';
  }

  // ---- histogram(values, {bins, marker, markerLabel}) ----------------------
  function histogram(values, o) {
    o = o || {};
    var vals = (values || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (vals.length < 2) return '<span style="color:' + MUTED + ';font-size:12px">not enough data yet</span>';
    var e = o.domain || extent(vals);
    var nb = o.bins || Math.max(6, Math.min(16, Math.ceil(Math.sqrt(vals.length))));
    var step = (e[1] - e[0]) / nb || 1;
    var counts = new Array(nb).fill(0);
    vals.forEach(function (v) {
      var b = Math.min(nb - 1, Math.max(0, Math.floor((v - e[0]) / step)));
      counts[b]++;
    });
    var items = counts.map(function (c, i) {
      var lo = e[0] + step * i;
      return { label: (i % Math.ceil(nb / 6) === 0) ? fmt(lo, step < 1 ? 1 : 0) : '', value: c, title: fmt(lo) + '–' + fmt(lo + step) };
    });
    var opts = { w: o.w, h: o.h, color: o.color, label: o.label || 'distribution histogram', yFmt: function (v) { return fmt(v, 0); } };
    if (o.marker != null) {
      opts.marker = Math.min(1, Math.max(0, (o.marker - e[0]) / ((e[1] - e[0]) || 1)));
      opts.markerLabel = o.markerLabel;
    }
    return bars(items, opts);
  }

  // ---- scatter(points:[{x,y,r,label,color}], opts) -------------------------
  function scatter(points, o) {
    o = o || {};
    points = (points || []).filter(function (p) { return isFinite(p.x) && isFinite(p.y); });
    if (!points.length) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var w = o.w || 560, h = o.h || 320, m = { t: 18, r: 14, b: 40, l: 48 };
    var ex = o.xDomain || extent(points.map(function (p) { return p.x; }));
    var ey = o.yDomain || extent(points.map(function (p) { return p.y; }));
    var padX = (ex[1] - ex[0]) * 0.06, padY = (ey[1] - ey[0]) * 0.08;
    if (!o.xDomain) ex = [ex[0] - padX, ex[1] + padX];
    if (!o.yDomain) ey = [ey[0] - padY, ey[1] + padY];
    var x = lin(ex[0], ex[1], m.l, w - m.r), y = lin(ey[0], ey[1], h - m.b, m.t);
    var s = open(w, h, o.label || 'scatter plot');
    niceTicks(ey[0], ey[1], 4).forEach(function (t) {
      s += '<line x1="' + m.l + '" y1="' + y(t).toFixed(1) + '" x2="' + (w - m.r) + '" y2="' + y(t).toFixed(1) + '" stroke="' + GRID + '"/>';
      s += axisText(m.l - 6, y(t) + 3, (o.yFmt || fmt)(t), 'end');
    });
    niceTicks(ex[0], ex[1], 5).forEach(function (t) {
      s += axisText(x(t), h - m.b + 16, (o.xFmt || fmt)(t), 'middle');
    });
    if (o.xLine != null) s += '<line x1="' + x(o.xLine).toFixed(1) + '" y1="' + m.t + '" x2="' + x(o.xLine).toFixed(1) + '" y2="' + (h - m.b) + '" stroke="' + MUTED + '" stroke-dasharray="4 3"/>';
    if (o.yLine != null) s += '<line x1="' + m.l + '" y1="' + y(o.yLine).toFixed(1) + '" x2="' + (w - m.r) + '" y2="' + y(o.yLine).toFixed(1) + '" stroke="' + MUTED + '" stroke-dasharray="4 3"/>';
    if (o.quadLabels && o.xLine != null && o.yLine != null) {
      var qx = [ (m.l + x(o.xLine)) / 2, (x(o.xLine) + (w - m.r)) / 2 ];
      var qy = [ m.t + 11, h - m.b - 6 ];
      [[qx[0], qy[0], o.quadLabels[0]], [qx[1], qy[0], o.quadLabels[1]], [qx[0], qy[1], o.quadLabels[2]], [qx[1], qy[1], o.quadLabels[3]]]
        .forEach(function (q) { if (q[2]) s += axisText(q[0], q[1], q[2], 'middle', 9.5); });
    }
    points.forEach(function (p, i) {
      var r = p.r || o.r || 5;
      s += '<circle cx="' + x(p.x).toFixed(1) + '" cy="' + y(p.y).toFixed(1) + '" r="' + r + '" fill="' + (p.color || seriesColor(0)) +
        '" opacity="0.82" stroke="rgba(0,0,0,.15)"><title>' + esc((p.label || 'point ' + (i + 1)) + ' (' + (o.xFmt || fmt)(p.x) + ', ' + (o.yFmt || fmt)(p.y) + ')') + '</title></circle>';
      if (o.labelPoints && p.label) s += axisText(x(p.x), y(p.y) - (r + 4), p.label, 'middle', 9);
    });
    if (o.xLabel) s += axisText((m.l + w - m.r) / 2, h - 6, o.xLabel, 'middle', 10.5, { strong: true });
    if (o.yLabel) s += axisText(12, (m.t + h - m.b) / 2, o.yLabel, 'middle', 10.5, { strong: true, rotate: -90 });
    return s + '</svg>';
  }

  // ---- heatmap({rows, cols, value(ri,ci), fmtCell, colorIndex}) ------------
  function heatmap(cfg) {
    cfg = cfg || {};
    var rows = cfg.rows || [], cols = cfg.cols || [];
    if (!rows.length || !cols.length) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var labW = cfg.labW || 130, cellH = cfg.cellH || 24, topH = 60;
    var w = cfg.w || Math.max(360, labW + cols.length * 34 + 8);
    var cellW = (w - labW - 8) / cols.length;
    var h = topH + rows.length * cellH + 6;
    var vmax = -Infinity, vmin = Infinity, hasVal = false;
    for (var ri = 0; ri < rows.length; ri++) for (var ci = 0; ci < cols.length; ci++) {
      var v = cfg.value(ri, ci);
      if (typeof v === 'number' && isFinite(v)) { hasVal = true; if (v > vmax) vmax = v; if (v < vmin) vmin = v; }
    }
    if (!hasVal) { vmin = 0; vmax = 1; }
    if (cfg.min != null) vmin = cfg.min;
    if (cfg.max != null) vmax = cfg.max;
    var span = (vmax - vmin) || 1;
    var base = cfg.color || PALETTE[1];
    var s = open(w, h, cfg.label || 'heatmap');
    cols.forEach(function (c, ci) {
      var cx = labW + cellW * ci + cellW / 2;
      var lab = String(c);
      s += axisText(cx, topH - 8, lab.length > 10 ? lab.slice(0, 9) + '…' : lab, 'start', 9.5, { rotate: -38 });
    });
    rows.forEach(function (r, ri) {
      var cy = topH + cellH * ri + cellH / 2;
      var lab = String(r);
      s += axisText(labW - 8, cy + 3.5, lab.length > 18 ? lab.slice(0, 17) + '…' : lab, 'end', 10, { strong: true });
      cols.forEach(function (c, ci) {
        var v = cfg.value(ri, ci);
        var known = typeof v === 'number' && isFinite(v);
        var t = known ? (v - vmin) / span : 0;
        var op = known ? (0.08 + 0.84 * Math.max(0, Math.min(1, t))) : 0;
        s += '<rect x="' + (labW + cellW * ci + 1).toFixed(1) + '" y="' + (topH + cellH * ri + 1).toFixed(1) +
          '" width="' + (cellW - 2).toFixed(1) + '" height="' + (cellH - 2).toFixed(1) + '" rx="3" fill="' + base +
          '" opacity="' + op.toFixed(2) + '" stroke="' + GRID + '"><title>' +
          esc(r + ' × ' + c + ': ' + (known ? (cfg.fmtCell || fmt)(v) : 'no data')) + '</title></rect>';
        if (known && cfg.showValues && cellW > 26) {
          s += axisText(labW + cellW * ci + cellW / 2, topH + cellH * ri + cellH / 2 + 3.5, (cfg.fmtCell || fmt)(v), 'middle', 9, t > 0.55 ? null : { strong: false });
        }
      });
    });
    return s + '</svg>';
  }

  // ---- donut(items:[{label,value,color}], opts) ----------------------------
  function donut(items, o) {
    o = o || {};
    items = (items || []).filter(function (d) { return d.value > 0; });
    var total = items.reduce(function (a, d) { return a + d.value; }, 0);
    if (!total) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var sz = o.size || 180, r = sz / 2 - 6, ir = r * (o.thickness != null ? 1 - o.thickness : 0.62), cx = sz / 2, cy = sz / 2;
    var s = open(sz, sz, o.label || 'share donut');
    var a0 = -Math.PI / 2;
    items.forEach(function (d, i) {
      var a1 = a0 + (d.value / total) * Math.PI * 2;
      var big = (a1 - a0) > Math.PI ? 1 : 0;
      var p = function (ang, rad) { return (cx + Math.cos(ang) * rad).toFixed(2) + ' ' + (cy + Math.sin(ang) * rad).toFixed(2); };
      s += '<path d="M ' + p(a0, r) + ' A ' + r + ' ' + r + ' 0 ' + big + ' 1 ' + p(a1, r) +
        ' L ' + p(a1, ir) + ' A ' + ir + ' ' + ir + ' 0 ' + big + ' 0 ' + p(a0, ir) + ' Z" fill="' + (d.color || seriesColor(i)) +
        '" opacity="0.9"><title>' + esc(d.label + ': ' + fmt(d.value) + ' (' + Math.round(d.value / total * 100) + '%)') + '</title></path>';
      a0 = a1;
    });
    if (o.center) s += axisText(cx, cy + 4, o.center, 'middle', 13, { strong: true });
    return s + '</svg>';
  }

  // ---- stackedHBars(items:[{label,parts:[{name,value,color}]}], opts) ------
  function stackedHBars(items, o) {
    o = o || {};
    items = items || [];
    if (!items.length) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var w = o.w || 620, rowH = o.rowH || 30, labW = o.labW || 170, m = { t: 6, r: 60, b: 6 };
    var h = m.t + m.b + rowH * items.length;
    var vmax = o.max != null ? o.max : Math.max.apply(null, items.map(function (d) {
      return d.parts.reduce(function (a, p) { return a + (p.value || 0); }, 0);
    }).concat([0]));
    if (!(vmax > 0)) vmax = 1;
    var x = lin(0, vmax, labW, w - m.r);
    var s = open(w, h, o.label || 'stacked bar chart');
    items.forEach(function (d, i) {
      var cy = m.t + rowH * i + rowH / 2, run = 0;
      var lab = String(d.label == null ? '' : d.label);
      s += axisText(labW - 8, cy + 3.5, lab.length > 24 ? lab.slice(0, 23) + '…' : lab, 'end', 10.5, { strong: true });
      d.parts.forEach(function (p, pi) {
        var v = p.value || 0;
        if (v <= 0) { run += v; return; }
        var x0 = x(run), x1 = x(run + v);
        s += '<rect x="' + x0.toFixed(1) + '" y="' + (cy - rowH * 0.32).toFixed(1) + '" width="' + Math.max(0.5, x1 - x0).toFixed(1) +
          '" height="' + (rowH * 0.64).toFixed(1) + '" rx="2.5" fill="' + (p.color || seriesColor(pi)) + '" opacity="0.9"><title>' +
          esc(lab + ' — ' + p.name + ': ' + (o.vFmt || fmt)(v)) + '</title></rect>';
        run += v;
      });
      s += axisText(x(run) + 6, cy + 3.5, (o.vFmt || fmt)(run), 'start', 10);
    });
    return s + '</svg>';
  }

  // ---- calendarHeat(counts {'YYYY-MM-DD':n}, {weeks, endDate}) -------------
  function calendarHeat(counts, o) {
    o = o || {};
    counts = counts || {};
    var weeks = o.weeks || 26, cell = 11, gap = 2;
    var end = o.endDate ? new Date(o.endDate) : new Date();
    end.setHours(0, 0, 0, 0);
    var endDow = end.getDay();
    var days = weeks * 7 - (6 - endDow);
    var start = new Date(end); start.setDate(end.getDate() - days + 1);
    var w = 34 + weeks * (cell + gap), h = 20 + 7 * (cell + gap) + 4;
    var vmax = 0;
    Object.keys(counts).forEach(function (k) { if (counts[k] > vmax) vmax = counts[k]; });
    var base = o.color || PALETTE[0];
    var s = open(w, h, o.label || 'activity calendar');
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var d = new Date(start), lastMonth = -1;
    for (var i = 0; i < days; i++) {
      var wk = Math.floor((i + start.getDay()) / 7), dow = d.getDay();
      var xp = 30 + wk * (cell + gap), yp = 18 + dow * (cell + gap);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var v = counts[key] || 0;
      var op = v > 0 ? 0.25 + 0.7 * Math.min(1, v / (vmax || 1)) : 0;
      if (d.getDate() <= 7 && d.getMonth() !== lastMonth && dow === 0) { s += axisText(xp, 10, mon[d.getMonth()], 'start', 9); lastMonth = d.getMonth(); }
      s += '<rect x="' + xp + '" y="' + yp + '" width="' + cell + '" height="' + cell + '" rx="2.5" fill="' + base +
        '" opacity="' + (v > 0 ? op.toFixed(2) : 0) + '" stroke="' + GRID + '"><title>' + esc(key + ': ' + v) + '</title></rect>';
      d.setDate(d.getDate() + 1);
    }
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (dl, di) {
      if (di % 2 === 1) s += axisText(24, 18 + di * (cell + gap) + cell - 2, dl, 'end', 8);
    });
    return s + '</svg>';
  }

  // ---- ruler(value, {min,max,zones:[{to,label}],valueLabel}) ---------------
  function ruler(value, o) {
    o = o || {};
    var w = o.w || 560, h = 74, m = { l: 16, r: 16 };
    var mn = o.min != null ? o.min : 0, mx = o.max != null ? o.max : 1;
    var x = lin(mn, mx, m.l, w - m.r);
    var s = open(w, h, o.label || 'benchmark ruler');
    var zones = o.zones || [];
    var prev = mn;
    zones.forEach(function (z, i) {
      var x0 = x(prev), x1 = x(Math.min(z.to, mx));
      s += '<rect x="' + x0.toFixed(1) + '" y="34" width="' + Math.max(0, x1 - x0).toFixed(1) + '" height="14" rx="3" fill="' +
        seriesColor(i) + '" opacity="0.35"><title>' + esc(z.label + ' (' + fmt(prev) + '–' + fmt(z.to) + ')') + '</title></rect>';
      s += axisText((x0 + x1) / 2, 62, z.label, 'middle', 9.5);
      prev = z.to;
    });
    niceTicks(mn, mx, 5).forEach(function (t) { s += axisText(x(t), 30, fmt(t), 'middle', 9); });
    if (typeof value === 'number' && isFinite(value)) {
      var vx = x(Math.max(mn, Math.min(mx, value)));
      s += '<path d="M ' + vx.toFixed(1) + ' 32 l -5 -8 h 10 z" fill="currentColor"/>';
      s += axisText(vx, 14, o.valueLabel || fmt(value, 2), 'middle', 11, { strong: true });
    }
    return s + '</svg>';
  }

  // ---- radar({axes:[label], series:[{name,values:[0..1],color}]}) ----------
  function radar(cfg) {
    cfg = cfg || {};
    var axes = cfg.axes || [], series = cfg.series || [];
    if (axes.length < 3 || !series.length) return '<span style="color:' + MUTED + ';font-size:12px">not enough data yet</span>';
    var sz = cfg.size || 280, cx = sz / 2, cy = sz / 2, r = sz / 2 - 44;
    var ang = function (i) { return -Math.PI / 2 + (i / axes.length) * Math.PI * 2; };
    var pt = function (i, t) { return (cx + Math.cos(ang(i)) * r * t).toFixed(1) + ',' + (cy + Math.sin(ang(i)) * r * t).toFixed(1); };
    var s = open(sz, sz, cfg.label || 'radar chart');
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      s += '<polygon points="' + axes.map(function (_, i) { return pt(i, t); }).join(' ') + '" fill="none" stroke="' + GRID + '"/>';
    });
    axes.forEach(function (a, i) {
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pt(i, 1).split(',').join('" y2="') + '" stroke="' + GRID + '"/>';
      var lx = cx + Math.cos(ang(i)) * (r + 18), ly = cy + Math.sin(ang(i)) * (r + 18);
      s += axisText(lx, ly + 3, a, Math.abs(Math.cos(ang(i))) < 0.3 ? 'middle' : (Math.cos(ang(i)) > 0 ? 'start' : 'end'), 9.5, { strong: true });
    });
    series.forEach(function (ser, si) {
      var col = ser.color || seriesColor(si);
      var pts = axes.map(function (_, i) {
        var v = Math.max(0, Math.min(1, ser.values[i] || 0));
        return pt(i, v);
      }).join(' ');
      s += '<polygon points="' + pts + '" fill="' + col + '" opacity="0.16"/>';
      s += '<polygon points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2"><title>' + esc(ser.name || 'series ' + (si + 1)) + '</title></polygon>';
    });
    return s + '</svg>';
  }

  // ---- flow2({links:[{from,to,value,color}]}) — minimal 2-column sankey ----
  function flow2(cfg) {
    cfg = cfg || {};
    var links = (cfg.links || []).filter(function (l) { return l.value > 0; });
    if (!links.length) return '<span style="color:' + MUTED + ';font-size:12px">no data yet</span>';
    var w = cfg.w || 620, colW = 10, labW = 6;
    var lTot = {}, rTot = {}, lOrder = [], rOrder = [];
    links.forEach(function (l) {
      if (!(l.from in lTot)) { lTot[l.from] = 0; lOrder.push(l.from); }
      if (!(l.to in rTot)) { rTot[l.to] = 0; rOrder.push(l.to); }
      lTot[l.from] += l.value; rTot[l.to] += l.value;
    });
    var total = links.reduce(function (a, l) { return a + l.value; }, 0);
    var gap = 8, innerH = Math.max(220, cfg.h || 300);
    var scaleV = function (v) { return (innerH - gap * (Math.max(lOrder.length, rOrder.length) - 1)) * (v / total); };
    var h = innerH + 30;
    var lx = 160, rx = w - 160;
    var lPos = {}, yv = 15;
    lOrder.forEach(function (n) { lPos[n] = { y: yv, used: 0 }; yv += scaleV(lTot[n]) + gap; });
    var rPos = {}; yv = 15;
    rOrder.forEach(function (n) { rPos[n] = { y: yv, used: 0 }; yv += scaleV(rTot[n]) + gap; });
    var s = open(w, h, cfg.label || 'flow diagram');
    links.forEach(function (l, i) {
      var lh = scaleV(l.value);
      var y0 = lPos[l.from].y + lPos[l.from].used, y1 = rPos[l.to].y + rPos[l.to].used;
      lPos[l.from].used += lh; rPos[l.to].used += lh;
      var mx = (lx + rx) / 2;
      s += '<path d="M ' + (lx + colW) + ' ' + y0.toFixed(1) + ' C ' + mx + ' ' + y0.toFixed(1) + ' ' + mx + ' ' + y1.toFixed(1) + ' ' + (rx - colW) + ' ' + y1.toFixed(1) +
        ' L ' + (rx - colW) + ' ' + (y1 + lh).toFixed(1) + ' C ' + mx + ' ' + (y1 + lh).toFixed(1) + ' ' + mx + ' ' + (y0 + lh).toFixed(1) + ' ' + (lx + colW) + ' ' + (y0 + lh).toFixed(1) +
        ' Z" fill="' + (l.color || seriesColor(i)) + '" opacity="0.30"><title>' + esc(l.from + ' → ' + l.to + ': ' + (cfg.vFmt || fmt)(l.value)) + '</title></path>';
    });
    lOrder.forEach(function (n, i) {
      var p = lPos[n], hh = scaleV(lTot[n]);
      s += '<rect x="' + lx + '" y="' + p.y.toFixed(1) + '" width="' + colW + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + seriesColor(i) + '"/>';
      s += axisText(lx - labW, p.y + hh / 2 + 3.5, n + ' (' + (cfg.vFmt || fmt)(lTot[n]) + ')', 'end', 10, { strong: true });
    });
    rOrder.forEach(function (n, i) {
      var p = rPos[n], hh = scaleV(rTot[n]);
      s += '<rect x="' + (rx - colW) + '" y="' + p.y.toFixed(1) + '" width="' + colW + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + seriesColor(i + 3) + '"/>';
      s += axisText(rx + labW, p.y + hh / 2 + 3.5, n + ' (' + (cfg.vFmt || fmt)(rTot[n]) + ')', 'start', 10, { strong: true });
    });
    return s + '</svg>';
  }

  // ---- boxstrip(groups:[{label,values:[...]}], opts) -----------------------
  function quantile(sorted, q) {
    if (!sorted.length) return NaN;
    var pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function boxstrip(groups, o) {
    o = o || {};
    groups = (groups || []).map(function (g) {
      return { label: g.label, values: (g.values || []).filter(function (v) { return isFinite(v); }).sort(function (a, b) { return a - b; }) };
    }).filter(function (g) { return g.values.length >= 3; });
    if (!groups.length) return '<span style="color:' + MUTED + ';font-size:12px">not enough data yet</span>';
    var w = o.w || 600, rowH = o.rowH || 34, labW = o.labW || 150, m = { t: 8, r: 40, b: 26 };
    var h = m.t + m.b + rowH * groups.length;
    var all = [];
    groups.forEach(function (g) { all = all.concat([g.values[0], g.values[g.values.length - 1]]); });
    var e = o.domain || extent(all);
    var x = lin(e[0], e[1], labW, w - m.r);
    var s = open(w, h, o.label || 'distribution strips');
    niceTicks(e[0], e[1], 5).forEach(function (t) {
      s += '<line x1="' + x(t).toFixed(1) + '" y1="' + m.t + '" x2="' + x(t).toFixed(1) + '" y2="' + (h - m.b) + '" stroke="' + GRID + '"/>';
      s += axisText(x(t), h - m.b + 14, (o.vFmt || fmt)(t), 'middle');
    });
    groups.forEach(function (g, i) {
      var cy = m.t + rowH * i + rowH / 2;
      var q1 = quantile(g.values, 0.25), md = quantile(g.values, 0.5), q3 = quantile(g.values, 0.75);
      var lo = g.values[0], hi = g.values[g.values.length - 1];
      var col = o.color || seriesColor(i);
      var lab = String(g.label);
      s += axisText(labW - 8, cy + 3.5, lab.length > 20 ? lab.slice(0, 19) + '…' : lab, 'end', 10.5, { strong: true });
      s += '<line x1="' + x(lo).toFixed(1) + '" y1="' + cy + '" x2="' + x(hi).toFixed(1) + '" y2="' + cy + '" stroke="' + col + '" opacity="0.5"/>';
      s += '<rect x="' + x(q1).toFixed(1) + '" y="' + (cy - 8) + '" width="' + Math.max(1, x(q3) - x(q1)).toFixed(1) + '" height="16" rx="3" fill="' + col + '" opacity="0.35"><title>' +
        esc(lab + ' — n=' + g.values.length + ', median ' + (o.vFmt || fmt)(md) + ', IQR ' + (o.vFmt || fmt)(q1) + '–' + (o.vFmt || fmt)(q3) + ', range ' + (o.vFmt || fmt)(lo) + '–' + (o.vFmt || fmt)(hi)) + '</title></rect>';
      s += '<line x1="' + x(md).toFixed(1) + '" y1="' + (cy - 9) + '" x2="' + x(md).toFixed(1) + '" y2="' + (cy + 9) + '" stroke="' + col + '" stroke-width="2.4"/>';
      s += axisText(x(hi) + 6, cy + 3.5, 'n=' + g.values.length, 'start', 9);
    });
    return s + '</svg>';
  }

  // ---- legend(entries:[{label,color}]) — returns HTML ----------------------
  function legend(entries) {
    return '<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;opacity:.85;margin:6px 0 2px">' +
      (entries || []).map(function (e, i) {
        return '<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:9px;height:9px;border-radius:3px;background:' +
          (e.color || seriesColor(i)) + ';display:inline-block"></span>' + esc(e.label) + '</span>';
      }).join('') + '</div>';
  }

  root.SyedCharts = {
    palette: PALETTE, color: seriesColor, fmt: fmt, esc: esc, niceTicks: niceTicks, quantile: quantile,
    sparkline: sparkline, line: line, bars: bars, hbars: hbars, histogram: histogram,
    scatter: scatter, heatmap: heatmap, donut: donut, stackedHBars: stackedHBars,
    calendarHeat: calendarHeat, ruler: ruler, radar: radar, flow2: flow2, boxstrip: boxstrip, legend: legend
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
