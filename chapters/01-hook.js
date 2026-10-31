/* Chapter 01 — hook.
   The whole story in one move: the T4's memory, cut into sixths, fills to the base's
   14,345 MiB, then drains to our 2,479 MiB, which sits inside the first sixth.
   Static SVG/HTML is built at the keyframe; every timeline animates *from* earlier
   states, so progress(1) (or no animation at all) is the keyframe. */
(function () {
  'use strict';
  const MAX = 15360, BASE = 14345, OURS = 2479, SIXTH = MAX / 6; // 2,560
  const X0 = 120, X1 = 1800, W = X1 - X0;
  const X = m => X0 + m / MAX * W;
  const BY = 612, BH = 248;            // the big box: y 612..860 (core box is hidden on this slide)
  const NUM_Y = BY + BH - 34;          // baseline of the numbers inside the box
  const fmt = n => Math.round(n).toLocaleString('en-US');

  const css = `
.ch-hook .hk { position: absolute; inset: 0; }
.ch-hook .hk-team { position: absolute; left: 120px; top: 116px; display: flex; align-items: baseline; gap: 26px; }
.ch-hook .hk-team b { font: 700 38px/1 var(--sans, "Onest"), sans-serif; letter-spacing: -0.02em; color: #E8EDF2; }
.ch-hook .hk-team span { font: 400 24px/1 var(--sans, "Onest"), sans-serif; color: #8A96A3; }
.ch-hook .hk-h { position: absolute; left: 116px; top: 222px; margin: 0; font: 650 92px/1.04 var(--sans, "Onest"), sans-serif; letter-spacing: -0.035em; color: #E8EDF2; }
.ch-hook .hk-h span { display: block; white-space: nowrap; }
.ch-hook .hk-sub { position: absolute; left: 120px; top: 470px; margin: 0; font: 400 28px/1.3 var(--sans, "Onest"), sans-serif; color: #8A96A3; white-space: nowrap; }
.ch-hook .hk-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; pointer-events: none; }
.ch-hook .hk-svg text { font-family: var(--mono, "Plex Mono"), "IBM Plex Mono", monospace; font-weight: 500; fill: #8A96A3; }
.ch-hook .hk-svg .hk-word { font-family: var(--sans, "Onest"), sans-serif; font-weight: 600; }
`;

  const html = `
<div class="hk">
  <div class="hk-team"><b>KaskyrAlmaty</b><span>Soup Kernel Challenge, Decentrathon 6.0</span></div>
  <h1 class="hk-h"><span class="hk-l1">One small fine-tune fills a free GPU.</span><span class="hk-l2">We made it fit in a sixth.</span></h1>
  <p class="hk-sub">Same data, same steps, same eval loss. Peak memory measured by nvidia-smi.</p>
  <svg class="hk-svg" viewBox="0 0 1920 1080" data-allow-box-zone></svg>
</div>`;

  let R = null; // refs, filled by build()

  function build(root, api) {
    const C = api.C, el = api.el;
    const s = root.querySelector('.hk-svg');
    const r = { root };

    // axis caption (left) and the card (right), above the box
    r.cap = el('text', { x: X0, y: BY - 22, 'font-size': 22 }, s, 'peak GPU memory, MiB');
    r.card = el('text', { x: X1, y: BY - 22, 'font-size': 22, 'text-anchor': 'end' }, s, 'Kaggle T4: 15,360 MiB usable');

    // the card's memory
    r.frame = el('rect', { x: X0, y: BY, width: W, height: BH, fill: C.panel, stroke: C.line, 'stroke-width': 2, rx: 6 }, s);

    // fill: base (orange) under ours (green); same width, the colour crossfades on the drain
    const clipId = 'hk-clip';
    const defs = el('defs', {}, s);
    const cp = el('clipPath', { id: clipId }, defs);
    r.clipRect = el('rect', { x: X0, y: BY, width: W, height: BH, rx: 6 }, cp);
    // the base's footprint, tinted under the fills (stays visible after the drain)
    r.ghostTint = el('rect', { x: X0, y: BY, width: X(BASE) - X0, height: BH, fill: C.base, 'fill-opacity': 0.07 }, s);
    const fills = el('g', { 'clip-path': `url(#${clipId})` }, s);
    r.fBase = el('rect', { x: X0, y: BY, width: X(OURS) - X0, height: BH, fill: C.base, opacity: 0 }, fills);
    r.fOurs = el('rect', { x: X0, y: BY, width: X(OURS) - X0, height: BH, fill: C.ours }, fills);

    // ghost of the base, left behind by the drain
    r.ghost = el('g', {}, s);
    el('rect', { x: X0 + 1, y: BY + 1, width: X(BASE) - X0 - 2, height: BH - 2, fill: 'none', stroke: C.base, 'stroke-width': 2.5, rx: 5 }, r.ghost);
    r.ghostNum = el('text', { x: X(BASE) - 22, y: NUM_Y, 'text-anchor': 'end', 'font-size': 76, fill: C.base, style: `fill:${C.base}` }, r.ghost, fmt(BASE));
    r.ghostWord = el('text', { x: X(BASE) - 22, y: BY + 50, 'text-anchor': 'end', 'font-size': 26, class: 'hk-word', style: `fill:${C.base}` }, r.ghost, 'base');

    // sixths: the dividers that make "a sixth" visible
    r.divs = [];
    for (let k = 1; k < 6; k++) {
      r.divs.push(el('line', { x1: X(k * SIXTH), x2: X(k * SIXTH), y1: BY + 2, y2: BY + BH - 2, stroke: C.bg, 'stroke-width': 3, 'stroke-opacity': 0.9 }, s));
    }
    // first sixth, outlined in ink when ours lands inside it
    r.sixth = el('rect', { x: X0 - 4, y: BY - 4, width: X(SIXTH) - X0 + 8, height: BH + 8, fill: 'none', stroke: C.ink, 'stroke-width': 2, rx: 8 }, s);

    // axis under the box: fractions of the card
    r.ticks = [];
    for (let k = 0; k <= 6; k++) {
      const label = k === 0 ? '0' : k === 6 ? '15,360' : `${k}/6`;
      r.ticks.push(el('text', { x: X(k * SIXTH), y: BY + BH + 40, 'font-size': 22, 'text-anchor': k === 0 ? 'start' : k === 6 ? 'end' : 'middle' }, s, label));
    }
    r.ticks[1].style.fill = C.ours;

    // the riding number: it sits at the fill's edge and counts with it
    r.num = el('text', { x: X(OURS) - 22, y: NUM_Y, 'text-anchor': 'end', 'font-size': 76, style: `fill:${C.bg}` }, s, fmt(OURS));
    r.word = el('text', { x: X0 + 22, y: BY + 50, 'font-size': 26, class: 'hk-word', style: `fill:${C.bg}` }, s, 'ours');

    r.l1 = root.querySelector('.hk-l1');
    r.l2 = root.querySelector('.hk-l2');
    r.sub = root.querySelector('.hk-sub');
    r.team = root.querySelector('.hk-team');
    r.C = C;
    R = r;
    // keep the number glued to the fill even if a seek suppresses onUpdate callbacks
    gsap.ticker.add(sync);
  }

  // number text and position follow the fill's current width
  function sync() {
    if (!R) return;
    const w = +R.fBase.getAttribute('width');
    const mib = Math.max(0, w / W * MAX);
    const t = fmt(mib);
    if (R.num.textContent !== t) R.num.textContent = t;
    R.num.setAttribute('x', Math.max(X0 + w - 22, X0 + 230).toFixed(1));
    R.word.textContent = +R.fOurs.getAttribute('opacity') > 0.5 ? 'ours' : 'base';
  }

  // one parametrised story: fill, (T4 named), drain, the sixth, the claim
  function story(tl, t, api) {
    const r = R, C = r.C;
    const wOf = m => X(m) - X0;
    // reset to the empty card
    tl.set([r.fBase, r.fOurs], { attr: { width: 0 } }, 0)
      .set(r.fBase, { attr: { opacity: 1 } }, 0)
      .set(r.fOurs, { attr: { opacity: 0 } }, 0)
      .set([r.ghost, r.ghostTint, r.ghostNum, r.ghostWord], { opacity: 0 }, 0)
      .set(r.sixth, { opacity: 0 }, 0)
      .set(r.ticks[1], { fill: '#8A96A3' }, 0)
      .set([r.l1, r.l2, r.sub], { opacity: 0, y: 24 }, 0)
      .set(r.card, { opacity: 0 }, 0)
      .set(r.team, { opacity: 0 }, 0)
      .set(r.num, { opacity: 1 }, 0);

    tl.to(r.team, { opacity: 1, duration: 0.6, ease: 'power1.out' }, t.team);
    // fill to the base peak; the number counts with the edge
    tl.to([r.fBase, r.fOurs], { attr: { width: wOf(BASE) }, duration: t.fillDur, ease: 'power2.inOut', onUpdate: sync }, t.fill);
    tl.to(r.l1, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t.l1);
    tl.to(r.card, { opacity: 1, duration: 0.6, ease: 'power1.out' }, t.card);
    // the claim, then the drain: the base is left behind as a ghost
    tl.to(r.l2, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t.l2);
    tl.to([r.ghost, r.ghostTint], { opacity: 1, duration: 0.5, ease: 'power1.out' }, t.drain - 0.15);
    // the base's number is left behind once the moving number has cleared it
    tl.to([r.ghostNum, r.ghostWord], { opacity: 1, duration: 0.4, ease: 'power1.out' }, t.drain + t.drainDur * 0.6);
    tl.to([r.fBase, r.fOurs], { attr: { width: wOf(OURS) }, duration: t.drainDur, ease: 'power3.inOut', onUpdate: sync }, t.drain);
    tl.to(r.fOurs, { attr: { opacity: 1 }, duration: 0.35, ease: 'power1.inOut', onUpdate: sync }, t.drain);
    tl.to(r.fBase, { attr: { opacity: 0 }, duration: 0.2 }, t.drain + 0.3);
    // ours lands inside the first sixth
    tl.to(r.sixth, { opacity: 1, duration: 0.5, ease: 'power1.out' }, t.drain + t.drainDur - 0.05);
    tl.to(r.ticks[1], { fill: C.ours, duration: 0.5, ease: 'power1.out' }, t.drain + t.drainDur - 0.05);
    tl.to(r.sub, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t.sub);
    tl.call(sync, null, t.drain + t.drainDur + 0.01);
    return tl;
  }

  function enter(root, api) {
    api.box.hide();
    const tl = gsap.timeline({ onUpdate: sync });
    return story(tl, { team: 0.1, fill: 0.3, fillDur: 1.6, l1: 0.6, card: 1.2, l2: 2.3, drain: 2.5, drainDur: 1.4, sub: 4.0 }, api);
  }

  function video(root, api, seg) {
    api.box.hide();
    const w = (word, k, fb) => { const v = api.word(seg, word, k || 0); return v == null || isNaN(v) ? fb : v; };
    const tFill = w('четырнадцать', 0, 0.08);
    const tFillEnd = w('видеопамяти', 0, 1.24) + 0.6;          // lands as "видеопамяти" ends
    const tLand = w('половиной', 0, 8.78) + 0.25;              // lands on "два с половиной"
    const tDrain = w('влезает', 0, 7.97);
    const tl = gsap.timeline({ paused: true, onUpdate: sync });
    story(tl, {
      team: 0,
      fill: tFill, fillDur: Math.max(0.8, tFillEnd - tFill),
      l1: w('столько', 0, 2.32),
      card: w('ти-четыре', 0, 5.69),
      l2: w('мы', 0, 6.81),
      drain: tDrain, drainDur: Math.max(0.6, tLand - tDrain),
      sub: w('те', 0, 9.59),
    }, api);
    // hand-off to chapter 2: the big box morphs into the core box (x 120-1800, y 930-990),
    // ours at 2,479, then the core box itself fades in on top in the state chapter 2 starts from
    const G = api.geom || { y0: 930, y1: 990 };
    const tM = Math.max(w('результат', 0, 11.3) + 0.5, seg.duration - 1.5), mD = 0.8;
    const r = R;
    const STATE = [{ key: 'ours', mib: OURS, color: 'ours', label: 'ours' }];
    api.box.set(STATE);
    tl.set(api.box.node, { opacity: 0 }, 0);
    const geo = { attr: { y: G.y0, height: G.y1 - G.y0, rx: 0 }, duration: mD, ease: 'power2.inOut' };
    tl.to([r.frame, r.clipRect, r.fBase, r.fOurs, r.ghostTint], geo, tM);
    tl.to(r.frame, { attr: { 'stroke-width': 1 }, duration: mD, ease: 'power2.inOut' }, tM);
    tl.to([r.team, r.l1, r.l2, r.sub], { opacity: 0, duration: 0.5, ease: 'power1.in' }, tM);
    tl.to([r.cap, r.card, r.ghost, r.ghostTint, r.sixth, r.num, r.word].concat(r.divs, r.ticks), { opacity: 0, duration: 0.4, ease: 'power1.in' }, tM);
    tl.to(api.box.node, { opacity: 1, duration: 0.3, ease: 'power1.out' }, tM + mD - 0.1);
    tl.set({}, {}, seg.duration);
    return tl;
  }

  Deck.chapter({
    n: 1, id: 'hook',
    title: 'One small fine-tune fills a free GPU. We made it fit in a sixth.',
    html, css,
    box: [{ key: 'ours', mib: OURS, color: 'ours', label: 'ours' }],
    build, enter, video,
  });
})();
