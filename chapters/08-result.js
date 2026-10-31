/* Chapter 8, result: "Same training, 5.8× less memory."
   Two T4 boxes on one scale (0 … 15,360 MiB, the same scale as the core memory box): base 14,345, ours 2,479.
   The ratio is shown, not stated: copies of our box fly up into the base box, 5.787 of them fit.
   Below, the proof that the training is the same: eval loss, 10/10 checks, own-kernel share, memory points.
   Numbers: docs/submission-facts.md (run 1031-2312). */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const E = (tag, a, p, txt) => {
    const n = document.createElementNS(NS, tag);
    for (const k in a) n.setAttribute(k, a[k]);
    if (txt != null) n.textContent = txt;
    if (p) p.appendChild(n);
    return n;
  };
  const C = { bg: '#0B0F14', ink: '#E8EDF2', dim: '#8A96A3', base: '#FF5A36', ours: '#2EE6A6', mech: '#5B8CFF', line: '#1E2833', panel: '#121922', edge: '#3A4756' };
  const fmt = n => Math.round(n).toLocaleString('en-US');

  const BASE = 14345, OURS = 2479, MAX = 15360, RATIO = BASE / OURS; // 5.787
  const BX0 = 120, BX1 = 1800, W = m => m / MAX * (BX1 - BX0);
  const RB = { lbl: 310, y: 334, h: 120 };   // base row
  const RO = { lbl: 550, y: 574, h: 120 };   // ours row
  const PY = 866, PL = 914;                  // proof row: figure baseline, label baseline
  const COLS = [120, 540, 960, 1380];

  function seq(root, api, T, total) {
    const P = root._p8, tl = gsap.timeline();
    const E2 = 'power2.out';
    const fade = (t, at, dur = 0.5, from = { opacity: 0 }, to = {}) => tl.fromTo(t, from, { opacity: 1, duration: dur, ease: E2, ...to }, at);
    // the core box steps aside: this slide draws both boxes large
    tl.add(api.box.tweenHide({ duration: 0.5 }), 0);
    fade(root.querySelector('.r8-h'), T.head, 0.6, { opacity: 0, y: 14 }, { y: 0 });
    fade(root.querySelector('.r8-sub'), T.sub, 0.6, { opacity: 0, y: 10 }, { y: 0 });
    // video: chapter 7 ended on our 2,479 MiB, so our bar is full from t = 0 and its track is already there
    fade(T.oursFull ? P.tracks.filter(t => t !== P.oTrack) : P.tracks, T.tracks, 0.5);
    // base fills, counting
    const cb = { v: 0 }, co = { v: T.oursFull ? OURS : 0 }, cr = { v: 0 };
    const setB = () => { P.bFill.setAttribute('width', W(cb.v)); P.bNum.textContent = fmt(cb.v) + ' MiB'; };
    const setO = () => { P.oFill.setAttribute('width', W(co.v)); P.oNum.textContent = fmt(co.v) + ' MiB'; };
    tl.fromTo(cb, { v: 0 }, { v: BASE, duration: T.baseFill[1] - T.baseFill[0], ease: 'power2.inOut', onUpdate: setB, onStart: setB }, T.baseFill[0]);
    if (!T.oursFull) tl.fromTo(co, { v: 0 }, { v: OURS, duration: T.oursFill[1] - T.oursFill[0], ease: 'power2.inOut', onUpdate: setO, onStart: setO }, T.oursFill[0]);
    tl.call(setB, null, 0); tl.call(setO, null, 0);
    if (T.oursFull) setO();
    const setR = () => { P.ratio.textContent = Math.max(0, cr.v).toFixed(1) + '×'; };
    // the ratio: copies of our box are laid along the base box
    const [t0, t1] = T.tile, n = P.copies.length, step = (t1 - t0 - 0.7) / (n - 1);
    P.copies.forEach((c, i) => {
      const at = t0 + i * step;
      // a ruler: each copy is stamped at the left end of the base box and slides to its slot
      tl.fromTo(c.r, { x: BX0, y: RB.y, opacity: 0 }, { x: c.x, y: RB.y, opacity: 1, duration: 0.7, ease: 'power3.inOut' }, at);
      tl.fromTo(cr, { v: i }, { v: i < n - 1 ? i + 1 : RATIO, duration: i < n - 1 ? Math.min(0.7, step) : 0.7, ease: 'power3.inOut', onUpdate: setR, onStart: setR, immediateRender: false }, at);
      if (c.w < W(OURS)) {
        tl.fromTo(c.rr, { attr: { width: W(OURS) - 6 } }, { attr: { width: c.w - 6 }, duration: 0.7, ease: 'power3.inOut' }, at);
        tl.fromTo(c.lb, { attr: { x: W(OURS) / 2 } }, { attr: { x: c.w / 2 }, duration: 0.7, ease: 'power3.inOut' }, at);
      }
    });
    fade(P.ratioG, t0, 0.4);
    tl.call(setR, null, 0);
    fade(P.ratioEq, t1 - 0.3, 0.5);
    // proof row
    fade(P.rule, T.loss - 0.2, 0.5);
    fade(P.cols[0], T.loss, 0.5, { opacity: 0, y: 10 }, { y: 0 });
    fade(P.cols[1], T.checks[0] - 0.2, 0.4);
    tl.fromTo(P.checks, { attr: { fill: C.panel, stroke: C.edge } },
      { attr: { fill: C.ours, stroke: C.ours }, duration: 0.25, ease: E2, stagger: (T.checks[1] - T.checks[0]) / 10 }, T.checks[0]);
    fade(P.cols[2], T.kern, 0.5, { opacity: 0, y: 10 }, { y: 0 });
    tl.fromTo(P.share, { attr: { width: 0 } }, { attr: { width: P.shareW }, duration: 0.7, ease: E2 }, T.kern + 0.1);
    fade(P.cols[3], T.pts, 0.5, { opacity: 0, y: 10 }, { y: 0 });
    if (total != null) tl.set({}, {}, total);
    return tl;
  }

  Deck.chapter({
    n: 8, id: 'result',
    title: 'Same training, 5.8× less memory.',
    html: `
      <h2 class="r8-h">Same training, 5.8× less memory.</h2>
      <p class="r8-sub">Peak GPU memory, read by nvidia-smi from outside the training process. Kaggle T4, run 1031-2312.</p>
      <svg class="r8-svg" data-allow-box-zone viewBox="0 0 1920 1080" width="1920" height="1080"></svg>`,
    css: `
      .ch-result .r8-h { position: relative; z-index: 2; }
      .ch-result .r8-sub { position: relative; z-index: 2; margin-top: 18px; white-space: nowrap; font-size: 24px; line-height: 1.4; color: var(--dim); }
      .ch-result .r8-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; }
      .ch-result .r8-svg text { font-family: var(--mono); font-weight: 500; fill: var(--dim); }
      .ch-result .r8-svg .s { font-family: var(--sans); }
      .ch-result .r8-svg .ink { fill: var(--ink); }
      .ch-result .r8-svg .ours { fill: var(--ours); }
      .ch-result .r8-svg .base { fill: var(--base); }
    `,
    box: [{ key: 'ours', mib: OURS, color: 'ours', label: 'ours' }],

    build(root) {
      const svg = root.querySelector('.r8-svg');
      const P = (root._p8 = { copies: [], checks: [], cols: [] });

      // two rows on one scale
      const row = (R, name, cls, col) => {
        const lt = E('text', { x: BX0, y: R.lbl, class: 's' }, svg);
        E('tspan', { class: 's ink', 'font-size': 26, 'font-weight': 600 }, lt, name);
        const num = E('tspan', { class: cls, 'font-size': 40, dx: 18 }, lt, '0 MiB');
        const track = E('rect', { x: BX0, y: R.y, width: BX1 - BX0, height: R.h, rx: 3, fill: C.panel, stroke: C.edge, 'stroke-width': 1.5 }, svg);
        const fill = E('rect', { x: BX0, y: R.y, width: 0, height: R.h, rx: 3, fill: col }, svg);
        return { num, track, fill };
      };
      const b = row(RB, 'base', 'base', C.base), o = row(RO, 'ours', 'ours', C.ours);
      P.bNum = b.num; P.oNum = o.num; P.bFill = b.fill; P.oFill = o.fill; P.oTrack = o.track;
      // 2,048 MiB ticks on both tracks, the core box's grid
      const tg = E('g', {}, svg);
      for (let m = 2048; m < MAX; m += 2048) {
        [RB, RO].forEach(R => E('line', { x1: BX0 + W(m), x2: BX0 + W(m), y1: R.y + R.h, y2: R.y + R.h + 8, stroke: C.edge, 'stroke-width': 1.5 }, tg));
      }
      const cap = E('text', { x: BX1, y: RB.lbl, 'text-anchor': 'end', class: 's', 'font-size': 19 }, tg, '15,360 MiB usable on the T4');
      P.tracks = [b.track, o.track, tg];

      // copies of ours that fit in base: 5 whole and 0.6454 of one
      const cw = W(OURS), whole = Math.floor(RATIO);
      const cg = E('g', {}, svg);
      for (let i = 0; i <= whole; i++) {
        const w = i < whole ? cw : cw * (RATIO - whole);
        const r = E('g', { opacity: 0 }, cg);
        const rr = E('rect', { x: 3, y: 4, width: cw - 6, height: RB.h - 8, rx: 2, fill: 'none', stroke: C.ours, 'stroke-width': 3 }, r);
        const lb = E('text', { x: cw / 2, y: RB.h / 2 + 10, 'text-anchor': 'middle', class: 'ink', 'font-size': 28 }, r, i < whole ? String(i + 1) : (RATIO - whole).toFixed(2));
        P.copies.push({ r, rr, lb, x: BX0 + i * cw, w });
      }
      // the ratio, in the empty part of our row
      P.ratioG = E('g', { opacity: 0 }, svg);
      P.ratio = E('text', { x: BX1 - 24, y: RO.y + 92, 'text-anchor': 'end', class: 'ours', 'font-size': 96 }, P.ratioG, '5.8×');
      P.ratioEq = E('text', { x: BX1 - 300, y: RO.y + 68, 'text-anchor': 'end', class: 's', 'font-size': 21 }, svg);
      E('tspan', { x: BX1 - 300, dy: 0 }, P.ratioEq, 'our peak fits into the base peak');
      E('tspan', { x: BX1 - 300, dy: 28, class: '', 'font-family': 'Plex Mono' }, P.ratioEq, '14,345 / 2,479 = 5.787');

      // proof row
      P.rule = E('line', { x1: BX0, x2: BX1, y1: 774, y2: 774, stroke: C.line, 'stroke-width': 1.5 }, svg);
      const col = (i) => { const g = E('g', {}, svg); P.cols.push(g); return g; };
      // 1. eval loss
      let g = col(0), x = COLS[0];
      const lt = E('text', { x, y: PY, 'font-size': 38 }, g);
      E('tspan', { class: 'ink' }, lt, '2.04967');
      E('tspan', { class: 's', dx: 10 }, lt, '→');
      E('tspan', { class: 'ink', dx: 10 }, lt, '2.04963');
      E('text', { x, y: PL, class: 's', 'font-size': 21 }, g, 'eval loss, base to ours: unchanged');
      // 2. checks
      g = col(1); x = COLS[1];
      for (let i = 0; i < 10; i++) P.checks.push(E('rect', { x: x + i * 34, y: PY - 30, width: 26, height: 30, rx: 2, fill: C.panel, stroke: C.edge, 'stroke-width': 1.5 }, g));
      E('text', { x, y: PL, class: 's', 'font-size': 21 }, g, '10 of 10 admission checks pass');
      // 3. own-kernel share
      g = col(2); x = COLS[2];
      E('text', { x, y: PY, class: 'ink', 'font-size': 38 }, g, '9.3%');
      const bx = x + 150, bw = 230, by = PY - 18;
      E('rect', { x: bx, y: by, width: bw, height: 12, fill: C.panel, stroke: C.edge, 'stroke-width': 1 }, g);
      P.shareW = bw * 9.3 / 10;
      P.share = E('rect', { x: bx, y: by, width: P.shareW, height: 12, fill: C.ours }, g);
      E('line', { x1: bx + bw / 2, x2: bx + bw / 2, y1: by - 8, y2: by + 20, stroke: C.ink, 'stroke-width': 2 }, g);
      E('text', { x: bx + bw / 2, y: by - 14, 'text-anchor': 'middle', 'font-size': 15 }, g, '5% required');
      E('text', { x, y: PL, class: 's', 'font-size': 21 }, g, 'of training time in our own kernels');
      // 4. memory points
      g = col(3); x = COLS[3];
      E('text', { x, y: PY, class: 'ours', 'font-size': 38 }, g, '≈ 48');
      E('text', { x, y: PL, class: 's', 'font-size': 21 }, g, 'points from the memory term of the score');
    },

    enter(root, api) {
      const T = { head: 0, sub: 0.2, tracks: 0.3, baseFill: [0.5, 1.7], oursFull: true, tile: [2.9, 4.6], loss: 4.6, checks: [4.9, 5.6], kern: 5.7, pts: 6.0 };
      return seq(root, api, T);
    },

    video(root, api, seg) {
      const w = (word, k = 0) => api.word(seg, word, k);
      const T = {
        head: 0.1,
        sub: w('пик') + 0.1,
        tracks: w('пик') - 0.1,
        baseFill: [w('четырнадцать'), w('базы')],
        oursFull: true,
        tile: [w('нас') + 0.15, w('раза')],
        loss: w('качество'),
        checks: [w('все'), w('пройдены') + 0.3],
        kern: w('пройдены') + 0.6,
        pts: w('пройдены') + 1.0,
      };
      return seq(root, api, T, seg.duration);
    },
  });
})();
