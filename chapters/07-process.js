/* Chapter 7, process: "We found it by measuring: ~550 ledger rows."
   The chart is window.LEDGER (presentation/assets/ledger.js, generated from ledger/*.tsv): every dot is one
   measured Kaggle T4 run. The green step line is main's measured peak: the base, the example kernel, the first
   kept body recompute (9,661), then every ledger `merge` row, then the submitted 63fd58c (2,479).
   One proxy (`clock.t`, hours) drives the sweep, so seeking the video timeline is deterministic. */
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
  const clamp = v => Math.max(0, Math.min(1, v));

  // chart geometry (stage px)
  const X0 = 720, X1 = 1800, YB = 796, YT = 262, TMAX = 32, MMAX = 15360;
  const X = t => X0 + t / TMAX * (X1 - X0);
  const Y = m => YB - m / MMAX * (YB - YT);

  // main's measured path, from the ledger
  function mainPath(runs) {
    const find = (f, d) => runs.find(f) || d;
    const p = [[0, 14345, 'base']];
    p.push([0, 12385, 'ex']);
    const r9661 = find(r => r[2] === 9661 && r[3] === 'keep', ['b', 2.0, 9661]);
    p.push([r9661[1], 9661, 'body']);
    let best = 9661;
    runs.filter(r => r[3] === 'merge').forEach(r => {
      if (r[2] < best) { p.push([r[1], r[2], r[2] === 5283 ? 'head' : r[2] === 2459 ? 'replay' : 'step', r]); best = r[2]; }
    });
    const sub = find(r => r[2] === 2479 && r[0] === 'h' && r[3] === 'keep', ['h', 31.3, 2479]);
    p.push([sub[1], 2479, 'sub']);
    return p;
  }

  function seq(root, api, T, total) {
      const P = root._p7, tl = gsap.timeline();
      const E2 = 'power2.out';
      const fade = (targets, at, dur = 0.5, from = { opacity: 0 }, to = {}) =>
        tl.fromTo(targets, from, { opacity: 1, duration: dur, ease: E2, ...to }, at);
      // initial states
      tl.set(P.clock, { t: 0, onUpdate: P.draw, onComplete: P.draw }, 0);
      tl.call(P.draw, null, 0);
      fade(root.querySelector('.p7-h'), T.head, 0.6, { opacity: 0, y: 14 }, { y: 0 });
      fade(root.querySelector('.p7-sub'), T.sub, 0.6, { opacity: 0, y: 10 }, { y: 0 });
      fade(P.grid, T.grid, 0.6);
      fade([P.baseLine, P.baseTx], T.grid + 0.2, 0.6);
      P.people.forEach((p, i) => {
        fade(p.g, T.people + i * 0.25, 0.5, { opacity: 0, x: -10 }, { x: 0 });
        tl.fromTo(p.orch, { attr: { 'fill-opacity': 0 } }, { attr: { 'fill-opacity': 1 }, duration: 0.5, ease: E2 }, T.orch + i * 0.2);
      });
      fade([P.rail, P.ret, P.retHead], T.loop[0] - 0.2, 0.4);
      P.nodes.forEach((nd, i) => {
        fade(nd.g, T.loop[i], 0.4, { opacity: 0.0 });
        tl.fromTo(nd.c, { attr: { fill: C.bg, stroke: C.edge } }, { attr: { fill: C.ours, stroke: C.ours }, duration: 0.3, ease: E2 }, T.loop[i]);
        tl.fromTo(nd.tx, { fill: C.dim }, { fill: C.ink, duration: 0.3, ease: E2 }, T.loop[i]);
      });
      // the sweep: 32 hours of measuring
      fade(P.cur, T.sweep[0] - 0.1, 0.3);
      tl.fromTo(P.clock, { t: 0 }, { t: TMAX, duration: T.sweep[1] - T.sweep[0], ease: 'power1.inOut', onUpdate: P.draw }, T.sweep[0]);
      tl.to(P.cur, { opacity: 0, duration: 0.4 }, T.sweep[1]);
      fade(P.lg[4], T.sweep[0] + 0.6, 0.4); fade(P.lg[5], T.sweep[0] + 0.6, 0.4);
      // reviews, then cross-lane merges
      tl.fromTo(P.reviews, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: E2, stagger: 0.07 }, T.review);
      fade([P.lg[0], P.lg[1]], T.review, 0.4);
      tl.fromTo(P.merges, { opacity: 0, attr: { r: 18 } }, { opacity: 1, attr: { r: 10 }, duration: 0.4, ease: E2, stagger: 0.09 }, T.merge);
      fade([P.lg[2], P.lg[3]], T.merge, 0.4);
      if (total != null) tl.set({}, {}, total);
      return tl;
    }

  Deck.chapter({
    n: 7, id: 'process',
    title: 'We found it by measuring: ~550 ledger rows.',
    html: `
      <h2 class="p7-h">We found it by measuring: ~550 ledger rows.</h2>
      <p class="p7-sub">Two people, two AI orchestrators, one loop for 32 hours. Every dot is a run measured on a Kaggle T4.</p>
      <svg class="p7-svg" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>`,
    css: `
      .ch-process .p7-h { position: relative; z-index: 2; }
      .ch-process .p7-sub { position: relative; z-index: 2; margin-top: 18px; max-width: 1680px; white-space: nowrap; font-size: 24px; line-height: 1.4; color: var(--dim); }
      .ch-process .p7-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: visible; }
      .ch-process .p7-svg text { font-family: var(--mono); font-weight: 500; fill: var(--dim); }
      .ch-process .p7-svg .s { font-family: var(--sans); }
      .ch-process .p7-svg .halo { paint-order: stroke; stroke: var(--bg); stroke-width: 7px; stroke-linejoin: round; }
      .ch-process .p7-svg .ink { fill: var(--ink); }
      .ch-process .p7-svg .ours { fill: var(--ours); }
      .ch-process .p7-svg .base { fill: var(--base); }
      .ch-process .p7-svg .mech { fill: var(--mech); }
    `,
    box: [{ key: 'ours', mib: 2479, color: 'ours', label: 'ours' }],

    build(root, api) {
      const svg = root.querySelector('.p7-svg');
      const L = window.LEDGER || { runs: [], rows: 0, branches: 0 };
      const P = (root._p7 = { svg, dots: [], ms: [], nodes: [], reviews: [], merges: [] });

      /* ---------- left column: who, the loop, the marks ---------- */
      const lx = 120;
      const who = E('g', {}, svg);
      P.people = [
        { y: 300, name: 'Alikhan', lane: 'head lane: the 151,936-token output layer', col: C.mech },
        { y: 370, name: 'Timur', lane: 'body lane: the 28 decoder layers', col: C.ink },
      ].map(o => {
        const g = E('g', {}, who);
        E('circle', { cx: lx + 8, cy: o.y - 8, r: 7, fill: o.col }, g);
        const nt = E('text', { x: lx + 28, y: o.y, class: 's' }, g);
        E('tspan', { class: 'ink', 'font-size': 28, 'font-weight': 600 }, nt, o.name);
        const orch = E('tspan', { 'font-size': 22, dx: 12 }, nt, '+ AI orchestrator');
        E('text', { x: lx + 28, y: o.y + 30, class: 's', 'font-size': 19 }, g, o.lane);
        return { g, orch };
      });

      // the loop: four steps down a rail, a return arc on the left
      const ny = [470, 528, 586, 644], rx = 150;
      const loop = (P.loop = E('g', {}, svg));
      P.rail = E('path', { d: `M${rx},${ny[0]} L${rx},${ny[3]}`, stroke: C.edge, 'stroke-width': 2, fill: 'none' }, loop);
      P.ret = E('path', { d: `M${rx},${ny[3]} C${rx - 44},${ny[3]} ${rx - 44},${ny[0]} ${rx - 8},${ny[0]}`, stroke: C.edge, 'stroke-width': 2, fill: 'none' }, loop);
      P.retHead = E('path', { d: `M${rx - 16},${ny[0] - 6} L${rx - 8},${ny[0]} L${rx - 16},${ny[0] + 6}`, stroke: C.edge, 'stroke-width': 2, fill: 'none' }, loop);
      [['the orchestrator sets a hypothesis'], ['an agent writes the kernel'], ['a Kaggle T4 measures the peak'], ['the result becomes a ledger row']].forEach(([t], i) => {
        const g = E('g', {}, loop);
        const c = E('circle', { cx: rx, cy: ny[i], r: 8, fill: C.bg, stroke: C.edge, 'stroke-width': 2 }, g);
        const tx = E('text', { x: rx + 26, y: ny[i] + 8, class: 's', 'font-size': 23 }, g, t);
        P.nodes.push({ g, c, tx });
      });

      // legend for the chart's marks, which are also the process rules
      const lg = (P.legend = E('g', {}, svg));
      const ly = [744, 788, 832];
      E('path', { d: `M${lx + 1},${ly[0]} L${lx + 15},${ly[0]} L${lx + 8},${ly[0] - 13}Z`, fill: C.mech }, lg);
      E('text', { x: lx + 34, y: ly[0], class: 's', 'font-size': 20 }, lg, 'independent review every 3 h');
      E('circle', { cx: lx + 8, cy: ly[1] - 6, r: 8, fill: 'none', stroke: C.ours, 'stroke-width': 2.5 }, lg);
      E('text', { x: lx + 34, y: ly[1], class: 's', 'font-size': 20 }, lg, 'merge into main, reviewed by the other lane');
      E('circle', { cx: lx + 8, cy: ly[2] - 6, r: 5.5, fill: 'none', stroke: C.dim, 'stroke-width': 1.6 }, lg);
      E('text', { x: lx + 34, y: ly[2], class: 's', 'font-size': 20 }, lg, 'killed idea, kept as a branch');
      P.lg = [...lg.children];

      /* ---------- the chart ---------- */
      const ch = (P.chart = E('g', {}, svg));
      const grid = (P.grid = E('g', {}, ch));
      for (let m = 0; m <= 12288; m += 4096) {
        E('line', { x1: X0, x2: X1, y1: Y(m), y2: Y(m), stroke: C.line, 'stroke-width': m ? 1 : 1.5 }, grid);
        E('text', { x: X0 - 14, y: Y(m) + 6, 'text-anchor': 'end', 'font-size': 16 }, grid, fmt(m));
      }
      E('text', { x: X0 - 14, y: YT - 4, 'text-anchor': 'end', 'font-size': 16 }, grid, 'MiB');
      for (let t = 0; t <= 30; t += 6) E('text', { x: X(t), y: YB + 30, 'text-anchor': 'middle', 'font-size': 16 }, grid, t ? `+${t} h` : '0 h');
      E('text', { x: X1, y: YB + 62, 'text-anchor': 'end', class: 's', 'font-size': 17 }, grid,
        `hours since the first baseline, 30 Oct 12:43; ${L.runs.length} of ${fmt(L.rows)} ledger rows carry a measured peak`);
      // review marks every 3 h, on the time axis
      for (let t = 3; t <= 30; t += 3) {
        P.reviews.push(E('path', { d: `M${X(t) - 7},${YB + 1} L${X(t) + 7},${YB + 1} L${X(t)},${YB - 12}Z`, fill: C.mech }, ch));
      }

      // base reference
      P.baseLine = E('line', { x1: X0, x2: X1, y1: Y(14345), y2: Y(14345), stroke: C.base, 'stroke-width': 2, 'stroke-dasharray': '8 7' }, ch);
      P.baseTx = E('text', { x: X1, y: Y(14345) - 12, 'text-anchor': 'end', class: 'halo' }, ch);
      E('tspan', { class: 's', 'font-size': 18 }, P.baseTx, 'base  ');
      E('tspan', { class: 'base', 'font-size': 18 }, P.baseTx, '14,345');

      // every measured run
      const dg = E('g', {}, ch);
      L.runs.forEach(([lane, t, pk, dec]) => {
        const kill = dec === 'kill';
        const d = E('circle', {
          cx: X(t), cy: Y(pk), r: kill ? 5.5 : 5,
          fill: kill ? 'none' : lane === 'h' ? C.mech : C.ink,
          'fill-opacity': kill ? 1 : lane === 'h' ? 0.9 : 0.62,
          stroke: kill ? C.dim : 'none', 'stroke-width': 1.6, opacity: 0,
        }, dg);
        P.dots.push({ n: d, t });
      });

      // main's path, revealed by a clip that follows the clock
      const path = mainPath(L.runs);
      P.path = path;
      let d = `M${X(0)},${Y(path[0][1])}`;
      for (let i = 1; i < path.length; i++) d += ` H${X(path[i][0])} V${Y(path[i][1])}`;
      d += ` H${X(TMAX)}`;
      const clip = E('clipPath', { id: 'p7-clip' }, E('defs', {}, svg));
      P.clipR = E('rect', { x: X0 - 12, y: 0, width: 0, height: 1080 }, clip);
      E('path', { d, stroke: C.ours, 'stroke-width': 4, fill: 'none', 'stroke-linejoin': 'round', 'clip-path': 'url(#p7-clip)' }, ch);

      // merge rings on the path
      path.filter(p => p[3]).forEach(p => P.merges.push(E('circle', { cx: X(p[0]), cy: Y(p[1]), r: 10, fill: 'none', stroke: C.ours, 'stroke-width': 2.5, opacity: 0 }, ch)));
      const h2075 = L.runs.find(r => r[3] === 'merge' && r[1] > 20);
      if (h2075) P.merges.push(E('circle', { cx: X(h2075[1]), cy: Y(h2075[2]), r: 10, fill: 'none', stroke: C.ours, 'stroke-width': 2.5, opacity: 0 }, ch));

      // milestone labels: [time they appear, x, y, anchor, word, number]
      const at = k => path.find(p => p[2] === k);
      const ms = [
        [at('ex')[0], X(0) + 16, Y(12385) - 14, 'start', 'example kernel ', '12,385'],
        [at('body')[0], X(at('body')[0]) + 14, Y(9661) - 14, 'start', 'body recompute ', '9,661'],
        [at('head')[0], X(at('head')[0]) + 14, Y(5283) - 14, 'start', '+ streamed head ', '5,283'],
        [at('replay')[0], X(8.6), Y(2459) + 38, 'start', '+ body replay, exact reconstruction ', '2,459'],
      ];
      ms.forEach(([t, x, y, a, w, n]) => {
        const tx = E('text', { x, y, 'text-anchor': a, class: 'halo', opacity: 0 }, ch);
        E('tspan', { class: 's', 'font-size': 18 }, tx, w);
        E('tspan', { class: 'ink', 'font-size': 18 }, tx, n);
        P.ms.push({ n: tx, t });
      });
      // the submitted point
      const sx = X(at('sub')[0]), sy = Y(2479);
      const sg = (P.sub = E('g', { opacity: 0 }, ch));
      E('circle', { cx: sx, cy: sy, r: 9, fill: C.ours }, sg);
      const st = E('text', { x: X1, y: sy + 38, 'text-anchor': 'end', class: 'halo' }, sg);
      E('tspan', { class: 's ink', 'font-size': 20, 'font-weight': 600 }, st, 'submitted ');
      E('tspan', { class: 'ours', 'font-size': 22 }, st, '2,479');
      E('text', { x: X1, y: sy + 62, 'text-anchor': 'end', class: 's halo', 'font-size': 17 }, sg, '2,459 failed the time check in run 51');
      P.subT = at('sub')[0];

      // the sweep cursor
      P.cur = E('g', { opacity: 0 }, ch);
      P.curL = E('line', { x1: X0, x2: X0, y1: YT - 8, y2: YB, stroke: C.edge, 'stroke-width': 1.5 }, P.cur);
      P.curT = E('text', { x: X0, y: YT - 18, 'text-anchor': 'middle', 'font-size': 16, class: 'ink' }, P.cur, '0 h');

      P.clock = { t: 0 };
      P.draw = () => {
        const t = P.clock.t;
        P.clipR.setAttribute('width', Math.max(0, X(Math.min(t, TMAX)) - X0 + 12));
        for (const o of P.dots) o.n.setAttribute('opacity', clamp((t - o.t) / 0.5 + 1));
        for (const o of P.ms) o.n.setAttribute('opacity', clamp((t - o.t) / 1.2));
        P.sub.setAttribute('opacity', clamp((t - P.subT) / 0.4));
        P.curL.setAttribute('x1', X(t)); P.curL.setAttribute('x2', X(t));
        P.curT.setAttribute('x', X(t)); P.curT.textContent = `+${Math.floor(t)} h`;
      };
    },

    enter(root, api) {
      const T = { head: 0, sub: 0.25, grid: 0.3, people: 0.5, orch: 0.8, loop: [1.0, 1.25, 1.5, 1.75], sweep: [2.0, 4.9], review: 5.0, merge: 5.5 };
      return seq(root, api, T);
    },

    video(root, api, seg) {
      const w = (word, k, fb) => {
        let v; try { v = api.word(seg, word, k || 0); } catch (e) { v = null; }
        return Number.isFinite(v) ? v : fb + (seg.voiceOffset || 0);
      };
      const T = {
        head: 0.1,
        grid: 0.5,
        sub: w('двое', 0, 1.47) - 0.1,
        people: w('нас', 0, 1.21),
        orch: w('оркестратор', 0, 3.12) - 0.2,
        loop: [w('гипотезу', 0, 4.42) - 0.1, w('ядро', 0, 5.88) - 0.2, w('каггле', 0, 6.82) - 0.1, w('журнал', 0, 8.56) - 0.15],
        sweep: [w('журнал', 0, 8.56) + 0.4, w('веток', 0, 11.39) + 0.3],
        review: w('каждые', 0, 11.94),
        merge: w('мерж', 0, 14.38) - 0.1,
      };
      return seq(root, api, T, seg.duration);
    },
  });
})();
