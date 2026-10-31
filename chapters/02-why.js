/* Chapter 02 — why.
   What fine-tuning is (a ready model + your data -> your model, drawn as the real
   28-layer stack with LoRA adapters), and why memory decides who can do it: the base
   job needs 14,345 MiB of the free T4 (the core box), our version needs 2,479 MiB on
   the same scale and leaves 12,881 MiB free.
   Static SVG/HTML is built at the keyframe; timelines animate from earlier states. */
(function () {
  'use strict';
  const MAX = 15360, BASE = 14345, OURS = 2479;
  const X0 = 120, X1 = 1800, W = X1 - X0;
  const X = m => X0 + m / MAX * W;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const BOX = [{ key: 'base', mib: BASE, color: 'base', label: 'base' }];

  // equation geometry
  const EY = 312, NL = 28, SH = 7, SG = 3;           // 28 slats: y 312..592
  const EH = NL * (SH + SG) - SG;
  const A = { x: 120, w: 360 };                       // ready model
  const D = { x: 600, w: 300 };                       // your data
  const AR = { x1: 968, x2: 1300, y: EY + EH / 2 };   // fine-tuning arrow
  const B = { x: 1384, w: 360, tab: 44 };             // your model (+ adapters to 1800)
  const CAP_Y = EY + EH + 52;
  // lane: the same job with our kernels, same scale as the core box
  const LY = 772, LH = 60;

  const css = `
.ch-why .wy { position: absolute; inset: 0; }
.ch-why .wy-h { position: absolute; left: 117px; top: 92px; margin: 0; font: 650 76px/1.05 var(--sans, "Onest"), sans-serif; letter-spacing: -0.03em; color: #E8EDF2; white-space: nowrap; }
.ch-why .wy-sub { position: absolute; left: 120px; top: 196px; margin: 0; font: 400 32px/1.3 var(--sans, "Onest"), sans-serif; color: #8A96A3; white-space: nowrap; }
.ch-why .wy-sub b { font-weight: 500; color: #E8EDF2; }
.ch-why .wy-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; pointer-events: none; }
.ch-why .wy-svg text { font-family: var(--mono, "Plex Mono"), "IBM Plex Mono", monospace; font-weight: 500; fill: #8A96A3; }
.ch-why .wy-svg .sans { font-family: var(--sans, "Onest"), sans-serif; font-weight: 500; }
`;

  const html = `
<div class="wy">
  <h2 class="wy-h">Memory decides who can fine-tune at all.</h2>
  <p class="wy-sub">The GPU most people can get is <b>a free 16 GB Kaggle T4</b>.</p>
  <svg class="wy-svg" viewBox="0 0 1920 1080"></svg>
</div>`;

  // deterministic "token rows" for the data block
  function rows() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out = [];
    for (let i = 0; i < 14; i++) {
      const row = []; let x = 0;
      const n = 2 + Math.floor(rnd() * 4);
      for (let j = 0; j < n; j++) {
        const w = 26 + Math.floor(rnd() * 70);
        if (x + w > D.w) break;
        row.push([x, w]); x += w + 10;
      }
      out.push(row);
    }
    return out;
  }

  let R = null;

  function build(root, api) {
    const C = api.C, el = api.el;
    const s = root.querySelector('.wy-svg');
    const r = { C };

    // A: a ready model, 28 decoder layers
    r.aSlats = [];
    const gA = el('g', {}, s);
    for (let i = 0; i < NL; i++) r.aSlats.push(el('rect', { x: A.x, y: EY + i * (SH + SG), width: A.w, height: SH, rx: 1.5, fill: C.dim, 'fill-opacity': 0.42 }, gA));
    r.aCap = el('g', {}, s);
    el('text', { x: A.x, y: CAP_Y, 'font-size': 32, class: 'sans', style: `fill:${C.ink}` }, r.aCap, 'a ready model');
    el('text', { x: A.x, y: CAP_Y + 34, 'font-size': 20 }, r.aCap, '28 layers, frozen');

    // +
    r.plus = el('text', { x: (A.x + A.w + D.x) / 2, y: EY + EH / 2 + 22, 'font-size': 64, 'text-anchor': 'middle', class: 'sans', style: `fill:${C.dim};font-weight:300` }, s, '+');

    // D: your data, rows of tokens
    r.dRows = [];
    const gD = el('g', {}, s);
    const RH = 12, RG = (EH - 14 * RH) / 13;
    rows().forEach((row, i) => {
      const g = el('g', {}, gD);
      row.forEach(([x, w]) => el('rect', { x: D.x + x, y: EY + i * (RH + RG), width: w, height: RH, rx: 6, fill: C.ink, 'fill-opacity': 0.62 }, g));
      r.dRows.push(g);
    });
    r.dCap = el('g', {}, s);
    el('text', { x: D.x, y: CAP_Y, 'font-size': 32, class: 'sans', style: `fill:${C.ink}` }, r.dCap, 'your data');

    // the fine-tuning arrow: what it costs in memory
    r.arrow = el('g', {}, s);
    r.arLine = el('line', { x1: AR.x1, x2: AR.x2 - 4, y1: AR.y, y2: AR.y, stroke: C.dim, 'stroke-width': 3 }, r.arrow);
    r.arHead = el('path', { d: `M${AR.x2 - 22},${AR.y - 13} L${AR.x2},${AR.y} L${AR.x2 - 22},${AR.y + 13}`, fill: 'none', stroke: C.dim, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, r.arrow);
    r.arTop = el('text', { x: (AR.x1 + AR.x2) / 2, y: AR.y - 26, 'font-size': 28, 'text-anchor': 'middle', class: 'sans', style: `fill:${C.ink}` }, s, 'fine-tuning');
    r.arCost = el('text', { x: (AR.x1 + AR.x2) / 2, y: AR.y + 50, 'font-size': 24, 'text-anchor': 'middle', style: `fill:${C.base}` }, s, 'peaks at 14,345 MiB');

    // tokens in flight along the arrow (only during motion)
    r.flight = el('g', { opacity: 0 }, s);
    [[0, 30], [44, 52], [-38, 22]].forEach(([dy, w], i) => el('rect', { x: AR.x1 + i * 26, y: AR.y - 6 + dy * 0.6, width: w, height: 12, rx: 6, fill: C.ink, 'fill-opacity': 0.62 }, r.flight));

    // B: your model = the same 28 layers + small LoRA adapters
    r.bSlats = []; r.bTabs = [];
    const gB = el('g', {}, s);
    for (let i = 0; i < NL; i++) {
      const y = EY + i * (SH + SG);
      r.bSlats.push(el('rect', { x: B.x, y, width: B.w, height: SH, rx: 1.5, fill: C.dim, 'fill-opacity': 0.42 }, gB));
      r.bTabs.push(el('rect', { x: B.x + B.w + 6, y, width: B.tab, height: SH, rx: 1.5, fill: C.ours }, gB));
    }
    r.bCap = el('g', {}, s);
    el('text', { x: B.x, y: CAP_Y, 'font-size': 32, class: 'sans', style: `fill:${C.ink}` }, r.bCap, 'your model');
    const bt = el('text', { x: B.x, y: CAP_Y + 34, 'font-size': 20 }, r.bCap);
    el('tspan', { style: `fill:${C.ours}` }, bt, 'LoRA adapters');
    el('tspan', {}, bt, ' learn');

    // lane: the same fine-tune with our kernels, on the core box's scale
    r.lane = el('g', {}, s);
    const lt = el('text', { x: X0, y: LY - 20, 'font-size': 26 }, r.lane);
    el('tspan', { style: `fill:${C.ours}` }, lt, fmt(OURS) + ' MiB');
    el('tspan', { class: 'sans', style: `fill:${C.dim}`, dx: 14 }, lt, 'the same fine-tune with our kernels');
    r.laneEdge = el('rect', { x: X0, y: LY, width: W, height: LH, rx: 4, fill: 'none', stroke: C.dim, 'stroke-opacity': 0.55, 'stroke-width': 1.5, 'stroke-dasharray': '6 7' }, r.lane);
    r.laneFill = el('rect', { x: X0, y: LY, width: X(OURS) - X0, height: LH, rx: 4, fill: C.ours }, r.lane);
    r.free = el('text', { x: X(OURS) + 30, y: LY + LH / 2 + 9, 'font-size': 26 }, s);
    r.free1 = el('tspan', { style: `fill:${C.ink}` }, r.free, fmt(MAX - OURS) + ' MiB free:');
    r.free2 = el('tspan', { class: 'sans', dx: 14 }, r.free, 'a cheaper card will do,');
    r.free3 = el('tspan', { class: 'sans', dx: 10 }, r.free, 'or other work runs alongside');

    r.h = root.querySelector('.wy-h');
    r.sub = root.querySelector('.wy-sub');
    R = r;
  }

  function story(tl, t, api) {
    const r = R;
    const wOurs = X(OURS) - X0;
    tl.set([r.h, r.sub], { opacity: 0, y: 20 }, 0)
      .set([...r.aSlats, ...r.bSlats], { opacity: 0 }, 0)
      .set(r.dRows, { opacity: 0, x: -24 }, 0)
      .set([r.aCap, r.dCap, r.bCap, r.plus, r.arTop, r.arCost, r.arrow], { opacity: 0 }, 0)
      .set(r.bTabs, { attr: { width: 0 } }, 0)
      .set(r.flight, { opacity: 0, x: 0 }, 0)
      .set(r.lane, { opacity: 0 }, 0)
      .set(r.laneFill, { attr: { width: 0 } }, 0)
      .set([r.free1, r.free2, r.free3], { opacity: 0 }, 0);

    tl.to(r.h, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t.h);
    // a ready model: 28 layers stack up from the top
    tl.to(r.aSlats, { opacity: 1, duration: 0.25, stagger: t.slatStagger, ease: 'power1.out' }, t.model);
    tl.to(r.aCap, { opacity: 1, duration: 0.5 }, t.modelCap);
    // + your data
    tl.to(r.plus, { opacity: 1, duration: 0.4 }, t.data - 0.1);
    tl.to(r.dRows, { opacity: 1, x: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out' }, t.data);
    tl.to(r.dCap, { opacity: 1, duration: 0.5 }, t.dataCap);
    // -> training: tokens travel the arrow, the same layers come out with adapters
    tl.to([r.arrow, r.arTop], { opacity: 1, duration: 0.5, ease: 'power1.out' }, t.train);
    tl.to(r.flight, { opacity: 1, duration: 0.2 }, t.train + 0.1);
    tl.to(r.flight, { x: AR.x2 - AR.x1 - 70, duration: 0.9, ease: 'power1.inOut' }, t.train + 0.1);
    tl.to(r.flight, { opacity: 0, duration: 0.25 }, t.train + 0.8);
    tl.to(r.bSlats, { opacity: 1, duration: 0.25, stagger: 0.012, ease: 'power1.out' }, t.train + 0.5);
    tl.to(r.bTabs, { attr: { width: B.tab }, duration: 0.45, stagger: 0.02, ease: 'power2.out' }, t.train + 0.8);
    tl.to(r.bCap, { opacity: 1, duration: 0.5 }, t.train + 1.0);
    // ...and it needs memory: the core box fills to the base peak
    tl.to(r.arCost, { opacity: 1, duration: 0.5 }, t.cost);
    tl.add(api.box.to([], { duration: 0.45, ease: 'power2.in' }), t.cost - 0.45);
    tl.add(api.box.to(BOX, { duration: 1.2, ease: 'power2.inOut' }), t.cost);
    // the card most people have
    tl.to(r.sub, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t.t4);
    // our version of the same job, same scale
    tl.to(r.lane, { opacity: 1, duration: 0.5 }, t.lane);
    tl.to(r.laneFill, { attr: { width: wOurs }, duration: t.laneDur, ease: 'power2.out' }, t.lane + 0.2);
    tl.to(r.free1, { opacity: 1, duration: 0.5 }, t.free1);
    tl.to(r.free2, { opacity: 1, duration: 0.5 }, t.free2);
    tl.to(r.free3, { opacity: 1, duration: 0.5 }, t.free3);
    return tl;
  }

  function enter(root, api) {
    api.box.show();
    const tl = gsap.timeline();
    return story(tl, {
      h: 0, model: 0.3, slatStagger: 0.018, modelCap: 0.6, data: 0.9, dataCap: 1.2, train: 1.6,
      cost: 2.9, t4: 3.4, lane: 4.2, laneDur: 0.9, free1: 5.0, free2: 5.3, free3: 5.6,
    }, api);
  }

  function video(root, api, seg) {
    api.box.show();
    const w = (word, k, fb) => { const v = api.word(seg, word, k || 0); return v == null || isNaN(v) ? fb : v; };
    const tModel = w('готовую', 0, 3.0);
    const tl = gsap.timeline({ paused: true });
    story(tl, {
      h: w('зачем', 0, 0.15),
      model: w('дообучение', 0, 1.49), slatStagger: Math.max(0.012, (tModel + 0.4 - w('дообучение', 0, 1.49)) / NL),
      modelCap: tModel,
      data: w('своих', 0, 4.66), dataCap: w('данных', 0, 5.02),
      train: w('данных', 0, 5.02) + 0.5,
      cost: w('дорогая', 0, 6.88),
      t4: w('ти-четыре', 0, 8.22),
      lane: w('если', 0, 13.29), laneDur: Math.max(0.6, w('половиной', 0, 14.72) + 0.3 - w('если', 0, 13.29) - 0.2),
      free1: w('помещается', 0, 15.64), free2: w('дешёвом', 0, 16.34), free3: w('рядом', 0, 17.33),
    }, api);
    tl.set({}, {}, seg.duration);
    return tl;
  }

  Deck.chapter({
    n: 2, id: 'why',
    title: 'Memory decides who can fine-tune at all.',
    html, css, box: BOX, build, enter, video,
  });
})();
