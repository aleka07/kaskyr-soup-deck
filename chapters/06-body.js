/* Chapter 6, body: "Cut 2: forget a layer's activations, rebuild them exactly."
   One argument, three acts, all on one stage:
   1. 28 decoder layers. Forward: the base keeps every layer's activations (orange columns);
      we keep only each layer's input (green sliver) and the box collapses.
   2. Backward walks 28 -> 1 and rebuilds one layer at a time (blue), uses it, frees it.
      The walk parks on layer 9, and the lens opens that layer: which ops replay, where our
      Triton kernels run (NF4 decode, RMSNorm, RoPE).
   3. The FP32 residual sum h = x + attn is rebuilt from the kept x and the kept FP16 branch;
      the 32 bits are computed here in JS with real IEEE arithmetic and compared to the
      bits the base would have stored: 32 of 32 equal.
   Mechanism sources: solution/body/{mlp_recompute,attention_recompute,norm_input_recompute,
   residual_recipe,nf4_backward,rmsnorm,rope}.py (module docstrings).
   The build() state IS the keyframe; enter()/video() set the start state at t=0 and animate into it. */
(function () {
  'use strict';
  const ID = 'body';
  const N = 28;                    // decoder layers
  const PARK = 9;                  // the layer the backward walk stops on (1-based)
  // strip geometry (stage px)
  const SX0 = 120, SX1 = 1800, COLW = 44, PITCH = (SX1 - SX0 - COLW) / (N - 1);
  const CT = 300, CB = 492, CH = CB - CT, SLV = 14;      // column top/bottom/height, kept-input sliver
  const colX = i => SX0 + i * PITCH;                       // i: 0-based
  // lower band
  const LY = 630;                  // top of the lens panels

  // Real IEEE arithmetic for the bit panel: x is an FP32 residual value, a is an FP16
  // attention-branch value (exactly representable: 1.33984375 * 2^-5), h = fl32(x + a).
  const X32 = Math.fround(-1.8370361);
  const A16 = 0.0418701171875;
  const H32 = Math.fround(X32 + A16);
  function bits32(v) { const f = new Float32Array([v]); return new Uint32Array(f.buffer)[0].toString(2).padStart(32, '0'); }
  function bits16(v) { // exact for normal fp16 values with <= 10 mantissa bits (A16 is one)
    const s = v < 0 ? 1 : 0; v = Math.abs(v);
    let e = Math.floor(Math.log2(v)); const m = Math.round((v / Math.pow(2, e) - 1) * 1024);
    return String(s) + (e + 15).toString(2).padStart(5, '0') + m.toString(2).padStart(10, '0');
  }
  const BX = bits32(X32), BA = bits16(A16), BH = bits32(H32);

  // Box at the keyframe: the activations block collapses; what is left is the measured peak.
  // ch5 hands over { weights 2,048 est., acts 3,235 est. } = 5,283; ch7 starts from { key: 'ours', 2,479 }. We collapse 'acts'
  // to 2,479 (still orange), then swap to 'ours' on landing (it turns green) so the hand-off to ch7 does not cross-fade.
  // The weights block (2,048 est., from ch4/ch5) stays; only the activations block collapses.
  const W_MIB = 2048, ACOL = '#D9482B';
  const COLLAPSE = [
    { key: 'weights', mib: W_MIB, color: 'dim', label: 'weights', est: true },
    { key: 'acts', mib: 2479 - W_MIB, color: ACOL, label: 'activations, 28 layers', est: true },
  ];
  const BOX = [{ key: 'ours', mib: 2479, color: 'ours', label: 'ours' }];

  const css = `
.ch-body h2 { width: 1500px; }
.ch-body .bd-by { position: absolute; right: 120px; top: 165px; font-size: 22px; color: var(--dim); text-align: right; }
.ch-body .bd-by code { color: var(--ink); font-size: 20px; }
.ch-body svg.bd { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; }
.ch-body svg.bd text { font-family: var(--mono); font-weight: 500; fill: var(--dim); }
.ch-body svg.bd .sans { font-family: var(--sans); font-weight: 450; }
.ch-body svg.bd .hd { font-family: var(--sans); font-weight: 600; fill: var(--ink); font-size: 23px; letter-spacing: -0.01em; }
.ch-body svg.bd .ink { fill: var(--ink); }
.ch-body svg.bd .t-mech { fill: var(--mech); } .ch-body svg.bd .t-ours { fill: var(--ours); } .ch-body svg.bd .t-base { fill: var(--base); }
`;

  const html = `
<h2>Cut 2: forget a layer's activations,<br>rebuild them exactly.</h2>
<div class="bd-by">Body lane, Timur Ishmurzin, <code>solution/body/</code></div>
<svg class="bd" viewBox="0 0 1920 1080"></svg>`;

  const R = {}; // element registry, filled by build()

  function build(root, api) {
    const { C, el } = api;
    const s = root.querySelector('svg.bd');
    const g = (cls, parent) => el('g', cls ? { class: cls } : {}, parent || s);

    /* ---------- act 1: the strip of 28 layers ---------- */
    // forward rail
    const fw = g('bd-fw');
    el('text', { x: SX0, y: CT - 26, class: 'sans', 'font-size': 21, fill: C.ink }, fw, 'Forward, layers 1 → 28: each layer keeps only its input');
    el('line', { x1: SX0, x2: SX1 - 8, y1: CT - 12, y2: CT - 12, stroke: C.edge, 'stroke-width': 1.5 }, fw);
    el('path', { d: `M${SX1 - 10},${CT - 17} L${SX1},${CT - 12} L${SX1 - 10},${CT - 7} Z`, fill: '#3A4756' }, fw);
    R.fwRail = fw;
    R.fwCursor = el('rect', { x: SX0, y: CT - 14, width: COLW, height: 4, fill: C.ours }, s);

    R.cols = [];
    for (let i = 0; i < N; i++) {
      const x = colX(i), c = g('bd-col');
      const ghost = el('rect', { x: x + .75, y: CT + .75, width: COLW - 1.5, height: CH - 1.5, fill: 'none', stroke: C.base, 'stroke-opacity': .6, 'stroke-dasharray': '3 5' }, c);
      const baseFill = el('rect', { x, y: CB, width: COLW, height: 0, fill: C.base, 'fill-opacity': .78 }, c);
      const re = el('rect', { x, y: CB, width: COLW, height: 0, fill: C.mech }, c);
      const keep = el('rect', { x, y: CB - SLV, width: COLW, height: SLV, fill: C.ours }, c);
      const num = el('text', { x: x + COLW / 2, y: CB + 28, 'text-anchor': 'middle', 'font-size': 16 }, c, i + 1);
      R.cols.push({ c, ghost, baseFill, re, keep, num });
    }
    // the parked layer is mid-rebuild at the keyframe
    const P = R.cols[PARK - 1];
    P.re.setAttribute('y', CT); P.re.setAttribute('height', CH - SLV);
    P.num.setAttribute('fill', C.mech); // moved to style by fixFills()
    // legend inside the strip, right of the parked column, on the empty ghosts
    const lg = g('bd-legend');
    el('text', { x: colX(PARK - 1) + COLW + 14, y: CT + 34, class: 'sans t-mech', 'font-size': 20 }, lg, '← rebuilt just in time');
    R.baseLegend = el('text', { x: SX1 - 8, y: CT + 34, 'text-anchor': 'end', class: 'sans', 'font-size': 20, fill: C.base }, s, 'Dashed: what the base keeps for backward');
    R.legend = lg;

    // backward rail
    const bw = g('bd-bw');
    const BY = CB + 46;
    R.BY = BY;
    el('line', { x1: SX0 + 8, x2: SX1, y1: BY, y2: BY, stroke: '#3A4756', 'stroke-width': 1.5 }, bw);
    el('path', { d: `M${SX0 + 10},${BY - 5} L${SX0},${BY} L${SX0 + 10},${BY + 5} Z`, fill: '#3A4756' }, bw);
    el('text', { x: SX1, y: BY + 30, 'text-anchor': 'end', class: 'sans', 'font-size': 21, fill: C.ink }, bw, 'Backward, 28 → 1: rebuild one layer, use it, free it');
    R.bwRail = bw;
    R.bwCursor = el('rect', { x: colX(PARK - 1), y: BY - 2, width: COLW, height: 4, fill: C.mech }, s);
    // pre-empt the jury's question
    R.preempt = el('text', { x: SX1, y: BY + 60, 'text-anchor': 'end', class: 'sans', 'font-size': 19 }, s,
      'Soup’s gradient_checkpointing switch stays off: own recompute is allowed, and its time counts.');

    /* ---------- the lens: layer 9 opened ---------- */
    const L0 = 120, L1 = 1050;
    const lens = g('bd-lens');
    const px = colX(PARK - 1);
    el('path', { d: `M${px},${BY + 6} L${px + COLW},${BY + 6} L${L1},${LY - 8} L${L0},${LY - 8} Z`, fill: C.mech, 'fill-opacity': .07 }, lens);
    el('line', { x1: px, y1: BY + 6, x2: L0, y2: LY - 8, stroke: C.mech, 'stroke-opacity': .5 }, lens);
    el('line', { x1: px + COLW, y1: BY + 6, x2: L1, y2: LY - 8, stroke: C.mech, 'stroke-opacity': .5 }, lens);
    R.lens = lens;

    const an = g('bd-anat');
    el('text', { x: L0, y: LY + 26, class: 'hd' }, an, `Layer ${PARK} in backward: what replays`);
    // pipeline: kind = keep (green, retained), replay (blue, recomputed), skip (frozen NF4 op that needs no saved input), sum
    const ops = [
      { t: 'x', kind: 'keep', w: 30 },
      { t: 'RMSNorm', kind: 'replay', k: 'rms' },
      { t: 'q k v', kind: 'replay', k: 'nf4' },
      { t: 'RoPE', kind: 'replay', k: 'rope' },
      { t: 'SDPA', kind: 'replay' },
      { t: 'o_proj', kind: 'skip', k: 'nf4' },
      { t: '+', kind: 'sum', w: 30 },
      { t: 'RMSNorm', kind: 'replay', k: 'rms' },
      { t: 'gate up', kind: 'replay', k: 'nf4' },
      { t: 'SwiGLU', kind: 'replay' },
      { t: 'down', kind: 'skip', k: 'nf4' },
    ];
    const OY = LY + 52, OH = 44, GAP = 13;
    const tw = t => t.length * 10.4 + 24;
    let total = ops.reduce((a, o) => a + (o.w || tw(o.t)), 0) + GAP * (ops.length - 1);
    const sc = (L1 - L0) / total;
    let x = L0;
    R.ops = []; R.tags = { nf4: [], rms: [], rope: [] };
    ops.forEach((o, i) => {
      const w = (o.w || tw(o.t)) * sc, cx = x + w / 2, og = g('bd-op', an);
      if (i > 0) el('line', { x1: x - GAP, x2: x, y1: OY + OH / 2, y2: OY + OH / 2, stroke: '#3A4756', 'stroke-width': 1.5 }, an);
      if (o.kind === 'keep') {
        el('rect', { x, y: OY, width: w, height: OH, rx: 3, fill: C.ours }, og);
        el('text', { x: cx, y: OY + 29, 'text-anchor': 'middle', 'font-size': 19, fill: C.bg }, og, 'x');
      } else if (o.kind === 'sum') {
        el('circle', { cx, cy: OY + OH / 2, r: 15, fill: 'none', stroke: C.mech, 'stroke-width': 2 }, og);
        el('text', { x: cx, y: OY + OH / 2 + 7, 'text-anchor': 'middle', 'font-size': 22, fill: C.mech }, og, '+');
        el('text', { x: cx, y: OY - 10, 'text-anchor': 'middle', 'font-size': 18, fill: C.ink }, og, 'h');
        R.sumNode = og;
        R.sumX = cx;
      } else {
        const rep = o.kind === 'replay';
        el('rect', { x: x + .75, y: OY + .75, width: w - 1.5, height: OH - 1.5, rx: 3, fill: rep ? C.mech : 'none', 'fill-opacity': rep ? .22 : 0, stroke: rep ? C.mech : '#3A4756', 'stroke-width': 1.5 }, og);
        el('text', { x: cx, y: OY + 28, 'text-anchor': 'middle', class: 'sans', 'font-size': 17, fill: rep ? C.ink : C.dim }, og, o.t);
      }
      if (o.k) {
        const tg = g('bd-tag', an);
        el('line', { x1: cx, x2: cx, y1: OY + OH + 4, y2: OY + OH + 14, stroke: C.mech }, tg);
        el('text', { x: cx, y: OY + OH + 34, 'text-anchor': 'middle', 'font-size': 16, fill: C.mech }, tg, o.k);
        R.tags[o.k].push(tg);
      }
      R.ops.push(og);
      x += w + GAP;
    });
    // legend for the pipeline: filled = replayed, outlined = frozen NF4 op that needs no saved input
    const kl = g('bd-klist', an);
    el('text', { x: L0, y: OY + OH + 76, class: 'sans', 'font-size': 18 }, kl, 'Own Triton kernels:');
    const kn = [['nf4', 'body_nf4_decode_weight'], ['rms', 'body_rmsnorm_forward, _backward'], ['rope', 'body_rope_token_kernel']];
    let kx = L0 + 168;
    R.kname = {};
    kn.forEach(([k, name]) => {
      const t = el('text', { x: kx, y: OY + OH + 76, 'font-size': 16, fill: C.ink }, kl, name);
      R.kname[k] = t; kx += name.length * 9.6 + 22;
    });
    el('text', { x: L0, y: OY + OH + 106, class: 'sans', 'font-size': 18 }, an,
      'Blue ops replay with the RNG state restored: LoRA dropout 0.05 draws the same masks.');
    R.anat = an;
    R.klist = kl;

    /* ---------- act 3: the residual sum, bit for bit ---------- */
    const B0 = 1150, BL = 1262, cell = 13.5, pitch = 16.4;
    const bitsG = g('bd-bits');
    el('text', { x: B0, y: LY + 26, class: 'hd' }, bitsG, 'The FP32 residual sum, rebuilt bit for bit');
    const rows = [
      { name: 'x', sub: 'fp32, kept', b: BX, color: C.ours },
      { name: '+ attn', sub: 'fp16, kept', b: BA, color: C.ours },
      { name: '= h', sub: 'base stores', b: BH, color: C.base },
      { name: '= h', sub: 'we rebuild', b: BH, color: C.mech },
    ];
    const groups16 = [1, 5], groups32 = [1, 8];
    R.bitRows = [];
    rows.forEach((r, j) => {
      const y = LY + 44 + j * 40, rg = g('bd-brow', bitsG);
      el('text', { x: B0, y: y + 13, 'font-size': 18, fill: C.ink }, rg, r.name);
      el('text', { x: B0, y: y + 31, class: 'sans', 'font-size': 14 }, rg, r.sub);
      const cells = [];
      const gs = r.b.length === 16 ? groups16 : groups32;
      let cx = BL;
      for (let k = 0; k < r.b.length; k++) {
        if (k === gs[0] || k === gs[0] + gs[1]) cx += 6;
        const on = r.b[k] === '1';
        const cel = el('rect', { x: cx + .75, y: y + .75, width: cell - 1.5, height: 30 - 1.5, rx: 1.5, fill: on ? r.color : 'none', stroke: r.color, 'stroke-opacity': on ? 1 : .45, 'stroke-width': 1.5 }, rg);
        cells.push(cel); cx += pitch;
      }
      R.bitRows.push({ g: rg, cells, color: r.color, b: r.b });
    });
    // the verdict
    R.verdict = el('text', { x: B0, y: LY + 44 + 4 * 40 + 18, class: 'sans t-ours', 'font-size': 20 }, s,
      'Same operands, same FP32 add: 32 of 32 bits equal.');
    R.bitsG = bitsG;
    // the final row turns green when it matches
    R.bitRows[3].cells.forEach((c, k) => {
      const on = BH[k] === '1';
      c.setAttribute('fill', on ? C.ours : 'none'); c.setAttribute('stroke', C.ours);
    });
    R.bitRows[3].g.querySelectorAll('text')[0].setAttribute('fill', C.ours); // style via fixFills()

    /* ---------- landing annotation on the box ---------- */
    // core.css `svg text { fill }` overrides presentation attributes: move text fills to inline style
    const fixFills = () => s.querySelectorAll('text').forEach(t => { const f = t.getAttribute('fill'); if (f) { t.style.fill = f; t.removeAttribute('fill'); } });
    const mx = 120 + 2479 / 15360 * 1680;
    const land = g('bd-land'); land.setAttribute('data-allow-box-zone', '');
    el('text', { x: mx + 16, y: 918, class: 'sans', 'font-size': 18, fill: C.ink }, land, 'peak by nvidia-smi, Kaggle T4, run 1031-2312');
    R.land = land;
    fixFills();
  }

  /* ---------- timeline ---------- */
  // One builder for deck and video: `at` maps a story cue to a time; `pace` scales the per-layer steps.
  function timeline(root, api, at, pace, lean) {
    const { C } = api;
    const tl = gsap.timeline({ paused: false });
    const E = 'power2.out', IO = 'power2.inOut';
    const cols = R.cols, P = R.cols[PARK - 1];
    const fwStep = pace.fw / N, bwStep = pace.bw / (N - PARK + 1);

    // start state (t = 0)
    tl.set(root.querySelector('h2'), { opacity: 0, y: 14 }, 0)
      .set(root.querySelector('.bd-by'), { opacity: 0 }, 0)
      .set([R.fwRail, R.bwRail, R.preempt, R.legend, R.baseLegend, R.lens, R.anat, R.bitsG, R.verdict, R.land], { opacity: 0 }, 0)
      .set(R.fwCursor, { attr: { x: SX0 - PITCH }, opacity: 0 }, 0)
      .set(R.bwCursor, { attr: { x: colX(N - 1) }, opacity: 0 }, 0);
    cols.forEach(c => {
      tl.set(c.c, { opacity: 0 }, 0)
        .set(c.baseFill, { attr: { y: CB, height: 0 } }, 0)
        .set(c.re, { attr: { y: CB - SLV, height: 0 } }, 0)
        .set(c.keep, { opacity: 0 }, 0)
        .set(c.num, { fill: C.dim }, 0);
    });
    R.ops.forEach(o => tl.set(o, { opacity: 0 }, 0));
    Object.values(R.tags).flat().forEach(t => tl.set(t, { opacity: 0 }, 0));
    Object.values(R.kname).forEach(t => tl.set(t, { fill: C.dim }, 0));
    R.bitRows.forEach(r => tl.set(r.g, { opacity: 0 }, 0));
    const last = R.bitRows[3];
    last.cells.forEach((c, k) => tl.set(c, { attr: { fill: BH[k] === '1' ? C.mech : 'none', stroke: C.mech } }, 0));
    tl.set(last.g.querySelector('text'), { fill: C.ink }, 0);

    // title
    tl.to(root.querySelector('h2'), { opacity: 1, y: 0, duration: .6, ease: E }, at.title)
      .to(root.querySelector('.bd-by'), { opacity: 1, duration: .5 }, at.title + .3);

    // act 1a: forward 1 -> 28, the base fills every layer
    tl.to(R.fwRail, { opacity: 1, duration: .4 }, at.fw - .3)
      .to(R.fwCursor, { opacity: 1, duration: .15 }, at.fw);
    cols.forEach((c, i) => {
      const t = at.fw + i * fwStep;
      tl.to(c.c, { opacity: 1, duration: .25 }, t)
        .to(c.baseFill, { attr: { y: CT, height: CH }, duration: .35, ease: E }, t)
        .to(R.fwCursor, { attr: { x: colX(i) }, duration: fwStep, ease: 'none' }, t - fwStep);
    });
    // act 1b: we do not keep it: columns collapse onto the kept input; the box collapses with them
    cols.forEach((c, i) => {
      const t = at.drop + i * .018;
      tl.to(c.baseFill, { attr: { y: CB, height: 0 }, duration: .55, ease: 'power3.in' }, t)
        .to(c.keep, { opacity: 1, duration: .2 }, t + .4);
    });
    tl.to(R.fwCursor, { opacity: 0, duration: .3 }, at.drop + .2);
    tl.to(R.baseLegend, { opacity: 1, duration: .5 }, at.drop + .5);
    if (api.box && api.box.to) {
      tl.add(api.box.to(COLLAPSE, { duration: pace.boxDur, ease: IO }), at.drop + .2);
      tl.add(api.box.to(BOX, { duration: .001, ease: 'none' }), at.drop + .2 + pace.boxDur);
    }

    // act 2: backward 28 -> PARK, rebuild, use, free
    tl.to(R.bwRail, { opacity: 1, duration: .4 }, at.bw - .3)
      .to(R.bwCursor, { opacity: 1, duration: .15 }, at.bw);
    for (let i = N - 1; i >= PARK - 1; i--) {
      const j = N - 1 - i, t = at.bw + j * bwStep, c = cols[i];
      tl.to(R.bwCursor, { attr: { x: colX(i) }, duration: bwStep * .8, ease: 'power1.inOut' }, t)
        .to(c.re, { attr: { y: CT, height: CH - SLV }, duration: bwStep * .9, ease: E }, t)
        .to(c.num, { fill: C.mech, duration: .1 }, t);
      if (i !== PARK - 1) {
        tl.to(c.re, { attr: { y: CB - SLV, height: 0 }, duration: bwStep * 1.1, ease: 'power2.in' }, t + bwStep * .95)
          .to(c.num, { fill: C.dim, duration: .2 }, t + bwStep * 1.4);
      }
    }
    tl.to(R.legend, { opacity: 1, duration: .4 }, at.park);
    if (!lean) tl.to(R.preempt, { opacity: 1, duration: .5 }, at.preempt);

    // video: the kernel-name line stays hidden (the tags under the ops carry it)
    if (lean) tl.set(R.klist, { opacity: 0 }, 0);

    // the lens opens layer PARK
    tl.to(R.lens, { opacity: 1, duration: .5, ease: E }, at.lens)
      .to(R.anat, { opacity: 1, duration: .01 }, at.lens);
    R.ops.forEach((o, k) => tl.fromTo(o, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .35, ease: E, immediateRender: false }, at.lens + .1 + k * .045));

    // act 3: the residual sum, bit for bit
    tl.to(R.bitsG, { opacity: 1, duration: .01 }, at.bits);
    R.bitRows.forEach((r, j) => tl.to(r.g, { opacity: 1, duration: .4, ease: E }, at.bits + [0, .35, .9, 1.4][j]));
    last.cells.forEach((c, k) => tl.to(c, { attr: { fill: BH[k] === '1' ? C.ours : 'none', stroke: C.ours }, duration: .15 }, at.match + k * pace.bit));
    tl.to(last.g.querySelector('text'), { fill: C.ours, duration: .2 }, at.match + 32 * pace.bit)
      .to(R.verdict, { opacity: 1, duration: .45 }, at.match + 32 * pace.bit);

    // own kernels light where they run
    [['nf4', at.nf4], ['rms', at.rms], ['rope', at.rope]].forEach(([k, t]) => {
      R.tags[k].forEach((tg, q) => tl.fromTo(tg, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: .35, ease: E, immediateRender: false }, t + q * .06));
      tl.to(R.kname[k], { fill: C.ink, duration: .35 }, t);
    });

    // landing: the base's 14,345 drawn dashed inside the box, the same mark as the base ghosts above
    if (api.box && api.box.node) {
      const X = api.box.X || (m => 120 + m / 15360 * 1680);
      const ga = api.el('g', { class: 'bd-baseghost' }, api.box.node);
      api.el('rect', { x: X(2479) + 1.5, y: 931.5, width: X(14345) - X(2479) - 3, height: 57, fill: 'none', stroke: C.base, 'stroke-opacity': .75, 'stroke-width': 1.5, 'stroke-dasharray': '3 5' }, ga);
      const t = api.el('text', { x: X(14345) - 14, y: 966, 'text-anchor': 'end', 'font-size': 17 }, ga, 'base 14,345 MiB');
      t.style.fill = C.base; t.style.fontFamily = 'var(--mono)';
      tl.fromTo(ga, { opacity: 0 }, { opacity: 1, duration: .6, ease: E, immediateRender: true }, at.land);
    }
    tl.to(R.land, { opacity: 1, duration: .5 }, at.land + .2);
    return tl;
  }

  Deck.chapter({
    n: 6, id: ID,
    title: "Cut 2: forget a layer's activations, rebuild them exactly.",
    html, css, box: BOX, build,
    enter(root, api) {
      return timeline(root, api, {
        title: 0, fw: .3, drop: 1.45, bw: 2.25, park: 3.95, preempt: 4.2,
        lens: 3.75, bits: 4.35, match: 5.3, nf4: 4.3, rms: 4.55, rope: 4.8, land: 5.5,
      }, { fw: .9, bw: 1.6, bit: .012, boxDur: 1.0 });
    },
    video(root, api, seg) {
      const w = (word, k) => api.word(seg, word, k || 0);
      const at = {
        title: 0,
        fw: w('двадцать'),                 // "двадцать восемь слоёв": forward fills 28 layers
        drop: w('не') - .05,               // "Мы не храним всё подряд": they collapse, box collapses
        bw: w('пересчитать'),              // "что можно пересчитать — пересчитываем в обратном проходе"
        park: w('проходе'),
        preempt: w('проходе') + .3,
        lens: w('Остаточную') - .35,
        bits: w('Остаточную'),             // "Остаточную сумму восстанавливаем"
        match: w('бит'),                   // "бит в бит"
        nf4: w('эн-эф'), rms: w('эр-эм-эс'), rope: w('роуп'),
        land: w('дошли'),                  // "Так мы дошли до двух с половиной гигабайт"
      };
      const tl = timeline(root, api, at, {
        fw: Math.max(.6, at.drop - at.fw - .15),
        bw: Math.max(1, at.park - at.bw - .2),
        bit: Math.max(.006, (w('бит', 1) + .2 - at.match) / 32),
        boxDur: 1.2,
      }, true);
      tl.to({}, { duration: 0 }, seg.duration);
      tl.paused(true);
      return tl;
    },
  });
})();
