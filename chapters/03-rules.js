/* Chapter 03 · rules — "We may change how it computes, not what it computes."
   One picture: the training as wires through a block. The wires going in (model, data, batches,
   LoRA, optimizer) and coming out (adapter, losses, entropy, accuracy, rewind rows) are locked;
   only the block in the middle, how it computes, is ours. Below, the gate: 10 checks, then the
   score formula, or 0 points. The memory box keeps the base's 14,345 MiB, sealed: it is the
   denominator of m. build() leaves the keyframe; enter()/video() animate into it. */
(function () {
  const BOX = [{ key: 'base', mib: 14345, color: 'base', label: 'base Soup run, measured' }];

  const IN = [
    ['model', 'Qwen2.5-1.5B, NF4'],
    ['data', '256 rows, same order'],
    ['batches', '4 × 512, 64 steps'],
    ['LoRA', 'r 16, α 32, dropout 0.05'],
    ['optimizer', 'AdamW, cosine'],
  ];
  const OUT = ['the same LoRA adapter', 'loss at every step', 'entropy, token accuracy', 'rewind rows', 'held-out eval loss'];
  const HOW = ['our own Triton kernels', 'what stays in memory', 'what is rebuilt, and when'];
  const ROW0 = 334, DY = 56;
  const MID = { x: 700, y: 262, w: 470, h: 330 };
  const GATE = { x: 120, y: 700, w: 44, h: 60, step: 56 };
  const FORK = { x: 724, y: GATE.y + GATE.h / 2 };

  // A padlock: body + shackle. Closed when the shackle sits down; the shackle is its own group to animate.
  function lock(api, parent, cx, cy, s, color, cls) {
    const g = api.el('g', { class: 'r-lock ' + (cls || ''), transform: `translate(${cx},${cy})` }, parent);
    const sh = api.el('g', { class: 'r-shackle' }, g);
    api.el('path', { d: `M${-s * 0.28},${-s * 0.05} V${-s * 0.32} a${s * 0.28},${s * 0.28} 0 0 1 ${s * 0.56},0 V${-s * 0.05}`, fill: 'none', stroke: color, 'stroke-width': Math.max(2, s * 0.11), 'stroke-linecap': 'round' }, sh);
    api.el('rect', { x: -s * 0.42, y: -s * 0.08, width: s * 0.84, height: s * 0.62, rx: s * 0.08, fill: color }, g);
    api.el('circle', { cx: 0, cy: s * 0.2, r: s * 0.07, fill: '#0B0F14' }, g);
    return { g, sh };
  }

  Deck.chapter({
    n: 3, id: 'rules',
    title: 'We may change how it computes, not what it computes.',
    html: `
      <h2 class="r-h">We may change how it computes,<br>not what it computes.</h2>
      <svg class="r-svg" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>`,
    css: `
      .ch-rules .r-h { position: relative; z-index: 2; }
      .ch-rules .r-svg { position: absolute; left: 0; top: 0; overflow: visible; }
      .ch-rules .r-svg text { font-family: var(--sans); font-weight: 500; }
      .ch-rules .r-svg .r-k { font-size: 20px; fill: var(--dim); }
      .ch-rules .r-svg .r-v { font-size: 25px; fill: var(--ink); }
      .ch-rules .r-svg .r-col { font-size: 19px; fill: var(--dim); }
      .ch-rules .r-svg .r-how-t { font-size: 32px; font-weight: 650; fill: var(--ink); letter-spacing: -0.01em; }
      .ch-rules .r-svg .r-how-v { font-size: 24px; fill: #C9D6F5; }
      .ch-rules .r-svg .r-how-n { font: 500 17px var(--mono); fill: var(--mech); }
      .ch-rules .r-svg .r-gate-n { font: 500 19px var(--mono); fill: var(--ink); }
      .ch-rules .r-svg .r-checks { font-size: 25px; font-weight: 600; fill: var(--ink); }
      .ch-rules .r-svg .r-score { font: 500 30px var(--mono); fill: var(--ink); }
      .ch-rules .r-svg .r-sub { font-size: 20px; fill: var(--dim); }
      .ch-rules .r-svg .r-fail { font-size: 25px; font-weight: 600; fill: var(--base); }
      .ch-rules .r-svg .r-small { font: 500 17px var(--mono); fill: var(--dim); }`,
    box: BOX,

    build(root, api) {
      const { el, C } = api;
      const s = root.querySelector('.r-svg');
      const rowY = i => ROW0 + i * DY;

      // column notes
      el('text', { x: 120, y: 286, class: 'r-col r-in-col' }, s, 'Locked going in');
      el('text', { x: 1262, y: 286, class: 'r-col r-out-col' }, s, 'Locked coming out');

      // inputs: lock, key, value, wire into the block
      IN.forEach(([k, v], i) => {
        const g = el('g', { class: 'r-in' }, s);
        lock(api, g, 133, rowY(i) - 7, 24, C.ink);
        el('text', { x: 162, y: rowY(i), class: 'r-k' }, g, k);
        el('text', { x: 290, y: rowY(i), class: 'r-v' }, g, v);
        el('path', { d: `M646,${rowY(i) - 8} H${MID.x}`, stroke: C.edge, 'stroke-width': 2, fill: 'none', class: 'r-wire r-wire-in' }, s);
      });
      // outputs: wire out of the block, lock, value
      OUT.forEach((v, i) => {
        el('path', { d: `M${MID.x + MID.w},${rowY(i) - 8} H1246`, stroke: C.edge, 'stroke-width': 2, fill: 'none', class: 'r-wire r-wire-out' }, s);
        const g = el('g', { class: 'r-out' }, s);
        lock(api, g, 1275, rowY(i) - 7, 24, C.ink);
        el('text', { x: 1304, y: rowY(i), class: 'r-v' }, g, v);
      });

      // the block in the middle: how it computes, open to us
      const mid = el('g', { class: 'r-mid' }, s);
      el('rect', { x: MID.x, y: MID.y, width: MID.w, height: MID.h, rx: 6, fill: C.mech, 'fill-opacity': 0.10, class: 'r-mid-fill' }, mid);
      el('rect', { x: MID.x + 1, y: MID.y + 1, width: MID.w - 2, height: MID.h - 2, rx: 6, fill: 'none', stroke: C.mech, 'stroke-width': 2, class: 'r-mid-edge', pathLength: 1 }, mid);
      const open = lock(api, mid, MID.x + 44, MID.y + 56, 30, C.mech, 'r-open');
      open.sh.setAttribute('transform', 'translate(7,-9) rotate(18)');
      const midText = el('g', { class: 'r-mid-text' }, mid);
      el('text', { x: MID.x + 78, y: MID.y + 66, class: 'r-how-t' }, midText, 'How it computes');
      HOW.forEach((t, i) => {
        el('text', { x: MID.x + 40, y: MID.y + 140 + i * 50, class: 'r-how-v' }, midText, t);
      });
      el('text', { x: MID.x + 40, y: MID.y + MID.h - 26, class: 'r-how-n' }, midText, 'ours to change; its time counts');

      // the gate: 10 checks
      el('text', { x: 120, y: GATE.y - 26, class: 'r-checks' }, s, '10 admission checks');
      const gates = el('g', { class: 'r-gates' }, s);
      for (let i = 0; i < 10; i++) {
        const g = el('g', { class: 'r-gate', 'data-i': i }, gates);
        const x = GATE.x + i * GATE.step;
        el('rect', { x: x + 1, y: GATE.y + 1, width: GATE.w - 2, height: GATE.h - 2, rx: 3, fill: C.panel, stroke: C.edge, 'stroke-width': 2, class: 'r-gate-box' }, g);
        el('text', { x: x + GATE.w / 2, y: GATE.y + GATE.h / 2 + 7, 'text-anchor': 'middle', class: 'r-gate-n' }, g, String(i + 1));
      }
      // the fork: all pass → score; one fails → 0 points
      const gx = GATE.x + 9 * GATE.step + GATE.w;
      const up = 676, dn = 820;
      el('path', { d: `M${gx},${FORK.y} H${FORK.x}`, stroke: C.edge, 'stroke-width': 2, fill: 'none', class: 'r-fork-stem' }, s);
      el('path', { d: `M${FORK.x},${FORK.y} V${up - 8} Q${FORK.x},${up - 16} ${FORK.x + 8},${up - 16} H${FORK.x + 28}`, stroke: C.ours, 'stroke-width': 2, fill: 'none', class: 'r-fork-up', pathLength: 1 }, s);
      el('path', { d: `M${FORK.x},${FORK.y} V${dn - 1} Q${FORK.x},${dn + 7} ${FORK.x + 8},${dn + 7} H${FORK.x + 28}`, stroke: C.base, 'stroke-width': 2, fill: 'none', class: 'r-fork-dn', pathLength: 1 }, s);
      const pass = el('g', { class: 'r-pass' }, s);
      el('text', { x: FORK.x + 44, y: up - 8, class: 'r-small' }, pass, 'all 10 pass');
      const sc = el('text', { x: FORK.x + 44, y: up + 36, class: 'r-score' }, pass);
      el('tspan', {}, sc, 'score = ');
      el('tspan', { fill: C.mech }, sc, '35·ln(s′)/ln(1.5)');
      el('tspan', {}, sc, ' + ');
      el('tspan', { fill: C.ours }, sc, '30·ln(m′)/ln(3)');
      el('text', { x: FORK.x + 44, y: up + 76, class: 'r-sub' }, pass, 's, m = base ÷ ours, for time and memory; s′, m′ = 1.0 when the ratio is under 1.05.');
      el('text', { x: FORK.x + 44, y: dn + 15, class: 'r-fail' }, s, 'one fails: not admitted, 0 points');

      // fail marker on one gate (video only; hidden at keyframe)
      const fx = GATE.x + 4 * GATE.step;
      el('rect', { x: fx + 1, y: GATE.y + 1, width: GATE.w - 2, height: GATE.h - 2, rx: 3, fill: C.base, class: 'r-gate-fail', opacity: 0 }, s);
      el('path', { d: `M${fx + 14},${GATE.y + 20} l16,20 M${fx + 30},${GATE.y + 20} l-16,20`, stroke: C.bg, 'stroke-width': 3.5, 'stroke-linecap': 'round', class: 'r-gate-x', opacity: 0 }, s);
    },

    // The timeline, parameterised by beat times; enter() and video() differ only in T.
    _tl(root, api, T, D) {
      const q = sel => root.querySelectorAll(sel);
      const tl = gsap.timeline();
      const box = api.box;
      // the seal on the box: a lock at the 14,345 edge (box annotation; core clears it on the next slide)
      box.clearAnnotations();
      const sealX = box.X(14345);
      const seal = api.el('g', { class: 'r-seal' }, box.node);
      api.el('rect', { x: sealX - 15, y: 945, width: 30, height: 30, rx: 4, fill: api.C.bg, stroke: api.C.ink, 'stroke-width': 1.5 }, seal);
      const sl = lock(api, seal, sealX, 963, 20, api.C.ink);

      tl.add(box.to(BOX, { duration: 0.6 }), 0);
      tl.fromTo(root.querySelector('.r-h'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, T.head);

      // ours: the middle block draws itself, its text arrives
      tl.fromTo(q('.r-mid-edge'), { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: D.mid, ease: 'power2.inOut' }, T.mid);
      tl.fromTo(q('.r-mid-fill'), { opacity: 0 }, { opacity: 1, duration: D.mid * 0.8, ease: 'power1.out' }, T.mid + D.mid * 0.4);
      tl.fromTo(q('.r-open, .r-mid-text'), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out', stagger: 0.12 }, T.mid + D.mid * 0.5);

      // what is locked: each item arrives, then its shackle snaps shut
      const ins = q('.r-in'), outs = q('.r-out');
      tl.fromTo(q('.r-in-col'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.in[0] - 0.1);
      ins.forEach((g, i) => {
        const t = T.in[i];
        tl.fromTo(g, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' }, t);
        tl.fromTo(g.querySelector('.r-shackle'), { y: -7 }, { y: 0, duration: 0.22, ease: 'power3.in' }, t + 0.3);
        tl.fromTo(q('.r-wire-in')[i], { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 0.15);
      });
      tl.fromTo(q('.r-out-col'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.out[0] - 0.1);
      outs.forEach((g, i) => {
        const t = T.out[i];
        tl.fromTo(q('.r-wire-out')[i], { opacity: 0 }, { opacity: 1, duration: 0.4 }, t);
        tl.fromTo(g, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' }, t + 0.08);
        tl.fromTo(g.querySelector('.r-shackle'), { y: -7 }, { y: 0, duration: 0.22, ease: 'power3.in' }, t + 0.38);
      });
      // the box's 14,345 is sealed too: it is the reference every ratio divides
      tl.fromTo(seal, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.seal);
      tl.fromTo(sl.sh, { y: -6 }, { y: 0, duration: 0.22, ease: 'power3.in' }, T.seal + 0.25);

      // the gate
      tl.fromTo(q('.r-checks'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.gates - 0.15);
      tl.fromTo(q('.r-gate'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: D.gate }, T.gates);
      tl.fromTo(q('.r-fork-stem'), { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.fork);
      tl.fromTo(q('.r-fork-up'), { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, T.fork + 0.1);
      tl.fromTo(q('.r-pass'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, T.fork + 0.35);

      // one fails (video): a gate goes red, the red branch takes the run to 0 points; the gate clears,
      // the rule stays.
      if (T.fail != null) {
        tl.fromTo(q('.r-gate-fail, .r-gate-x'), { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, T.fail);
        tl.to(q('.r-pass, .r-fork-up'), { opacity: 0.25, duration: 0.4 }, T.fail + 0.1);
        tl.fromTo(q('.r-fork-dn'), { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, T.zero - 0.3);
        tl.fromTo(q('.r-fail'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, T.zero);
        tl.to(q('.r-gate-fail, .r-gate-x'), { opacity: 0, duration: 0.6, ease: 'power1.inOut' }, T.clear);
        tl.to(q('.r-pass, .r-fork-up'), { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, T.clear);
      } else {
        tl.fromTo(q('.r-fork-dn'), { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, T.fork + 0.25);
        tl.fromTo(q('.r-fail'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, T.fork + 0.5);
      }
      return tl;
    },

    enter(root, api) {
      const T = { head: 0, mid: 0.35, in: [0.9, 1.0, 1.1, 1.2, 1.3], out: [1.65, 1.75, 1.85, 1.95, 2.05], seal: 2.4, gates: 2.7, fork: 3.35 };
      return this._tl(root, api, T, { mid: 0.9, gate: 0.05 });
    },

    video(root, api, seg) {
      const w = (x, k) => api.word(seg, x, k || 0);
      const tKern = w('ядра');                    // "свои ядра на Тритоне" — the block is ours
      const tModel = w('модель'), tData = w('данные'), tSteps = w('шаги'), tMetr = w('метрики');
      const tTen = w('десять'), tOne = w('одна'), tFail = w('прошла'), tZero = w('засчитывают');
      const T = {
        head: 0,
        mid: Math.max(0.6, tKern - 0.6),
        // model, data, batches/steps, LoRA, optimizer: on "модель", "данные", "шаги" (LoRA and optimizer follow the steps)
        in: [tModel - 0.1, tData - 0.1, tSteps - 0.1, tSteps + 0.12, tSteps + 0.34],
        // outputs on "метрики"
        out: [tMetr - 0.1, tMetr + 0.04, tMetr + 0.18, tMetr + 0.32, tMetr + 0.46],
        seal: w('трогать') + 0.1,
        gates: tTen - 0.05,
        fork: tTen + 0.9,
        fail: tFail - 0.1,
        zero: tZero - 0.35,
        clear: Math.min(seg.duration - 0.75, tZero + 0.75),
      };
      const tl = this._tl(root, api, T, { mid: 1.0, gate: 0.07 });
      if (tl.duration() < seg.duration) tl.to({}, { duration: seg.duration - tl.duration() });
      return tl;
    },
  });
})();
