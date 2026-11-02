/* Чертежи к геометрии. mfig рисует точки, отрезки, окружности и эллипсы в SVG; точки могут быть объёмными [x, y, z]. */

function mfig(o) {
  var P = {}, names = Object.keys(o.p), k;
  function proj(q) { return q.length === 3 ? [q[0] + q[1] * .38, q[2] + q[1] * .32] : q; }
  names.forEach(function (n) { P[n] = proj(o.p[n]); });
  var all = names.map(function (n) { return P[n]; });
  (o.c || []).forEach(function (c) { all.push([c[0] - c[2], c[1] - c[2]], [c[0] + c[2], c[1] + c[2]]); });
  (o.e || []).forEach(function (e) { all.push([e[0] - e[2], e[1] - e[3]], [e[0] + e[2], e[1] + e[3]]); });
  var xs = all.map(function (a) { return a[0]; }), ys = all.map(function (a) { return a[1]; });
  var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
  var W = o.w || 260, m = W / ((x1 - x0) || 1), H = (y1 - y0) * m;
  if (H > 240) { m *= 240 / H; H = 240; W = (x1 - x0) * m; }
  var pad = 22, sx = function (x) { return pad + (x - x0) * m; }, sy = function (y) { return pad + (y1 - y) * m; };
  var cx = (o.mid || [(x0 + x1) / 2, (y0 + y1) / 2]);
  var s = '<svg class="plot fig" style="max-width:' + (W + 2 * pad) + 'px" viewBox="0 0 ' + (W + 2 * pad) + ' ' + (H + 2 * pad) + '" xmlns="http://www.w3.org/2000/svg">';
  function line(a, b, dash) {
    return '<line x1="' + sx(P[a][0]) + '" y1="' + sy(P[a][1]) + '" x2="' + sx(P[b][0]) + '" y2="' + sy(P[b][1]) + '" stroke="currentColor" stroke-width="1.6"' + (dash ? ' stroke-dasharray="5 4"' : '') + '/>';
  }
  (o.s || '').split(' ').filter(Boolean).forEach(function (e) { var q = e.split('-'); s += line(q[0], q[1]); });
  (o.d || '').split(' ').filter(Boolean).forEach(function (e) { var q = e.split('-'); s += line(q[0], q[1], true); });
  (o.c || []).forEach(function (c) { s += '<circle cx="' + sx(c[0]) + '" cy="' + sy(c[1]) + '" r="' + c[2] * m + '" fill="none" stroke="var(--accent)" stroke-width="1.8"/>'; });
  (o.e || []).forEach(function (e) { s += '<ellipse cx="' + sx(e[0]) + '" cy="' + sy(e[1]) + '" rx="' + e[2] * m + '" ry="' + e[3] * m + '" fill="none" stroke="var(--accent)" stroke-width="1.8"/>'; });
  (o.r || '').split(' ').filter(Boolean).forEach(function (t) {
    var q = t.split(':'), v = P[q[0]], a = P[q[1]], b = P[q[2]];
    function u(p) { var dx = p[0] - v[0], dy = p[1] - v[1], l = Math.sqrt(dx * dx + dy * dy); return [dx / l * 11 / m, dy / l * 11 / m]; }
    var ua = u(a), ub = u(b), p1 = [v[0] + ua[0], v[1] + ua[1]], p2 = [p1[0] + ub[0], p1[1] + ub[1]], p3 = [v[0] + ub[0], v[1] + ub[1]];
    s += '<polyline points="' + [p1, p2, p3].map(function (p) { return sx(p[0]) + ',' + sy(p[1]); }).join(' ') + '" fill="none" stroke="currentColor"/>';
  });
  var sub = { 1: '₁', 2: '₂' };
  names.forEach(function (n) {
    if (n.charAt(0) === '_') return;
    var dx = P[n][0] - cx[0], dy = P[n][1] - cx[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
    var lx = sx(P[n][0]) + dx / l * 13, ly = sy(P[n][1]) - dy / l * 13 + 4;
    s += '<circle cx="' + sx(P[n][0]) + '" cy="' + sy(P[n][1]) + '" r="2" fill="currentColor"/>';
    s += '<text x="' + lx + '" y="' + ly + '" font-size="13" font-style="italic" text-anchor="middle" fill="currentColor">' + n.replace(/\d/, function (d) { return sub[d] || d; }) + '</text>';
  });
  return s + '</svg>';
}
function mpt(deg, r, cx, cy) { var a = deg * Math.PI / 180; return [(cx || 0) + r * Math.cos(a), (cy || 0) + r * Math.sin(a)]; }
function mbox(a, b, c, extra) {
  return Object.assign({ p: { A: [0, 0, 0], B: [a, 0, 0], C: [a, b, 0], D: [0, b, 0], A1: [0, 0, c], B1: [a, 0, c], C1: [a, b, c], D1: [0, b, c] },
    s: 'A-B B-C A-A1 B-B1 C-C1 A1-B1 B1-C1 C1-D1 D1-A1', d: 'A-D D-C D-D1' }, extra || {});
}
function mcyl(r, h, extra) {
  return Object.assign({ p: { _a: [-r, 0], _b: [r, 0], _c: [-r, h], _d: [r, h] }, s: '_a-_c _b-_d', e: [[0, 0, r, r * .3], [0, h, r, r * .3]] }, extra || {});
}
function mcone(r, h) {
  return { p: { _a: [-r, 0], _b: [r, 0], S: [0, h], O: [0, 0] }, s: '_a-S _b-S', d: 'S-O O-_b', e: [[0, 0, r, r * .3]] };
}

// Чертежи к уже написанным задачам
var M_FIGS = {
  'mo15-1': { p: { C: [0, 0], A: [0, 6], B: [8, 0] }, s: 'A-B B-C C-A', r: 'C:A:B' },
  'mo15-2': { p: { A: [0, 0], B: [7, 0], C: [4.15, 4.94] }, s: 'A-B B-C C-A' },
  'mo15-3': { p: { A: [0, 0], B: [8, 0], C: [3, 6], M: [1.5, 3], N: [5.5, 3] }, s: 'A-B B-C C-A M-N' },
  'mo16-1': { p: { A: mpt(200, 3), B: mpt(-20, 3), C: mpt(90, 3) }, s: 'C-A C-B', c: [[0, 0, 3]], mid: [0, 0] },
  'mo16-2': { p: { O: [0, 0], B: [0, 5], A: [12, 5] }, s: 'A-B O-B O-A', c: [[0, 0, 5]], r: 'B:A:O', mid: [3, 0] },
  'mo17-1': { p: { A: [0, 0], D: [7, 0], B: [3.06, 2.57], C: [10.06, 2.57] }, s: 'A-D D-C C-B B-A' },
  'mo17-2': { p: { A: [-4, 0], C: [4, 0], B: [0, 3], D: [0, -3] }, s: 'A-B B-C C-D D-A', d: 'A-C B-D' },
  'mo17-3': { p: { A: [0, 0], D: [10, 0], B: [2, 5], C: [6, 5], H: [2, 0] }, s: 'A-D D-C C-B B-A', d: 'B-H', r: 'H:B:D' },
  'mo23-1': { p: { A: [0, 0], D: [10, 0], B: [3, 6.32], C: [13, 6.32], E: [10, 6.32] }, s: 'A-D D-C C-B B-A A-E' },
  'mo23-2': { p: { A: [-4, 0], B: [6, 0], C: [-1.5, 2.6], D: [4, -6.93], E: [0, 0] }, s: 'A-B C-D', c: [[1, -2.31, 5.5]], mid: [1, -2.31] },
  'mo24-1': { p: { A: [0, 0], B: [8, 0], C: [8, 5], D: [0, 5], E: [4, 0] }, s: 'A-B B-C C-D D-A E-C E-D' },
  'mo24-2': { p: { A: [0, 0], C: [8, 0], B: [4, 6], M: [4, 0] }, s: 'A-B B-C C-A', d: 'B-M' },
  'mo25-1': { p: { A: [0, 0], D: [18, 0], B: [5, 12], C: [13, 12] }, s: 'A-D D-C C-B B-A', c: [[9, 6, 6]] },
  'mo25-2': { p: { O1: [0, 0], O2: [8, 0], P: [-.75, 2.9], Q: [6.75, 4.84] }, s: 'P-Q O1-P O2-Q O1-O2', c: [[0, 0, 3], [8, 0, 5]] },
  'mb9-1': { p: { A: [0, 3], B: [0, 0], C: [4, 0] }, s: 'A-B B-C C-A', r: 'B:A:C' },
  'mb10-2': { p: { C: [0, 0], A: [8, 0], B: [0, 6] }, s: 'A-B B-C C-A', r: 'C:A:B' },
  'mb11-1': mbox(3, 3, 3),
  'mb11-2': mbox(4, 3, 2),
  'mb12-1': { p: { O: [0, 0], A: mpt(215, 3), B: mpt(-35, 3), C: mpt(90, 3) }, s: 'C-A C-B O-A O-B', c: [[0, 0, 3]], mid: [0, .5] },
  'mb13-1': mcyl(2, 5),
  'mb13-2': mcone(3, 4),
  'mp1-1': { p: { A: [0, 0], D: [18, 0], B: [5, 12], C: [13, 12] }, s: 'A-D D-C C-B B-A', c: [[9, 6, 6]] },
  'mp1-2': { p: { A: [0, 0], B: [8, 0], C: [3, 6], D: [1.5, 3], E: [5.5, 3] }, s: 'A-B B-C C-A D-E' },
  'mp1-3': { p: { A: [0, 0], B: [8, 0], C: [6.85, 8.17], D: [7.51, 3.5] }, s: 'A-B B-C C-A A-D' },
  'mp3-1': mcyl(3, 6, { c: [[0, 3, 3]] }),
  'mp3-2': mbox(4, 6, 5, { d: 'A-D D-C D-D1 A-C A-B1 C-B1' }),
  'mp15-1': mbox(3, 3, 3, { d: 'A-D D-C D-D1 A-C A-B1 C-B1 B-D1' }),
  'mp15-2': mbox(3, 4, 12, { d: 'A-D D-C D-D1 B-D1 B-D' }),
  'mp18-1': { p: { A: mpt(200, 5), C: mpt(-20, 5), B: [0, 9], M: [-1.92, 4.62], K: [1.92, 4.62] }, s: 'A-B B-C C-A M-K', c: [[0, 0, 5]], mid: [0, 3] },
  'mp18-2': { p: { C: [0, 0], A: [12, 0], B: [0, 5], M: [6, 2.5] }, s: 'A-B B-C C-A C-M', r: 'C:A:B' }
};
TASKS.forEach(function (t) { if (M_FIGS[t.id]) t.text += mfig(M_FIGS[t.id]); });
