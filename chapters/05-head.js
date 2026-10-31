/* Chapter 05: head. Cut 1: the 151,936-wide logits never exist.
   Mechanism, as in solution/head/kernels.py (_LinearCEStats):
   - vocabulary is the OUTER loop: 5 slices of <= 32,768 columns (the last one 20,864);
     each frozen weight slice is cast to fp16 once (<= 96 MiB at H 1536), then released;
   - token chunks of 128 rows are the INNER loop: torch.mm (cuBLAS) makes one fp16 logit
     tile <= 128 x 32,768 = 8 MiB; own Triton kernels fold it into 5 running numbers per
     position (maximum, exp_sum, weighted_sum, target_logit, argmax) and the tile is freed;
   - head_stats_finish_kernel turns them into loss, entropy and the saved LSE;
   - backward repeats the sweep and splits each FP32 derivative d into fp16 hi plus a
     power-of-two-scaled fp16 lo (row scale S = 2^(12 - floor(log2 max|r|))).
   Numbers: docs/submission-facts.md (4 x 512 x 151,936 = 311 M values, 1.24 GB per FP32
   copy, est. 5-7 GB of copies; FP64 check rtol 0.01 / atol 0.003) and solution/head/SPEC.md.
   The worked example d = 0.001234568 is real FP32/fp16 arithmetic (numpy): half(d) = 0.001235,
   r = -4.4028e-7, S = 2^34, lo = half(r*S) = -7564, hi + lo/S == d exactly in FP32. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const V = 151936, VCH = 32768, NB = 16;                 // vocab, vocab chunk, token chunks (2,048 / 128)
  const EDGES = [0, 32768, 65536, 98304, 131072, 151936];
  const NC = EDGES.length - 1, NT = NC * NB;              // 5 slices x 16 chunks = 80 tiles
  const KI = 2 * NB + 11, PK = KI + 0.999;                // keyframe: slice 3 of 5, token chunk 12 of 16
  // geometry (stage px)
  const MX = 120, MW = 1210, MY = 290, BH = 18, MH = NB * BH; // the never-allocated matrix
  const SX = 1452, SCW = 52, SGAP = 12;                   // the per-position state strip
  const SV = ['max', 'Σexp', 'Σexp·z', 'target', 'argmax'];
  const vx = v => MX + MW * v / V;
  const C0 = { bg: '#0B0F14', ink: '#E8EDF2', dim: '#8A96A3', base: '#FF5A36', ours: '#2EE6A6', mech: '#5B8CFF', line: '#1E2833', panel: '#121922' };
  const E = 'power3.out', IO = 'power2.inOut';
  let N = null;
  // Box. 04-where leaves weights 2,048 (est.) + logit copies 5,935 (est.) + activations 6,362 (est.).
  // Here the logit-copies block dissolves first, then the box settles on the MEASURED milestone
  // 5,283 MiB (ledger: + streamed head, on top of body MLP recompute 9,661). The readout never rests on
  // an invented "14,345 minus estimate" number. 06-body collapses 'acts' from here.
  const W_MIB = 2048, L_MIB = 5 * 1187, A04 = 14345 - W_MIB - L_MIB, MEAS = 5283;
  const ACOL = '#D9482B';
  const BOX_MID = [
    { key: 'weights', mib: W_MIB, color: 'dim', label: 'weights', est: true },
    { key: 'logits', mib: 0, color: 'base', label: 'logit copies', est: true },
    { key: 'acts', mib: A04, color: ACOL, label: 'activations, 28 layers', est: true },
  ];
  const BOX = [
    { key: 'weights', mib: W_MIB, color: 'dim', label: 'weights', est: true },
    { key: 'acts', mib: MEAS - W_MIB, color: ACOL, label: 'activations, 28 layers', est: true },
  ];

  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const tilePos = i => { const c = Math.floor(i / NB), b = i % NB; return { c, b, x: vx(EDGES[c]), w: vx(EDGES[c + 1]) - vx(EDGES[c]), y: MY + b * BH }; };

  function build(root, api) {
    const C = (api && api.C) || C0;
    const svg = root.querySelector('.hd-svg');
    const defs = el('defs', {}, svg);
    const fl = el('filter', { id: 'hd-blur', x: '-20%', y: '-200%', width: '140%', height: '500%' }, defs);
    el('feGaussianBlur', { stdDeviation: 7 }, fl);
    const n = N = { root };
    n.h = root.querySelector('.hd-h');
    n.sub = root.querySelector('.hd-sub');

    // ---------- forward ----------
    n.fwdH = el('text', { x: MX, y: 230, class: 'sans hd-sec' }, svg, 'Forward: one tile of logits at a time, folded into running numbers');

    // frozen weight slice above the matrix
    n.wLbl = el('text', { x: MX, y: 266, 'font-size': 15 }, svg, 'frozen weight: one fp16 slice at a time, ≤ 96 MiB');
    n.wBar = el('rect', { x: MX, y: 274, width: 10, height: 8, fill: C.mech, 'fill-opacity': 0.75 }, svg);

    // the ghost: 2,048 x 151,936, never allocated
    n.ghost = el('g', {}, svg);
    n.gRect = el('rect', { x: MX, y: MY, width: MW, height: MH, fill: C.base, 'fill-opacity': 0.035, stroke: C.base, 'stroke-opacity': 0.75, 'stroke-width': 1.5, 'stroke-dasharray': '7 7' }, n.ghost);
    n.bands = el('g', {}, svg);
    for (let b = 1; b < NB; b++) el('line', { x1: MX, x2: MX + MW, y1: MY + b * BH, y2: MY + b * BH, stroke: C.line, 'stroke-width': 1 }, n.bands);
    n.cuts = el('g', {}, svg);
    for (let c = 1; c < NC; c++) el('line', { x1: vx(EDGES[c]), x2: vx(EDGES[c]), y1: MY - 4, y2: MY + MH + 4, stroke: C.dim, 'stroke-opacity': 0.55, 'stroke-width': 1.5 }, n.cuts);
    n.ticks = el('g', {}, svg);
    EDGES.forEach((v, k) => el('text', { x: vx(v), y: MY + MH + 26, 'font-size': 15, 'text-anchor': k === 0 ? 'start' : k === NC ? 'end' : 'middle' }, n.ticks, api && api.fmt ? api.fmt(v) : v.toLocaleString('en-US')));
    n.rows = el('text', { x: MX - 18, y: MY + MH / 2, 'font-size': 15, 'text-anchor': 'middle', transform: `rotate(-90 ${MX - 18} ${MY + MH / 2})` }, svg, '2,048 positions');
    n.gT1 = el('text', { x: MX + MW * 0.40, y: MY + 84, 'text-anchor': 'middle', class: 'sans', 'font-size': 34, 'font-weight': 600, fill: C.base, stroke: C.bg, 'stroke-width': 10, 'paint-order': 'stroke' }, svg, '2,048 × 151,936 = 311 M logits');
    n.gT2 = el('text', { x: MX + MW * 0.40, y: MY + 122, 'text-anchor': 'middle', class: 'sans', 'font-size': 22, fill: C.base, stroke: C.bg, 'stroke-width': 8, 'paint-order': 'stroke' }, svg, '1.24 GB per FP32 copy. Never allocated.');

    // the live tile (+ the freed one fading behind it)
    n.trail = el('rect', { x: 0, y: 0, width: 10, height: BH, fill: 'none', stroke: C.mech, 'stroke-width': 1.5, opacity: 0 }, svg);
    n.tile = el('g', {}, svg);
    n.tGlow = el('rect', { x: 0, y: 0, width: 10, height: BH + 16, fill: C.mech, 'fill-opacity': 0.16, filter: 'url(#hd-blur)' }, n.tile);
    n.tRect = el('rect', { x: 0, y: 0, width: 10, height: BH, fill: C.mech, 'fill-opacity': 0.45, stroke: '#9DB8FF', 'stroke-width': 2.5 }, n.tile);
    n.cells = [];
    for (let j = 0; j < 30; j++) n.cells.push(el('rect', { x: 0, y: 0, width: 5, height: 5, fill: '#CFE0FF' }, n.tile));
    n.path = el('path', { d: '', fill: 'none', stroke: C.mech, 'stroke-width': 1.5, 'stroke-dasharray': '3 5', 'stroke-opacity': 0.8 }, svg);
    n.beam = el('line', { x1: 0, x2: SX - 8, y1: 0, y2: 0, stroke: C.mech, 'stroke-width': 1.5, 'stroke-opacity': 0.7 }, svg);
    n.beamDot = el('circle', { cx: SX - 8, cy: 0, r: 3.5, fill: C.mech }, svg);

    // the tile callout: the only logits that ever exist
    n.call = el('g', {}, svg);
    el('text', { x: vx(EDGES[2]), y: MY + MH + 58, 'font-size': 17, fill: C.mech }, n.call, 'the only logits that ever exist: one tile, ≤ 128 × 32,768, 8 MiB');

    // the per-position state strip, rows aligned with the matrix
    n.strip = el('g', {}, svg);
    el('text', { x: SX, y: 248, class: 'sans', 'font-size': 18, fill: C.ink }, n.strip, '5 numbers per position');
    SV.forEach((s, k) => el('text', { x: SX + k * (SCW + SGAP) + SCW / 2, y: 278, 'font-size': 14, 'text-anchor': 'middle' }, n.strip, s));
    n.sCells = [];
    for (let b = 0; b < NB; b++) {
      const row = [];
      for (let k = 0; k < SV.length; k++) {
        const x = SX + k * (SCW + SGAP), y = MY + b * BH + 2;
        el('rect', { x, y, width: SCW, height: BH - 4, fill: C.line }, n.strip);
        row.push(el('rect', { x, y, width: 0, height: BH - 4, fill: C.mech, 'fill-opacity': 0.85 }, n.strip));
      }
      n.sCells.push(row);
    }
    // online merge, then finish
    el('text', { x: SX, y: MY + MH + 22, 'font-size': 13 }, n.strip, 'bar: share of the vocabulary folded in');
    n.f1 = el('text', { x: SX, y: MY + MH + 50, 'font-size': 18, fill: C.ink }, svg, "m' = max(m, max z)");
    n.f2 = el('text', { x: SX, y: MY + MH + 76, 'font-size': 18, fill: C.ink }, svg, "s' = s·e^(m−m') + Σ e^(z−m')");
    n.k1 = el('text', { x: SX, y: MY + MH + 100, 'font-size': 13 }, svg, 'head_stats_partial, head_online_merge');
    n.fin = el('text', { x: SX, y: MY + MH + 120, 'font-size': 13 }, svg);
    n.finK = el('tspan', { fill: C.dim }, n.fin, 'head_stats_finish → ');
    el('tspan', { fill: C.ours }, n.fin, 'loss, entropy, accuracy');

    // ---------- backward ----------
    const BY = 726;
    n.bwdH = el('text', { x: MX, y: BY, class: 'sans hd-sec' }, svg, 'Backward: the same sweep, each gradient value split into two fp16 halves');
    // d = hi + lo / 2^34, real FP32/fp16 arithmetic
    const EY = BY + 58, F = 30, cw = F * 0.6;
    n.eq = el('g', {}, svg);
    let x = MX;
    const put = (str, fill, key, sub, gap = 0) => {
      const t = el('text', { x, y: EY, 'font-size': F, fill }, n.eq, str);
      const g = { t, x0: x };
      if (sub) g.sub = el('text', { x, y: EY + 30, 'font-size': 15 }, n.eq, sub);
      let w = str.length * cw;
      try { const m = t.getComputedTextLength(); if (m > 0) w = m; } catch (e) { /* not laid out */ }
      x += w + gap;
      n[key] = g;
      return g;
    };
    put('0.001234568', C.ink, 'eD', 'FP32 gradient', 22);
    put('=', C.dim, 'eEq', null, 22);
    put('0.001235', C.mech, 'eHi', 'fp16 high', 22);
    put('−', C.dim, 'ePl', null, 22);
    const lo = put('7,564 / 2', C.ours, 'eLo', 'fp16 low, scaled');
    el('tspan', { dy: -12, 'font-size': 19 }, lo.t, '34');
    n.eNote = el('text', { x: MX, y: EY + 64, class: 'sans', 'font-size': 18 }, n.eq, 'fp16 alone is off by 0.04%; the pair is exact in FP32');

    // products
    const PX = 900;
    n.prod = el('g', {}, svg);
    el('text', { x: PX, y: EY, 'font-size': 24, fill: C.ink }, n.prod, 'hi·W + lo·W / S');
    el('text', { x: PX, y: EY + 30, class: 'sans', 'font-size': 18 }, n.prod, 'two cuBLAS products, summed in FP32');
    n.prodK = [
      el('text', { x: PX, y: EY + 58, 'font-size': 13 }, n.prod, 'head_residual_max, head_residual_scale,'),
      el('text', { x: PX, y: EY + 76, 'font-size': 13 }, n.prod, 'head_ce_compensated, head_accumulate_compensated'),
    ];

    // independent check
    const KX = 1452, KY = BY - 6, KW = 1800 - KX, KH = 124;
    n.chk = el('g', {}, svg);
    el('rect', { x: KX, y: KY, width: KW, height: KH, fill: C.panel, stroke: C.line, 'stroke-width': 1.5, rx: 4 }, n.chk);
    el('text', { x: KX + 22, y: KY + 36, class: 'sans', 'font-size': 18, fill: C.ink }, n.chk, 'vs independent FP64 autograd');
    el('text', { x: KX + 22, y: KY + 72, 'font-size': 20, fill: C.ink }, n.chk, 'rtol 0.01   atol 0.003');
    n.pass = el('g', {}, n.chk);
    n.tick = el('path', { d: `M ${KX + 24} ${KY + 100} l 7 7 l 13 -15`, fill: 'none', stroke: C.ours, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, n.pass);
    n.passT = el('text', { x: KX + 54, y: KY + 108, 'font-size': 20, fill: C.ours }, n.pass, 'passes');

    // measured milestone, beside the box readout (box zone, allowed)
    n.ms = el('g', { 'data-allow-box-zone': '' }, svg);
    n.msT = el('text', { x: 330, y: 919, class: 'sans', 'font-size': 17 }, n.ms);
    el('tspan', { fill: C.base, 'font-family': 'var(--mono)' }, n.msT, '14,345');
    el('tspan', { fill: C.dim }, n.msT, ' → ');
    el('tspan', { fill: C.ink, 'font-family': 'var(--mono)' }, n.msT, '5,283 MiB');
    el('tspan', { fill: C.dim }, n.msT, ': streamed head on top of the first body recompute (head alone: ');
    el('tspan', { fill: C.base, 'font-family': 'var(--mono)' }, n.msT, '9,661');
    el('tspan', { fill: C.dim }, n.msT, ' → ');
    el('tspan', { fill: C.ink, 'font-family': 'var(--mono)' }, n.msT, '5,283');
    el('tspan', { fill: C.dim }, n.msT, ')');

    render(PK);   // keyframe: the window mid-sweep, slice 3 of 5
  }

  // p in [0, NT]: tiles processed. Seek-safe: everything is a pure function of p.
  function render(p) {
    const n = N;
    const i = Math.max(0, Math.min(NT - 1, Math.floor(p)));
    const f = Math.min(1, p - i);
    const t = tilePos(i);
    n.tRect.setAttribute('x', t.x); n.tRect.setAttribute('y', t.y); n.tRect.setAttribute('width', t.w);
    n.tGlow.setAttribute('x', t.x - 6); n.tGlow.setAttribute('y', t.y - 8); n.tGlow.setAttribute('width', t.w + 12);
    // where it goes next: down through the remaining positions of this slice
    const mx = Math.round(t.x + t.w / 2) + 0.5, yb = t.y + BH + 3;
    n.path.setAttribute('d', yb < MY + MH - 6 ? `M${mx},${yb}V${MY + MH - 4}M${mx - 5},${MY + MH - 10}L${mx},${MY + MH - 4}L${mx + 5},${MY + MH - 10}` : '');
    // fresh logits in every tile: deterministic texture from the tile index
    const cols = 15, cwid = (t.w - 8) / cols;
    n.cells.forEach((r, j) => {
      const cx = j % cols, cy = Math.floor(j / cols);
      r.setAttribute('x', t.x + 4 + cx * cwid + 1); r.setAttribute('y', t.y + 3 + cy * 6.5);
      r.setAttribute('width', Math.max(1, cwid - 3)); r.setAttribute('height', 5);
      r.setAttribute('opacity', (0.08 + 0.7 * Math.pow(hash(i, j), 2)).toFixed(3));
    });
    // the previous tile: freed, its outline fades out
    if (i > 0 && f < 0.99) {
      const q = tilePos(i - 1);
      n.trail.setAttribute('x', q.x); n.trail.setAttribute('y', q.y); n.trail.setAttribute('width', q.w);
      n.trail.setAttribute('opacity', (0.55 * Math.max(0, 1 - f * 1.6)).toFixed(3));
    } else n.trail.setAttribute('opacity', 0);
    n.wBar.setAttribute('x', t.x); n.wBar.setAttribute('width', t.w);
    const by = t.y + BH / 2;
    n.beam.setAttribute('x1', t.x + t.w); n.beam.setAttribute('y1', by); n.beam.setAttribute('y2', by);
    n.beamDot.setAttribute('cy', by);
    // state: how much of the vocabulary each position has already folded in
    for (let b = 0; b < NB; b++) {
      const k = t.c + ((b < t.b || (b === t.b && f >= 0.5)) ? 1 : 0);
      n.sCells[b].forEach(r => r.setAttribute('width', (SCW * k / NC).toFixed(2)));
    }
  }

  // One sequence, two clocks: the deck uses fixed cue times, the video uses word times.
  function seq(api, T, tl) {
    const n = N, st = { p: 0 };
    render(0);
    const fade = (els, at, d = 0.5, extra = {}) => tl.fromTo(els, { opacity: 0, ...extra.from }, { opacity: 1, duration: d, ease: E, ...extra.to }, at);
    tl.fromTo([n.h, n.sub], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: E }, T.title);
    // the matrix the base would allocate: drawn as a ghost
    fade(n.fwdH, T.ghost, 0.5);
    tl.fromTo(n.gRect, { attr: { width: 0 } }, { attr: { width: MW }, duration: T.ghostDur, ease: IO }, T.ghost);
    fade([n.rows, n.gT1, n.gT2], T.ghost + T.ghostDur * 0.6, 0.6);
    tl.fromTo(n.bands.children, { attr: { x2: MX } }, { attr: { x2: MX + MW }, duration: T.ghostDur, ease: IO }, T.ghost);
    // cut into vocabulary slices
    tl.fromTo(n.cuts.children, { attr: { y2: MY - 4 } }, { attr: { y2: MY + MH + 4 }, duration: 0.6, stagger: 0.08, ease: IO }, T.cut);
    fade(n.ticks, T.cut + 0.1, 0.6);
    fade([n.wLbl, n.wBar], T.tile, 0.4);
    fade([n.tile, n.path], T.tile, 0.3);
    fade(n.strip, T.strip, 0.6);
    fade([n.beam, n.beamDot], T.strip + 0.2, 0.4);
    // the ghost labels dim while the sweep runs, so the tile is the subject
    tl.fromTo([n.gT1, n.gT2], { attr: { 'fill-opacity': 1 } }, { attr: { 'fill-opacity': 0.35 }, duration: 0.6 }, T.sweep);
    // the sweep: first slice slow enough to read, then the rest
    tl.fromTo(st, { p: 0 }, { p: NB, duration: T.sweep1, ease: 'none', onUpdate: () => render(st.p), immediateRender: false }, T.sweep);
    tl.fromTo(st, { p: NB }, { p: PK, duration: T.sweep2, ease: 'power1.in', onUpdate: () => render(st.p), immediateRender: false }, T.sweep + T.sweep1);
    fade(n.f1, T.f1, 0.5); fade(n.f2, T.f2, 0.5); fade(n.k1, T.f2 + 0.3, 0.5);
    const end = T.sweep + T.sweep1 + T.sweep2;
    tl.fromTo([n.gT1, n.gT2], { attr: { 'fill-opacity': 0.35 } }, { attr: { 'fill-opacity': 1 }, duration: 0.6, immediateRender: false }, Math.max(end, T.never));
    fade(n.call, Math.max(end, T.never) + 0.15, 0.6, { from: { x: 12 }, to: { x: 0 } });
    fade(n.fin, end + 0.1, 0.5);
    // backward: split the gradient
    fade(n.bwdH, T.bwd, 0.5);
    fade([n.eD.t, n.eD.sub], T.bwd + 0.25, 0.5);
    fade([n.eEq.t, n.eHi.t, n.eHi.sub], T.hi, 0.5, { from: { y: -10 }, to: { y: 0 } });
    fade([n.ePl.t, n.eLo.t, n.eLo.sub], T.lo, 0.5, { from: { y: 10 }, to: { y: 0 } });
    fade(n.eNote, T.lo + 0.5, 0.5);
    fade(n.prod, T.prod, 0.6);
    fade(n.chk, T.chk, 0.5);
    const len = 40;
    tl.fromTo(n.tick, { attr: { 'stroke-dasharray': len, 'stroke-dashoffset': len } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.4, ease: E }, T.pass);
    fade(n.passT, T.pass + 0.15, 0.4);
    // the box: the logit-copies block dissolves
    if (api.box && api.box.to) {
      tl.add(api.box.to(BOX_MID, { duration: T.boxDur * 0.6, ease: 'power2.in' }), T.box);
      tl.add(api.box.to(BOX, { duration: T.boxDur * 0.4, ease: 'power2.out' }), T.box + T.boxDur * 0.6);
    }
    fade(n.ms, T.box + T.boxDur + 0.05, 0.5);
    return tl;
  }


  const DECK_T = {
    title: 0, ghost: 0.15, ghostDur: 0.7, cut: 0.65, tile: 1.1, strip: 1.1,
    sweep: 1.3, sweep1: 1.1, sweep2: 1.6, f1: 1.4, f2: 1.7, never: 4.0,
    bwd: 4.0, hi: 4.45, lo: 4.75, prod: 5.1, chk: 5.3, pass: 5.6, box: 4.6, boxDur: 1.4,
  };

  const CH = {
    n: 5, id: 'head',
    title: 'Cut 1: the 151,936-wide logits never exist.',
    box: BOX,
    html: `
      <h2 class="hd-h">Cut 1: the 151,936-wide logits never exist.</h2>
      <p class="hd-sub">Seven own Triton kernels. Ideas from Liger fused linear CE and Apple Cut Cross-Entropy; the code is ours.</p>
      <svg class="hd-svg" viewBox="0 0 1920 1080" aria-hidden="true"></svg>`,
    css: `
      .ch-head .hd-h { position: absolute; left: 120px; top: 70px; margin: 0; }
      .ch-head .hd-sub { position: absolute; left: 120px; top: 148px; font-size: 22px; max-width: 1500px; }
      .ch-head .hd-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; }
      .ch-head .hd-svg .sans { font-family: var(--sans, "Onest"), system-ui, sans-serif; }
      .ch-head .hd-svg .hd-sec { font-size: 26px; font-weight: 600; fill: #E8EDF2; letter-spacing: -0.01em; }
    `,
    build,
    enter(root, api) {
      const tl = gsap.timeline();
      return seq(api, DECK_T, tl);
    },
    video(root, api, seg) {
      const w = (s, k = 0, fb = 0) => { try { const t = api.word(seg, s, k); return (t == null || isNaN(t)) ? fb : t; } catch (e) { return fb; } };
      const o = seg.voiceOffset || 0;
      const tKusk = w('кусками', 0, 3.15 + o);
      const tYadro = w('Ядро', 0, 3.94 + o);
      const tMax = w('максимум', 0, 5.57 + o);
      const tSum = w('сумму', 0, 6.24 + o);
      const tNe = w('появляется', 0, 8.65 + o);
      const tGrad = w('Градиент', 0, 9.54 + o);
      const tComp = w('компенсацией', 0, 10.46 + o);
      const tOsh = w('ошибки', 0, 11.07 + o);
      const tEt = w('эталоном', 0, 12.12 + o);
      const tChet = w('четыре', 0, 13.36 + o);
      const tSnyalo = w('сняло', 0, 14.63 + o);
      const T = {
        title: 0, ghost: 0.35, ghostDur: 1.2, cut: w('словарь', 0, 2.8 + o) - 0.1, tile: tKusk + 0.1, strip: tYadro,
        sweep: tYadro + 0.3, sweep1: tSum - tYadro + 0.1, sweep2: 0, f1: tMax, f2: tSum, never: tNe - 0.2,
        bwd: tGrad - 0.1, hi: tComp, lo: tOsh, prod: tOsh + 0.6, chk: tEt - 0.1, pass: tChet,
        box: tSnyalo - 0.2, boxDur: 1.6,
      };
      T.sweep2 = Math.max(1.2, (tNe - 0.2) - (T.sweep + T.sweep1));
      const tl = gsap.timeline({ paused: true });
      // video only: no kernel-name rows (the deck keeps them)
      [N.k1, N.finK, ...N.prodK].forEach(e => e.setAttribute('display', 'none'));
      seq(api, T, tl);
      // exact segment length
      tl.set({}, {}, seg.duration);
      if (tl.duration() > seg.duration + 1e-6) console.warn('head: timeline longer than segment', tl.duration(), seg.duration);
      return tl;
    },
  };
  Deck.chapter(CH);
})();
