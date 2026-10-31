/* KaskyrAlmaty deck: static content is built once at its final state; each slide's
   timeline animates *from* earlier states, so progress(1) or no animation = final. */
(function () {
  'use strict';
  const C = { bg: '#0B0F14', ink: '#E8EDF2', dim: '#8A96A3', base: '#FF5A36', ours: '#2EE6A6', mech: '#5B8CFF', line: '#1E2833', panel: '#121922' };
  const CARD = 16384; // MiB on the 16 GB T4 bar
  const pct = mib => (mib / CARD * 100) + '%';
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const params = new URLSearchParams(location.search);
  const PRINT = params.has('print');
  const FREEZE = params.has('freeze');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = Array.from(document.querySelectorAll('.slide'));
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- static build ---------- */
  document.querySelectorAll('.bigbar').forEach(bar => {
    bar.querySelectorAll('[data-mib]').forEach(e => {
      const from = +(e.dataset.from || 0), mib = +e.dataset.mib;
      if (e.classList.contains('bb-peak') || e.classList.contains('bb-mark')) e.style.left = pct(mib);
      else { e.style.left = pct(from); e.style.width = pct(mib); }
    });
    const ticks = bar.querySelector('.bb-ticks');
    if (ticks) for (let g = 0; g <= 16; g++) {
      if (g > 0 && g < 16) { const i = document.createElement('i'); i.style.left = (g / 16 * 100) + '%'; ticks.appendChild(i); }
      if (g % 2 === 0) { const b = document.createElement('b'); b.style.left = (g / 16 * 100) + '%'; b.textContent = g + (g === 16 ? ' GB' : ''); if (g === 16) b.style.transform = 'translateX(-100%)'; ticks.appendChild(b); }
    }
  });
  document.querySelectorAll('.check-row').forEach(row => {
    const ok = row.id === 'res-checks';
    for (let i = 1; i <= 10; i++) { const c = document.createElement('i'); c.textContent = ok ? '' : i; if (ok) c.className = 'ok'; row.appendChild(c); }
  });

  // slide 2: score terms against the ratio
  (function scorePlot() {
    const s = document.getElementById('score-plot');
    const X0 = 70, X1 = 840, Y0 = 410, Y1 = 20, xr = [1, 6], yr = [0, 60];
    const X = v => X0 + (v - xr[0]) / (xr[1] - xr[0]) * (X1 - X0);
    const Y = v => Y0 - (v - yr[0]) / (yr[1] - yr[0]) * (Y0 - Y1);
    el('rect', { x: X(1), y: Y1, width: X(1.05) - X(1) + 4, height: Y0 - Y1, fill: C.line, class: 'sp-dead' }, s);
    el('text', { x: X0, y: Y0 + 58, 'font-size': 16 }, s, 'grey band: under 1.05 counts as 1.0');
    [0, 20, 40, 60].forEach(v => { el('line', { x1: X0, x2: X1, y1: Y(v), y2: Y(v), stroke: C.line }, s); el('text', { x: X0 - 14, y: Y(v) + 6, 'text-anchor': 'end', 'font-size': 16 }, s, v); });
    [1, 2, 3, 4, 5, 6].forEach(v => el('text', { x: X(v), y: Y0 + 30, 'text-anchor': 'middle', 'font-size': 16 }, s, v + '×'));
    el('text', { x: X1, y: Y0 + 58, 'text-anchor': 'end', 'font-size': 16 }, s, 'ratio, base over ours');
    el('text', { x: X0 - 14, y: Y1 - 4 + 0, 'text-anchor': 'end', 'font-size': 16, transform: '' }, s, '');
    const curve = (f, maxX) => { let d = ''; for (let v = 1.05; v <= maxX + 1e-9; v += 0.01) d += (d ? 'L' : 'M') + X(v).toFixed(1) + ',' + Y(f(v)).toFixed(1); return 'M' + X(1) + ',' + Y(0) + 'L' + X(1.05) + ',' + Y(0) + d.replace(/^M/, 'L'); };
    const sp = el('path', { d: curve(v => 35 * Math.log(v) / Math.log(1.5), Math.pow(1.5, 60 / 35)), stroke: C.mech, 'stroke-width': 4, fill: 'none', class: 'sp-curve' }, s);
    const mp = el('path', { d: curve(v => 30 * Math.log(v) / Math.log(3), 6), stroke: C.ours, 'stroke-width': 4, fill: 'none', class: 'sp-curve' }, s);
    el('text', { x: X(1.8), y: Y(46), class: 't-mech', 'font-size': 18 }, s, 'speed term');
    el('text', { x: X(3.4), y: Y(30 * Math.log(3.4) / Math.log(3)) + 36, class: 't-ours', 'font-size': 18 }, s, 'memory term');
    const m = 5.6454, mv = 30 * Math.log(m) / Math.log(3);
    const g = el('g', { class: 'sp-us' }, s);
    el('line', { x1: X(m), x2: X(m), y1: Y0, y2: Y(mv), stroke: C.ours, 'stroke-dasharray': '4 6' }, g);
    el('circle', { cx: X(m), cy: Y(mv), r: 9, fill: C.ours }, g);
    el('text', { x: X(m) - 18, y: Y(mv) - 22, class: 't-ink', 'font-size': 18, 'text-anchor': 'end' }, g, 'ours: m = 5.6454 → 47.3');
  })();

  // slide 3: the logits tensor and the copies that read it
  (function logits() {
    const s = document.getElementById('logits-svg');
    const W = 1680;
    const g = el('g', { class: 'lg-tensor' }, s);
    // a deep slab: 4 x 512 x 151,936, drawn with a short depth offset
    const x0 = 0, y0 = 40, w = 1180, h = 120, dx = 26, dy = -18;
    for (let k = 3; k >= 0; k--) {
      el('rect', { x: x0 + k * dx / 3 * 1, y: y0 + k * dy / 3 * 1 + 0, width: w, height: h, fill: k ? C.panel : '#2A1610', stroke: C.base, 'stroke-width': k ? 1 : 2, 'stroke-opacity': k ? .5 : 1 }, g);
    }
    // vocab columns hint
    for (let i = 1; i < 60; i++) el('line', { x1: x0 + i * w / 60, x2: x0 + i * w / 60, y1: y0, y2: y0 + h, stroke: C.base, 'stroke-opacity': .16 }, g);
    el('text', { x: x0, y: y0 + h + 34, class: 't-ink', 'font-size': 22 }, g, '151,936 vocabulary columns');
    el('text', { x: x0 + w + dx + 18, y: y0 + h / 2 + 8, 'font-size': 22 }, g, '512 tokens');
    el('text', { x: x0 + w + dx + 18, y: y0 + h / 2 - 30, 'font-size': 22 }, g, '× 4 sequences');
    const a = el('g', { class: 'lg-math' }, s);
    el('text', { x: 0, y: 260, class: 't-ink', 'font-size': 30 }, a, '4 × 512 × 151,936 ≈ 311 M values');
    el('text', { x: 0, y: 302, 'font-size': 30 }, a, '× 4 bytes (fp32) = ');
    el('text', { x: 360, y: 302, class: 't-base', 'font-size': 30 }, a, '1.24 GB per copy');
    // copies: who reads or copies the logits
    const names = ['loss', 'its gradient', 'entropy', 'token accuracy', 'rewind losses'];
    const cg = el('g', { class: 'lg-copies' }, s);
    names.forEach((n, i) => {
      const cx = 760 + i * 184, cy = 228;
      const c = el('g', { class: 'lg-copy' }, cg);
      el('rect', { x: cx, y: cy, width: 176, height: 46, rx: 3, fill: C.base, 'fill-opacity': .18, stroke: C.base, 'stroke-width': 1.5 }, c);
      el('text', { x: cx + 14, y: cy + 30, class: 't-ink', 'font-size': 18 }, c, n);
    });
    el('text', { x: 760, y: 310, 'font-size': 20 }, cg, 'each reads or copies the full logits');
  })();

  // slide 4: streamed head
  const HEAD = { chunks: 12 };
  (function head() {
    const s = document.getElementById('head-svg');
    const x0 = 0, y0 = 50, w = 1180, h = 230, n = HEAD.chunks, cw = w / n;
    el('text', { x: x0, y: 28, 'font-size': 20 }, s, 'logits [2,048 positions × 151,936]: never allocated, 1.24 GB saved per copy');
    el('rect', { x: x0, y: y0, width: w, height: h, fill: 'none', stroke: C.dim, 'stroke-dasharray': '6 8', 'stroke-width': 1.5 }, s);
    const visited = el('g', { class: 'hd-visited' }, s);
    for (let i = 0; i < n; i++) el('rect', { x: x0 + i * cw + 3, y: y0 + 3, width: cw - 6, height: h - 6, fill: C.mech, 'fill-opacity': .07, class: 'hd-v' }, visited);
    // the live chunk
    const win = el('g', { class: 'hd-win' }, s);
    el('rect', { x: 0, y: y0 - 8, width: cw, height: h + 16, fill: C.mech, 'fill-opacity': .28, stroke: C.mech, 'stroke-width': 3, rx: 3 }, win);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) el('rect', { x: 10 + c * (cw - 20) / 4, y: y0 + 14 + r * 24, width: (cw - 20) / 4 - 6, height: 14, fill: C.mech, 'fill-opacity': .25 + ((r * 7 + c * 3) % 5) / 8, class: 'hd-cell' }, win);
    el('text', { x: cw / 2, y: y0 + h + 40, 'text-anchor': 'middle', class: 't-mech', 'font-size': 18 }, win, 'one vocab chunk');
    el('text', { x: cw / 2, y: y0 + h + 64, 'text-anchor': 'middle', 'font-size': 16 }, win, 'cuBLAS GEMM');
    // accumulators
    const ax = x0 + w + 70;
    const acc = el('g', { class: 'hd-acc' }, s);
    el('text', { x: ax, y: 28, class: 't-ink', 'font-size': 20 }, acc, 'per position: a few running values');
    const labels = [['m', 'running max'], ['l', 'sum of exp'], ['H', 'entropy'], ['acc', 'argmax hit']];
    labels.forEach((L, i) => {
      const yy = y0 + 20 + i * 56;
      el('text', { x: ax, y: yy + 18, class: 't-mech', 'font-size': 22 }, acc, L[0]);
      el('rect', { x: ax + 60, y: yy, width: 200, height: 22, fill: C.line, rx: 2 }, acc);
      el('rect', { x: ax + 60, y: yy, width: 200, height: 22, fill: C.mech, rx: 2, class: 'hd-bar', 'data-final': [0.82, 0.64, 0.5, 0.92][i] * 200 }, acc).setAttribute('width', [0.82, 0.64, 0.5, 0.92][i] * 200);
      el('text', { x: ax + 276, y: yy + 18, 'font-size': 18 }, acc, L[1]);
    });
    const f = el('g', { class: 'hd-formula' }, s);
    el('text', { x: ax, y: y0 + 262, class: 't-ink', 'font-size': 21 }, f, "m' = max(m, max xₖ)");
    el('text', { x: ax, y: y0 + 296, class: 't-ink', 'font-size': 21 }, f, "l' = l·e^(m−m') + Σ e^(xₖ−m')");
    el('text', { x: ax, y: y0 + 332, 'font-size': 18 }, f, 'own Triton: partial, merge, finish');
    HEAD.cw = cw; HEAD.win = win;
    win.setAttribute('transform', `translate(${x0 + (n - 1) * cw},0)`);
  })();

  // slide 5: 28 layers, dropped and rebuilt
  const BODY = {};
  (function body() {
    const s = document.getElementById('body-svg');
    const n = 28, pitch = 1680 / n, cw = pitch - 16, top = 30, H = 150;
    el('text', { x: 0, y: 14, 'font-size': 18 }, s, 'saved for backward, per decoder layer');
    const cols = [];
    for (let i = 0; i < n; i++) {
      const x = i * pitch;
      const g = el('g', { class: 'bd-col' }, s);
      el('rect', { x, y: top, width: cw, height: H, fill: 'none', stroke: C.base, 'stroke-dasharray': '4 5', 'stroke-opacity': .7, class: 'bd-ghost' }, g);
      const rb = el('rect', { x, y: top, width: cw, height: H, fill: C.mech, 'fill-opacity': .55, class: 'bd-re' }, g);
      rb.setAttribute('opacity', 0);
      el('rect', { x, y: top + H - 22, width: cw, height: 22, fill: C.ours, class: 'bd-keep' }, g);
      if (i === 0 || i === n - 1 || (i + 1) % 7 === 0) el('text', { x: x + cw / 2, y: top + H + 28, 'text-anchor': 'middle', 'font-size': 16 }, g, i + 1);
      cols.push(g);
    }
    BODY.cols = cols;
    // memory trace over one step
    const ty0 = 330, th = 96, tx0 = 0, tx1 = 1680, mid = 840;
    el('line', { x1: tx0, x2: tx1, y1: ty0, y2: ty0, stroke: C.line, 'stroke-width': 2 }, s);
    el('line', { x1: mid, x2: mid, y1: ty0 - th - 10, y2: ty0 + 6, stroke: C.line, 'stroke-dasharray': '3 5' }, s);
    el('text', { x: 0, y: ty0 + 2 + 0, 'font-size': 0 }, s, '');
    el('text', { x: mid - 12, y: ty0 + 26, 'text-anchor': 'end', 'font-size': 16 }, s, 'forward, layers 1 → 28');
    el('text', { x: mid + 12, y: ty0 + 26, 'font-size': 16 }, s, 'backward, 28 → 1: recompute, then free');
    const base = el('path', { d: `M${tx0},${ty0} L${mid},${ty0 - th + 14} L${tx1},${ty0}`, stroke: C.base, 'stroke-width': 3, fill: 'none', class: 'bd-trace' }, s);
    const ours = el('path', { d: `M${tx0},${ty0} L${mid},${ty0 - 22} L${tx1},${ty0}`, stroke: C.ours, 'stroke-width': 3, fill: 'none', class: 'bd-trace' }, s);
    el('text', { x: mid - 220, y: ty0 - th + 6, 'font-size': 16, class: 't-base', 'text-anchor': 'end' }, s, 'stored activations, base');
    el('text', { x: mid - 30, y: ty0 - 32, 'font-size': 16, class: 't-ours', 'text-anchor': 'end' }, s, 'ours');
  })();

  // slide 7: the ledger, every measured run
  (function ledger() {
    const s = document.getElementById('ledger-svg');
    const L = window.LEDGER || { runs: [] };
    const X0 = 90, X1 = 1040, Y0 = 560, Y1 = 20, T = 32, M = 15000;
    const X = t => X0 + t / T * (X1 - X0), Y = m => Y0 - m / M * (Y0 - Y1);
    for (let t = 0; t <= 30; t += 3) {
      el('line', { x1: X(t), x2: X(t), y1: Y1, y2: Y0, stroke: C.line, 'stroke-dasharray': t % 6 ? '2 6' : '' }, s);
      if (t % 6 === 0) el('text', { x: X(t), y: Y0 + 30, 'text-anchor': 'middle', 'font-size': 16 }, s, '+' + t + ' h');
      el('path', { d: `M${X(t) - 6},${Y0 + 2} L${X(t) + 6},${Y0 + 2} L${X(t)},${Y0 - 8}Z`, fill: C.mech, 'fill-opacity': .8 }, s);
    }
    el('text', { x: X1, y: Y0 + 58, 'text-anchor': 'end', 'font-size': 16 }, s, 'hours since the first baseline, 30.10 12:43; ▲ review every 3 h');
    [0, 5000, 10000].forEach(m => { el('line', { x1: X0, x2: X1, y1: Y(m), y2: Y(m), stroke: C.line }, s); el('text', { x: X0 - 12, y: Y(m) + 6, 'text-anchor': 'end', 'font-size': 16 }, s, fmt(m)); });
    el('text', { x: X0 - 12, y: Y1 - 2, 'text-anchor': 'end', 'font-size': 16 }, s, 'MiB');
    el('line', { x1: X0, x2: X1, y1: Y(14345), y2: Y(14345), stroke: C.base, 'stroke-dasharray': '8 6', 'stroke-width': 2 }, s);
    el('text', { x: X1, y: Y(14345) - 10, 'text-anchor': 'end', class: 't-base', 'font-size': 16 }, s, 'base 14,345');
    const dots = el('g', { class: 'lg-dots' }, s);
    let best = Infinity, path = '';
    L.runs.forEach(r => {
      const [lane, t, pk, dec, pass] = r;
      const kill = dec === 'kill';
      el('circle', { cx: X(t), cy: Y(pk), r: 5.5, fill: kill ? 'none' : (lane === 'h' ? C.mech : C.ink), 'fill-opacity': kill ? 1 : .8, stroke: kill ? C.dim : 'none', 'stroke-width': 1.5, 'data-t': t }, dots);
      if (pass && pk < best) { path += (path ? `L${X(t)},${Y(best)}L${X(t)},${Y(pk)}` : `M${X(t)},${Y(pk)}`); best = pk; }
    });
    path += `L${X(31.6)},${Y(best)}`;
    el('path', { d: path, stroke: C.ours, 'stroke-width': 3.5, fill: 'none', class: 'lg-front' }, s);
    const sub = el('g', { class: 'lg-note' }, s);
    el('circle', { cx: X(31.27), cy: Y(2541), r: 10, fill: 'none', stroke: C.ours, 'stroke-width': 3 }, sub);
    el('text', { x: X(31.27) - 4, y: Y(2541) + 44, 'text-anchor': 'end', class: 't-ours', 'font-size': 18 }, sub, 'submitted: 2,541');
    el('text', { x: X(31.27) - 4, y: Y(2541) + 68, 'text-anchor': 'end', 'font-size': 16 }, sub, '2,459 failed check 8 in run 51');
  })();

  // slide 8: time ratio axis
  (function limits() {
    const s = document.getElementById('lim-svg');
    const X0 = 0, X1 = 1680, r0 = 0.9, r1 = 1.16, Y = 200;
    const X = r => X0 + (r - r0) / (r1 - r0) * (X1 - X0);
    const z = el('g', { class: 'lim-zones' }, s);
    el('rect', { x: X(r0), y: Y - 60, width: X(1 / 1.05) - X(r0), height: 120, fill: C.ours, 'fill-opacity': .14 }, z);
    el('rect', { x: X(1 / 1.05), y: Y - 60, width: X(1.10) - X(1 / 1.05), height: 120, fill: C.panel }, z);
    el('rect', { x: X(1.10), y: Y - 60, width: X(r1) - X(1.10), height: 120, fill: C.base, 'fill-opacity': .16 }, z);
    el('text', { x: X(r0) + 16, y: Y - 72, class: 't-ours', 'font-size': 18 }, z, 'speed points start, s ≥ 1.05');
    el('text', { x: X(1 / 1.05) + 16, y: Y - 72, 'font-size': 18 }, z, 'admitted, speed scores 0');
    el('text', { x: X(1.10) + 16, y: Y - 72, class: 't-base', 'font-size': 18 }, z, 'check 8 fails, > +10%');
    el('line', { x1: X0, x2: X1, y1: Y, y2: Y, stroke: C.dim, 'stroke-width': 1.5 }, s);
    [0.9, 0.95, 1.0, 1.05, 1.10, 1.15].forEach(r => el('text', { x: X(r), y: Y + 96, 'text-anchor': 'middle', 'font-size': 16 }, s, '×' + r.toFixed(2)));
    el('text', { x: X1, y: Y + 130, 'text-anchor': 'end', 'font-size': 16 }, s, 'wall time of soup train, ours over base');
    const mk = (r, color, top, bottom, cls) => {
      const g = el('g', { class: 'lim-mk ' + (cls || '') }, s);
      el('line', { x1: X(r), x2: X(r), y1: Y - 60, y2: Y + 60, stroke: color, 'stroke-width': 4 }, g);
      el('text', { x: X(r), y: Y - 108, 'text-anchor': 'middle', 'font-size': 22, fill: color }, g, top);
      if (bottom) el('text', { x: X(r), y: Y + 30 + 0, 'text-anchor': 'middle', 'font-size': 0 }, g, '');
      return g;
    };
    mk(1.0, C.ink, 'base 83.13 s');
    mk(90.07 / 83.13, C.ours, 'ours 90.07 s', 1, 'lim-ours');
    mk(1.136, C.base, 'previous main ×1.136', 1, 'lim-prev');
    // headroom bracket
    const hb = el('g', { class: 'lim-head' }, s);
    const xa = X(90.07 / 83.13), xb = X(1.10);
    el('path', { d: `M${xa},${Y + 40} L${xa},${Y + 52} L${xb},${Y + 52} L${xb},${Y + 40}`, stroke: C.ink, 'stroke-width': 2, fill: 'none' }, hb);
    el('text', { x: (xa + xb) / 2, y: Y + 78, 'text-anchor': 'middle', class: 't-ink', 'font-size': 18 }, hb, '1.37 s');
  })();

  // slide 9: where the 90 s go
  (function next() {
    const s = document.getElementById('next-svg');
    const X0 = 0, X1 = 1680, sMax = 100, X = v => X0 + v / sMax * (X1 - X0), y = 110, h = 80;
    el('rect', { x: X(0), y, width: X(24), height: h, fill: C.mech, 'fill-opacity': .35, stroke: C.mech, 'stroke-width': 1.5, class: 'nx-a' }, s);
    el('rect', { x: X(24), y, width: X(90.07) - X(24), height: h, fill: C.base, 'fill-opacity': .30, stroke: C.base, 'stroke-width': 1.5, class: 'nx-b' }, s);
    el('text', { x: X(12), y: y + 50, 'text-anchor': 'middle', class: 't-ink', 'font-size': 20 }, s, '~24 s start-up');
    el('text', { x: X(57), y: y + 50, 'text-anchor': 'middle', class: 't-ink', 'font-size': 20 }, s, 'training steps with recompute');
    const marks = [[83.13, C.ink, 'base 83.13 s', -26], [90.07, C.base, 'ours 90.07 s', -26], [83.13 / 1.05, C.ours, 'speed points from ≈ 79.2 s', 0]];
    marks.forEach(([v, c, t, o], i) => {
      const g = el('g', { class: 'nx-mk' }, s);
      el('line', { x1: X(v), x2: X(v), y1: i === 2 ? y : y - 50, y2: y + h + (i === 2 ? 70 : 20), stroke: c, 'stroke-width': 3, 'stroke-dasharray': i === 2 ? '6 6' : '' }, g);
      if (i === 2) el('text', { x: X(v) - 10, y: y + h + 64, 'text-anchor': 'end', fill: c, 'font-size': 20 }, g, t);
      else el('text', { x: X(v) + (i === 0 ? -10 : 10), y: y - 30, 'text-anchor': i === 0 ? 'end' : 'start', fill: c, 'font-size': 20 }, g, t);
    });
    for (let v = 0; v <= 90; v += 10) el('text', { x: X(v), y: y + h + 34, 'text-anchor': 'middle', 'font-size': 15 }, s, v === 80 ? '' : v + (v === 90 ? ' s' : ''));
  })();

  /* ---------- timelines ---------- */
  const E = 'power3.out';
  function counter(tl, node, from, to, dur, at, f) {
    const o = { v: from }, F = f || fmt;
    tl.fromTo(o, { v: from }, { v: to, duration: dur, ease: 'power2.inOut', onUpdate: () => { node.textContent = F(o.v); } }, at);
  }
  const builders = [
    function title(s, tl) {
      const base = s.querySelector('.bb-fill.base'), ours = s.querySelector('.bb-fill.ours');
      tl.from(s.querySelector('.team'), { opacity: 0, y: 16, duration: .6, ease: E })
        .from(base, { width: 0, duration: 1.4, ease: 'power2.inOut' }, .2);
      counter(tl, s.querySelector('#t-base'), 0, 14345, 1.4, .2);
      tl.from(s.querySelectorAll('.arrow, .unit'), { opacity: 0, duration: .4 }, 1.4)
        .fromTo(ours, { width: pct(14345) }, { width: pct(2541), duration: 1.6, ease: 'power3.inOut' }, 1.7);
      counter(tl, s.querySelector('#t-ours'), 14345, 2541, 1.6, 1.7);
      tl.from(s.querySelector('#t-ours'), { opacity: 0, duration: .3 }, 1.7)
        .from(s.querySelector('.lede'), { opacity: 0, y: 14, duration: .7, ease: E }, 3.1);
    },
    function task(s, tl) {
      tl.from(s.querySelectorAll('.spec-row'), { opacity: 0, x: -24, duration: .5, stagger: .08, ease: E })
        .from(s.querySelectorAll('#task-checks i'), { opacity: 0, scale: .4, duration: .3, stagger: .05, ease: 'back.out(2)' }, .6)
        .from(s.querySelectorAll('.formula, .formula-sub'), { opacity: 0, y: 10, duration: .6, ease: E }, .3);
      s.querySelectorAll('.sp-curve').forEach((p, i) => { const L = p.getTotalLength(); tl.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, .9 + i * .3); });
      tl.from(s.querySelector('.sp-us'), { opacity: 0, duration: .5 }, 2.6);
    },
    function memory(s, tl) {
      const t = s.querySelector('.lg-tensor');
      tl.from(t, { scaleX: 0.02, transformOrigin: '0 50%', duration: 1.3, ease: 'power3.inOut' })
        .from(s.querySelectorAll('.lg-math text'), { opacity: 0, y: 10, stagger: .25, duration: .5, ease: E }, 1.0)
        .from(s.querySelectorAll('.lg-copy'), { opacity: 0, y: -40, stagger: .18, duration: .5, ease: 'back.out(1.6)' }, 1.8)
        .from(s.querySelectorAll('.lg-copies > text'), { opacity: 0, duration: .4 }, 2.6)
        .from(s.querySelector('.seg-logit'), { width: 0, duration: 1.1, ease: 'power2.inOut' }, 2.8)
        .from(s.querySelector('.bb-range'), { opacity: 0, duration: .4 }, 3.7)
        .from(s.querySelector('.seg-act'), { width: 0, duration: 1.2, ease: 'power2.inOut' }, 3.9)
        .from(s.querySelector('.bb-peak'), { opacity: 0, duration: .5 }, 5.0);
    },
    function head(s, tl) {
      const win = s.querySelector('.hd-win'), vis = s.querySelectorAll('.hd-v'), bars = s.querySelectorAll('.hd-bar'), n = HEAD.chunks;
      tl.from(s.querySelector('.byline'), { opacity: 0, duration: .4 });
      const step = .32;
      for (let i = 0; i < n; i++) {
        const at = .4 + i * step;
        if (i === 0) tl.set(win, { attr: { transform: 'translate(0,0)' } }, 0);
        else tl.to(win, { attr: { transform: `translate(${i * HEAD.cw},0)` }, duration: step * .7, ease: 'power2.inOut' }, at);
        tl.from(vis[i], { attr: { 'fill-opacity': 0 }, duration: .2 }, at + step * .5);
        tl.fromTo(win.querySelectorAll('.hd-cell'), { opacity: .2 }, { opacity: 1, duration: .2, stagger: .004, immediateRender: false }, at + step * .2);
      }
      bars.forEach((b, k) => {
        const f = +b.dataset.final; const o = { w: 0 };
        tl.fromTo(b, { attr: { width: 4 } }, { attr: { width: f }, duration: n * step, ease: 'steps(' + n + ')' }, .4);
      });
      tl.from(s.querySelectorAll('.hd-formula text'), { opacity: 0, stagger: .2, duration: .4 }, .6)
        .from(s.querySelectorAll('#head-pipe li'), { opacity: 0, x: -20, stagger: .14, duration: .4, ease: E }, .4 + n * step)
        .from(s.querySelectorAll('.s-head .kernels li'), { opacity: 0, stagger: .05, duration: .3 }, .6 + n * step)
        .from(s.querySelector('#head-delta .delta-to'), { opacity: 0, y: 20, duration: .6, ease: E }, 1.2 + n * step)
        .from(s.querySelector('#head-delta .delta-from'), { opacity: 0, duration: .4 }, .9 + n * step);
    },
    function body(s, tl) {
      const cols = BODY.cols, n = cols.length, f = .07;
      tl.from(s.querySelector('.byline'), { opacity: 0, duration: .4 });
      const traces = s.querySelectorAll('.bd-trace');
      traces.forEach(p => { const L = p.getTotalLength(); tl.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: n * f * 2 + .4, ease: 'none' }, .4); });
      cols.forEach((c, i) => {
        tl.from(c.querySelector('.bd-ghost'), { opacity: 0, duration: .2 }, .4 + i * f)
          .from(c.querySelector('.bd-keep'), { opacity: 0, duration: .2 }, .4 + i * f);
      });
      const bstart = .4 + n * f + .2;
      cols.slice().reverse().forEach((c, j) => {
        const re = c.querySelector('.bd-re');
        tl.fromTo(re, { opacity: 0 }, { opacity: 1, duration: .12, immediateRender: false }, bstart + j * f)
          .to(re, { opacity: 0, duration: .25 }, bstart + j * f + .14);
      });
      tl.from(s.querySelectorAll('.recipe .eq div'), { opacity: 0, x: -16, stagger: .3, duration: .4, ease: E }, bstart + n * f + .2)
        .from(s.querySelectorAll('.s-body .kernels li'), { opacity: 0, stagger: .06, duration: .3 }, bstart + n * f + .4)
        .from(s.querySelector('#body-delta .delta-from'), { opacity: 0, duration: .4 }, bstart + n * f + .8)
        .from(s.querySelector('#body-delta .delta-to'), { opacity: 0, y: 20, duration: .6, ease: E }, bstart + n * f + 1.1);
    },
    function results(s, tl) {
      const fills = s.querySelectorAll('.bb-fill');
      tl.from(fills[0], { width: 0, duration: 1.2, ease: 'power2.inOut' })
        .from(fills[1], { width: 0, duration: 0.8, ease: 'power2.inOut' }, .5)
        .from(s.querySelector('.bb-mark'), { opacity: 0, duration: .4 }, 1.3)
        .from(s.querySelectorAll('.rb-val'), { opacity: 0, duration: .4 }, .9)
        .from(s.querySelectorAll('.fig'), { opacity: 0, y: 20, stagger: .12, duration: .5, ease: E }, 1.2)
        .from(s.querySelectorAll('#res-checks i'), { scale: 0, stagger: .05, duration: .25, ease: 'back.out(2)' }, 1.6)
        .from(s.querySelector('.share-fill'), { width: 0, duration: .8, ease: E }, 1.8);
      counter(tl, s.querySelector('.fig-m .fig-n'), 1, 5.6454, 1.1, 1.2, v => v.toFixed(4));
    },
    function process(s, tl) {
      tl.from(s.querySelectorAll('#loop span'), { opacity: 0, x: -14, stagger: .12, duration: .35, ease: E })
        .from(s.querySelectorAll('.proc-facts > div'), { opacity: 0, y: 14, stagger: .15, duration: .4, ease: E }, .5);
      const dots = s.querySelectorAll('.lg-dots circle'), T = 2.6;
      dots.forEach(d => tl.from(d, { attr: { r: 0 }, duration: .25, ease: 'back.out(3)' }, .4 + (+d.dataset.t) / 32 * T));
      const fr = s.querySelector('.lg-front'), L = fr.getTotalLength();
      tl.fromTo(fr, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: T + .2, ease: 'none' }, .4)
        .from(s.querySelector('.lg-note'), { opacity: 0, duration: .5 }, .6 + T);
    },
    function limits(s, tl) {
      tl.from(s.querySelectorAll('.lim-zones rect'), { scaleX: 0, transformOrigin: '0 50%', stagger: .2, duration: .6, ease: E })
        .from(s.querySelectorAll('.lim-zones text'), { opacity: 0, stagger: .2, duration: .4 }, .4)
        .from(s.querySelectorAll('.lim-mk'), { opacity: 0, y: -30, stagger: .35, duration: .5, ease: 'back.out(1.6)' }, 1.0)
        .from(s.querySelector('.lim-head'), { opacity: 0, duration: .5 }, 2.2)
        .from(s.querySelectorAll('.lim-grid > div'), { opacity: 0, y: 16, stagger: .15, duration: .5, ease: E }, 2.4);
    },
    function next(s, tl) {
      tl.from(s.querySelector('.nx-a'), { attr: { width: 0 }, duration: .7, ease: E })
        .from(s.querySelector('.nx-b'), { attr: { width: 0 }, duration: 1.0, ease: E }, .5)
        .from(s.querySelectorAll('.nx-mk'), { opacity: 0, stagger: .3, duration: .4 }, 1.3)
        .from(s.querySelectorAll('.next-grid > div'), { opacity: 0, y: 16, stagger: .15, duration: .5, ease: E }, 2.0);
    },
    function end(s, tl) {
      tl.from(s.querySelectorAll('.people > div, .links > div'), { opacity: 0, y: 14, stagger: .12, duration: .5, ease: E })
        .fromTo(s.querySelector('.bb-fill.ours'), { width: pct(14345) }, { width: pct(2541), duration: 1.4, ease: 'power3.inOut' }, .5);
    }
  ];

  /* ---------- navigation ---------- */
  const stage = document.getElementById('stage');
  const pageno = document.querySelector('.pageno');
  const miniFill = document.querySelector('.mini-fill'), miniBase = document.querySelector('.mini-base'), miniVal = document.querySelector('.mini-val'), mini = document.querySelector('.mini');
  miniBase.style.width = pct(14345);
  let cur = -1, ctx = null;

  function fit() { const k = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = `scale(${k})`; document.getElementById('chrome').style.cssText = ''; }
  function setMini(i, animate) {
    const m = slides[i].dataset.mem ? +slides[i].dataset.mem : 0;
    mini.style.opacity = (i === 0 || i === slides.length - 1) ? 0 : 1;
    miniFill.classList.toggle('is-base', m >= 14345);
    miniVal.textContent = fmt(m) + ' MiB';
    gsap.to(miniFill, { width: pct(m), duration: animate ? .8 : 0, ease: 'power2.inOut' });
  }
  function show(n, progress) {
    const i = Math.max(0, Math.min(slides.length - 1, n - 1));
    if (ctx) { ctx.revert(); ctx = null; }
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    const s = slides[i];
    ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      builders[i](s, tl);
      if (progress != null) tl.progress(progress);
      else if (REDUCED) tl.progress(1);
      else tl.play(0);
    }, s);
    setMini(i, cur !== -1 && progress == null && !REDUCED);
    cur = i;
    pageno.textContent = String(i + 1).padStart(2, '0') + ' / ' + slides.length;
    if (location.hash !== '#' + (i + 1)) history.replaceState(null, '', '#' + (i + 1));
  }
  function go(d) { show(cur + 1 + d); }

  window.DECK = {
    count: slides.length,
    show,
    overflow(n) {
      const s = slides[n - 1], out = [];
      const box = { l: 0, t: 0, r: 1920, b: 1080 };
      const k = stage.getBoundingClientRect().width / 1920, o = stage.getBoundingClientRect();
      s.querySelectorAll('h2, h3, p, li, .spec-row, .fig, .delta, .formula, .links div, .pn, svg, .bigbar, .legend').forEach(e => {
        const r = e.getBoundingClientRect();
        const l = (r.left - o.left) / k, t = (r.top - o.top) / k, rr = (r.right - o.left) / k, bb = (r.bottom - o.top) / k;
        if (rr > box.r - 100 + 2 || l < 100 || bb > 1010 || t < 40) out.push({ slide: n, el: e.tagName + '.' + (e.className.baseVal ?? e.className), l: Math.round(l), t: Math.round(t), r: Math.round(rr), b: Math.round(bb) });
        if (e.scrollWidth > e.clientWidth + 2 && !(e instanceof SVGElement)) out.push({ slide: n, el: e.tagName + '.' + e.className, scroll: [e.scrollWidth, e.clientWidth] });
      });
      return out;
    }
  };

  if (PRINT) {
    document.body.classList.add('print');
    slides.forEach((s, k) => { const p = document.createElement('span'); p.className = 'pg-print'; p.textContent = String(k + 1).padStart(2, '0') + ' / ' + slides.length; s.appendChild(p); });
    return;
  }
  addEventListener('resize', fit); fit();
  addEventListener('keydown', e => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') show(1); else if (e.key === 'End') show(slides.length);
  });
  addEventListener('click', e => { if (e.target.closest('a')) return; go(e.clientX < innerWidth * 0.25 ? -1 : 1); });
  addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10); if (n && n - 1 !== cur) show(n); });
  const start = parseInt(location.hash.slice(1), 10) || 1;
  show(start, FREEZE ? 1 : null);
})();
