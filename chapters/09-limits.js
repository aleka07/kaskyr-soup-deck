/* Chapter 09: limits. The price of the memory win, measured on one wall-time ruler.
   Numbers (run 1031-2312, source 63fd58c, MLP padding compaction): base 87.84 s, ours 86.4 s (x0.984);
   check 8 limit = 87.84 x 1.10 = 96.62 s (~10.2 s headroom); speed points need
   s >= 1.05, i.e. <= 87.84 / 1.05 = 83.66 s. Ghost: previous source 029d932 at x1.083 (90.07 s). */
(function () {
  const BASE = 87.84, OURS = 86.4, LIMIT = 87.84 * 1.10, TARGET = 87.84 / 1.05, PREV = 90.07;
  const S0 = 80, S1 = 98, XL = 120, XR = 1800;
  const X = s => XL + (s - S0) / (S1 - S0) * (XR - XL);
  // vertical layout of the ruler (stage px)
  const BT = 400, BB = 516;            // band top / bottom
  const AY = 652;                      // buy-back arrow
  const E = 'power3.out', IO = 'power2.inOut';
  let N = null;   // nodes made in build()
  const BOX = [{ key: 'ours', mib: 2479, color: 'ours', label: 'ours' }];

  // one sequence, two clocks: the deck uses fixed cue times, the video uses word times
  function seq(api, T, tl) {
    const n = N;
    const dx = X(BASE) - X(OURS);
    tl.fromTo([n.h, n.sub], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: E }, T.title)
      .fromTo(n.frame, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.ruler)
      .fromTo(n.tk, { opacity: 0 }, { opacity: 1, duration: 0.6 }, T.ruler + 0.1)
      .fromTo([n.zN, n.zR, n.zG], { opacity: 0 }, { opacity: 1, duration: 0.7, stagger: 0.1, ease: E }, T.zones)
      .fromTo(n.cap.children, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.1 }, T.zones + 0.2)
      .fromTo(n.lim, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.zones + 0.3)
      .fromTo(n.bm, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: E }, T.base)
      // ours leaves the base line and walks left to 86.4 s; the clock counts with it
      .fromTo(n.om, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.slide - 0.2)
      .fromTo(n.om, { x: dx }, { x: 0, duration: T.slideDur, ease: IO }, T.slide)
      .fromTo(n.price, { attr: { x: X(BASE), width: 0 } }, { attr: { x: X(OURS), width: X(BASE) - X(OURS) }, duration: T.slideDur, ease: IO }, T.slide);
    const o = { v: BASE };
    tl.fromTo(o, { v: BASE }, { v: OURS, duration: T.slideDur, ease: IO,
      onUpdate: () => { n.clk.textContent = o.v.toFixed(1); } }, T.slide);
    // the moving number stays hidden while ours slides over the base label, then fades in at 86.4
    tl.fromTo(n.clk.parentNode, { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.slide + T.slideDur);
    tl.fromTo(n.pl, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.price)
      .fromTo(n.hr, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.head)
      .fromTo(n.pv, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.prev)
      // next: the arrow pulls left from ours to the target, levers hang under it
      .fromTo(n.arDrop, { attr: { y2: BB + 14 } }, { attr: { y2: AY + 1.5 }, duration: 0.3, ease: 'power1.in' }, T.arrow)
      .fromTo(n.arLine, { attr: { x2: X(OURS) } }, { attr: { x2: X(TARGET) + 14 }, duration: T.arrowDur, ease: 'power2.out' }, T.arrow + 0.3)
      .fromTo(n.arHead, { x: X(OURS) - X(TARGET), opacity: 0 }, { x: 0, opacity: 1, duration: T.arrowDur, ease: 'power2.out' }, T.arrow + 0.3)
      .fromTo(n.arLbl, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.arrow + T.arrowDur * 0.5);
    T.levers.forEach((t, i) => tl.fromTo(n.levers[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: E }, t));
    tl.fromTo(n.tg, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.green)
      // the green zone waits dim until the end: it is the destination
      .fromTo(n.zG, { attr: { 'fill-opacity': 0.05 } }, { attr: { 'fill-opacity': 0.2 }, duration: 0.8, ease: E }, T.green);
    return tl;
  }

  Deck.chapter({
    n: 9, id: 'limits',
    title: 'Faster than the base. 2.7 seconds from speed points.',
    box: BOX,
    html: `
      <h2 class="lim-h">Faster than the base. 2.7 seconds from speed points.</h2>
      <p class="lim-sub">Wall time of <code>soup train</code> on the Kaggle T4, run 1031-2312. 42.4% of token positions are padding; the MLP now runs only on valid rows. Before: <code>029d932</code> (2,541&nbsp;MiB) ran ×1.083 with 1.37&nbsp;s headroom; main before that failed check&nbsp;8 at ×1.136.</p>
      <svg class="lim-svg" viewBox="0 0 1920 1080" fill="#8A96A3" aria-hidden="true"></svg>
      <div class="lim-levers">
        <div class="lim-lv"><b>Remove padding everywhere</b><span>through the whole model and the head, not only the MLP</span></div>
        <div class="lim-lv"><b>Fused LoRA and cast kernels</b><span>fewer launches, no fp16 round trips through memory</span></div>
        <div class="lim-lv"><b>Toward ~1&nbsp;GB</b><span>fp16 tied-embedding storage and weight streaming (docs/ROADMAP-1GB-45S.md)</span></div>
      </div>`,
    css: `
      .ch-limits .lim-h { font-size: 64px; line-height: 1.05; letter-spacing: -0.03em; font-weight: 650; max-width: 1680px; }
      .ch-limits .lim-sub { font-size: 24px; line-height: 1.4; color: #8A96A3; margin-top: 18px; max-width: 1680px; }
      .ch-limits .lim-sub code { font-family: "Plex Mono", ui-monospace, monospace; color: #E8EDF2; font-size: 0.92em; }
      .ch-limits .lim-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; pointer-events: none; overflow: visible; }
      .ch-limits .lim-svg text { font-family: "Onest", system-ui, sans-serif; }
      .ch-limits .lim-svg .m { font-family: "Plex Mono", ui-monospace, monospace; font-weight: 500; }
      .ch-limits .lim-svg .m .u { font-family: "Onest", system-ui, sans-serif; font-weight: 500; }
      .ch-limits .lim-levers { position: absolute; left: ${XL}px; width: ${XR - XL}px; top: ${AY + 34}px;
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
      .ch-limits .lim-lv { border-left: 2px solid #2EE6A6; padding-left: 16px; }
      .ch-limits .lim-lv b { display: block; font-weight: 600; font-size: 23px; line-height: 1.2; color: #E8EDF2; letter-spacing: -0.01em; }
      .ch-limits .lim-lv span { display: block; hyphens: none; font-size: 18px; line-height: 1.35; color: #8A96A3; margin-top: 6px; }
    `,

    build(root, api) {
      const { C, el } = api;
      const s = root.querySelector('.lim-svg');
      const defs = el('defs', {}, s);
      const pat = el('pattern', { id: 'lim-hatch', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      el('rect', { width: 12, height: 12, fill: C.base, 'fill-opacity': 0.10 }, pat);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 12, stroke: C.base, 'stroke-width': 4, 'stroke-opacity': 0.55 }, pat);
      const H = BB - BT, MID = (BT + BB) / 2;
      // a seconds value: mono digits, a smaller sans unit
      const secs = (attrs, g, v, unitSize) => {
        const t = el('text', Object.assign({ class: 'm' }, attrs), g);
        const num = el('tspan', {}, t, v);
        el('tspan', { class: 'u', 'font-size': unitSize || Math.round(attrs['font-size'] * 0.62), dx: 4 }, t, 's');
        return num;
      };

      // zones: speed points | admitted, scores 0 | check 8 fails
      const zG = el('rect', { class: 'lz-green', x: X(S0), y: BT, width: X(TARGET) - X(S0), height: H, fill: C.ours, 'fill-opacity': 0.2 }, s);
      const zN = el('rect', { class: 'lz-neutral', x: X(TARGET), y: BT, width: X(LIMIT) - X(TARGET), height: H, fill: C.panel }, s);
      const zR = el('rect', { class: 'lz-red', x: X(LIMIT), y: BT, width: X(S1) - X(LIMIT), height: H, fill: C.base, 'fill-opacity': 0.14 }, s);
      el('rect', { class: 'l-frame', x: XL, y: BT, width: XR - XL, height: H, fill: 'none', stroke: C.line, 'stroke-width': 1.5 }, s);

      // zone captions under the band
      const cap = el('g', { class: 'l-caps' }, s);
      el('text', { class: 'lc-green', x: X(S0) + 2, y: BB + 34, 'font-size': 20, fill: C.ours }, cap, 'speed scores, ≤ 83.7 s');
      el('text', { class: 'lc-neutral', x: X(TARGET) + 14, y: BB + 34, 'font-size': 20 }, cap, 'admitted, speed 0');
      el('text', { class: 'lc-red', x: XR - 4, y: BB + 34, 'text-anchor': 'end', 'font-size': 20, fill: C.base }, cap, 'check 8 fails, > 96.6 s');

      // ticks
      const tk = el('g', { class: 'l-ticks' }, s);
      for (let v = S0; v <= S1; v += 2) {
        el('line', { x1: X(v), x2: X(v), y1: BB, y2: BB + (v % 4 === 0 ? 10 : 6), stroke: C.dim, 'stroke-opacity': 0.6, 'stroke-width': 1.5 }, tk);
        if (v % 4 === 0) secs({ x: X(v), y: BB + 66, 'text-anchor': v === S0 ? 'start' : v === S1 ? 'end' : 'middle', 'font-size': 17, 'fill-opacity': 0.75 }, tk, String(v), 13);
      }

      // price: hatched span base -> ours
      const price = el('rect', { class: 'l-price', x: X(OURS), y: BT + 1, width: X(BASE) - X(OURS), height: H - 2, fill: C.ours, 'fill-opacity': 0.16 }, s);
      const pl = el('g', { class: 'l-price-lbl' }, s);
      const pcx = (X(BASE) + X(OURS)) / 2;
      secs({ x: pcx, y: MID + 4, 'text-anchor': 'middle', 'font-size': 28, fill: C.ours }, pl, '−1.44');
      el('text', { class: 'm', x: pcx, y: MID + 30, 'text-anchor': 'middle', 'font-size': 18, fill: C.ink }, pl, '×0.984');

      // headroom ours -> limit
      const hr = el('g', { class: 'l-head' }, s);
      el('rect', { x: X(BASE), y: BT + 1, width: X(LIMIT) - X(BASE), height: H - 2, fill: C.ink, 'fill-opacity': 0.05 }, hr);
      const hx = (X(PREV) + X(LIMIT)) / 2;
      secs({ x: hx, y: MID + 4, 'text-anchor': 'middle', 'font-size': 26, fill: C.ink }, hr, '10.2');
      el('text', { x: hx, y: MID + 28, 'text-anchor': 'middle', 'font-size': 16 }, hr, 'headroom to check 8');

      // limit line
      const lim = el('g', { class: 'l-limit' }, s);
      el('line', { x1: X(LIMIT), x2: X(LIMIT), y1: BT - 14, y2: BB + 14, stroke: C.base, 'stroke-width': 3 }, lim);
      secs({ x: X(LIMIT) + 10, y: BT - 22, 'font-size': 20, fill: C.base }, lim, '96.62');

      // ghost: previous source 029d932, x1.083
      const pv = el('g', { class: 'l-prev', opacity: 0.55 }, s);
      el('line', { x1: X(PREV), x2: X(PREV), y1: BT, y2: BB, stroke: C.dim, 'stroke-width': 2, 'stroke-dasharray': '5 6' }, pv);
      el('text', { x: X(PREV) + 10, y: BT - 52, 'font-size': 20, fill: C.dim }, pv, '90.07 s, ×1.083');
      el('text', { x: X(PREV) + 10, y: BT - 24, 'font-size': 17, fill: C.dim }, pv, 'before: 029d932');

      // target
      const tg = el('g', { class: 'l-target' }, s);
      el('line', { x1: X(TARGET), x2: X(TARGET), y1: BT - 14, y2: AY, stroke: C.ours, 'stroke-width': 2.5, 'stroke-dasharray': '6 6' }, tg);
      secs({ x: X(TARGET) - 12, y: BT - 22, 'text-anchor': 'end', 'font-size': 22, fill: C.ours }, tg, '≤ 83.7');

      // base marker
      const bm = el('g', { class: 'l-base' }, s);
      el('line', { x1: X(BASE), x2: X(BASE), y1: BT - 14, y2: BB + 14, stroke: C.ink, 'stroke-width': 3 }, bm);
      el('text', { x: X(BASE) + 10, y: BT - 62, 'font-size': 20 }, bm, 'base');
      secs({ x: X(BASE) + 10, y: BT - 24, 'font-size': 30, fill: C.ink }, bm, '87.84');

      // ours marker (the clock): moves from base to 90.07 while counting
      const om = el('g', { class: 'l-ours' }, s);
      el('line', { x1: X(OURS), x2: X(OURS), y1: BT - 14, y2: BB + 14, stroke: C.ours, 'stroke-width': 4 }, om);
      el('text', { x: X(OURS) - 10, y: BT - 80, 'text-anchor': 'end', 'font-size': 20, fill: C.ours }, om, 'ours');
      const clk = secs({ x: X(OURS) - 10, y: BT - 24, 'text-anchor': 'end', 'font-size': 48, fill: C.ours }, om, '86.4');

      // buy-back arrow: from ours to the target
      const ar = el('g', { class: 'l-arrow' }, s);
      const arDrop = el('line', { x1: X(OURS), x2: X(OURS), y1: BB + 14, y2: AY + 1.5, stroke: C.ours, 'stroke-width': 3 }, ar);
      const arLine = el('line', { x1: X(OURS), x2: X(TARGET) + 14, y1: AY, y2: AY, stroke: C.ours, 'stroke-width': 3 }, ar);
      const arHead = el('path', { d: `M${X(TARGET)},${AY} l18,-9 l0,18 z`, fill: C.ours }, ar);
      const arLbl = el('text', { x: X(OURS) + 14, y: AY + 7, 'font-size': 22, fill: C.ink }, ar);
      el('tspan', { class: 'm', fill: C.ours }, arLbl, '−2.7');
      el('tspan', { fill: C.ours, dx: 4 }, arLbl, 's');
      el('tspan', {}, arLbl, ' for speed points');

      // core.css sets svg text fill by CSS, which beats fill attributes: promote them to inline style
      s.querySelectorAll('text[fill], tspan[fill]').forEach(t => { t.style.fill = t.getAttribute('fill'); });

      N = { arDrop, s, zG, zN, zR, cap, tk, price, pl, hr, lim, pv, tg, bm, om, clk, arLine, arHead, arLbl,
        frame: s.querySelector('.l-frame'), levers: root.querySelectorAll('.lim-lv'),
        h: root.querySelector('.lim-h'), sub: root.querySelector('.lim-sub') };
    },

    enter(root, api) {
      api.box.set(BOX);
      return seq(api, {
        title: 0, ruler: 0.2, zones: 0.4, base: 0.9, slide: 1.3, slideDur: 1.2, price: 2.3, head: 2.6, prev: 2.9,
        arrow: 3.3, arrowDur: 1.1, levers: [3.7, 3.9, 4.1], green: 4.6,
      }, gsap.timeline());
    },

    video(root, api, seg) {
      // the narration changed with the result: reuse the deck's cue times, padded to the segment
      const tl = gsap.timeline({ paused: true });
      api.box.set(BOX);
      seq(api, {
        title: 0, ruler: 0.2, zones: 0.4, base: 0.9, slide: 1.3, slideDur: 1.2, price: 2.3, head: 2.6, prev: 2.9,
        arrow: 3.3, arrowDur: 1.1, levers: [3.7, 3.9, 4.1], green: 4.6,
      }, tl);
      if (tl.duration() < seg.duration) tl.set({}, {}, seg.duration);
      return tl;
    },
  });
})();
