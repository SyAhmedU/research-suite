// Smoke: every helper renders an <svg> (or honest empty-state) and escapes input.
import './syed-charts.js';
const C = globalThis.SyedCharts;
const ok = (name, s, expectSvg = true) => {
  const pass = typeof s === 'string' && (expectSvg ? s.startsWith('<svg') : s.length > 0) && !s.includes('NaN') && !s.includes('undefined');
  console.log((pass ? 'PASS' : 'FAIL') + ' ' + name + (pass ? '' : ' → ' + s.slice(0, 200)));
  if (!pass) process.exitCode = 1;
};
ok('sparkline', C.sparkline([1, 3, 2, 5, 4]));
ok('sparkline empty-state', C.sparkline([]), false);
ok('line+band', C.line({ series: [{ name: 'a', points: [{ x: 1, y: 2, lo: 1, hi: 3 }, { x: 2, y: 4, lo: 3, hi: 5 }] }], markers: [{ x: 1.5, label: 'mid' }] }));
ok('bars+pareto', C.bars([{ label: 'x', value: 5 }, { label: 'y', value: 2 }], { cumulativeLine: true }));
ok('hbars', C.hbars([{ label: 'a "quoted" <tag>', value: 3, note: 'n' }]));
ok('histogram+marker', C.histogram([1, 2, 2, 3, 3, 3, 4, 9], { marker: 3, markerLabel: 'you' }));
ok('scatter quadrant', C.scatter([{ x: 1, y: 2, label: 'p' }, { x: 3, y: 1 }], { xLine: 2, yLine: 1.5, quadLabels: ['tl', 'tr', 'bl', 'br'], xLabel: 'X', yLabel: 'Y' }));
ok('heatmap', C.heatmap({ rows: ['r1', 'r2'], cols: ['c1', 'c2', 'c3'], value: (r, c) => r + c, showValues: true }));
ok('donut', C.donut([{ label: 'a', value: 3 }, { label: 'b', value: 1 }], { center: '4' }));
ok('stackedHBars', C.stackedHBars([{ label: 'j', parts: [{ name: 'p1', value: 10 }, { name: 'p2', value: 5 }] }]));
ok('calendarHeat', C.calendarHeat({ '2026-07-01': 3, '2026-07-15': 1 }, { weeks: 8, endDate: '2026-07-18' }));
ok('ruler', C.ruler(0.42, { min: 0, max: 1, zones: [{ to: 0.1, label: 'small' }, { to: 0.3, label: 'medium' }, { to: 1, label: 'large' }] }));
ok('radar', C.radar({ axes: ['a', 'b', 'c', 'd'], series: [{ name: 's', values: [0.2, 0.8, 0.5, 1] }] }));
ok('flow2', C.flow2({ links: [{ from: 'A', to: 'X', value: 5 }, { from: 'B', to: 'X', value: 2 }, { from: 'A', to: 'Y', value: 1 }] }));
ok('boxstrip', C.boxstrip([{ label: 'g', values: [1, 2, 3, 4, 100] }]));
ok('legend html', C.legend([{ label: 'one' }]), false);
// escaping check
const evil = C.hbars([{ label: '<script>alert(1)</script>', value: 1 }]);
if (evil.includes('<script>')) { console.log('FAIL escaping'); process.exitCode = 1; } else console.log('PASS escaping');
console.log(process.exitCode ? 'chartkit: FAILURES' : 'chartkit: all green');
