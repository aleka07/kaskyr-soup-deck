/* Chapter 04 · where — "Two things fill it, and neither needs to be stored."
   The box is X-rayed into three blocks: weights (est.), logit copies (est. 5–7 GB) and the
   activations of 28 layers (the rest). Above it, the thing itself at true proportions: the hidden
   state of a token is 1,536 numbers wide, its logits 151,936 — a wall 99× wider, 4 × 512 rows deep,
   311,164,928 numbers, where one pixel holds about 1,000 of them. Each copy of that wall is one
   brick drawn at the box's own scale (1.24 GB = 1,187 MiB), and five of them sit exactly over the
   logit block. Over the activation block, 28 bars: one per layer, kept until backward.
   build() leaves the keyframe; enter()/video() animate into it. */
(function () {
  // Box state at the keyframe. Keys: weights / logits / acts (chapters 05 and 06 continue from these).
  // Weights: est. ~2 GB (NF4 layers ~0.65 GB, fp32 tied embedding ~0.93 GB, CUDA context); logits:
  // 5 copies × 1,187 MiB = 5,935 MiB, inside the 5–7 GB estimate; activations: the rest of the measured 14,345.
  const COPY = 1187;                     // 4·512·151,936 fp32 values = 1,244,659,712 B = 1,187 MiB
  const W_MIB = 2048, L_MIB = 5 * COPY, A_MIB = 14345 - W_MIB - L_MIB;
  const BOX = [
    { key: 'weights', mib: W_MIB, color: 'dim', label: 'weights', est: true },
    { key: 'logits', mib: L_MIB, color: 'base', label: 'logit copies', est: true },
    { key: 'acts', mib: A_MIB, color: '#D9482B', label: 'activations, 28 layers', est: true },
  ];
  const PX = 1680 / 15360;                // the box's scale, px per MiB
  const BX = m => 120 + m * PX;
  const WALL = { x: 200, y: 296, w: 1600, h: 194 };      // 1600 × 194 px ≈ 310,400 px → ≈ 1,002 numbers per pixel
  const HID = { x: 120, w: WALL.w * 1536 / 151936 };     // the hidden state at the same scale: 16.2 px
  const ROW = { y: 772, h: 96 };
  const COPIES = ['loss', 'gradient', 'entropy', 'accuracy', 'rewind'];
  const BRICK = i => ({ x: BX(W_MIB + i * COPY), w: COPY * PX - 6 });
  const AX0 = BX(W_MIB + L_MIB), AX1 = BX(14345), LW = (AX1 - AX0) / 28;
  const N = 311164928;

  // deterministic texture: logits look like data, not a pattern — multi-octave value noise across the
  // vocabulary (token families), a per-column jitter, a few hot tokens per row
  function paint(cv, w, h, rgb, seed) {
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const octave = (step, amp) => {
      const n = Math.ceil(w / step) + 2, k = Array.from({ length: n }, rnd), out = new Float32Array(w);
      for (let x = 0; x < w; x++) { const f = x / step, i = Math.floor(f), t = (1 - Math.cos((f - i) * Math.PI)) / 2; out[x] = amp * (k[i] * (1 - t) + k[i + 1] * t - 0.5); }
      return out;
    };
    const o1 = octave(173, 0.55), o2 = octave(41, 0.32), o3 = octave(9, 0.18);
    const col = new Float32Array(w);
    for (let x = 0; x < w; x++) col[x] = 0.42 + o1[x] + o2[x] + o3[x] + (rnd() < 0.04 ? 0.25 : 0) - (x > w * 0.83 ? 0.12 : 0);
    const rowg = Array.from({ length: h }, () => 0.85 + 0.3 * rnd());
    const bg = [11, 15, 20];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = col[x] * rowg[y] + (rnd() - 0.5) * 0.5;
        if (rnd() < 0.0012) v = 1.3;
        v = Math.max(0, Math.min(1, v));
        const k = 0.1 + 0.9 * v * v;
        const i = (y * w + x) * 4;
        img.data[i] = bg[0] + (rgb[0] - bg[0]) * k; img.data[i + 1] = bg[1] + (rgb[1] - bg[1]) * k; img.data[i + 2] = bg[2] + (rgb[2] - bg[2]) * k; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  Deck.chapter({
    n: 4, id: 'where',
    title: 'Two things fill it, and neither needs to be stored.',
    html: `
      <h2 class="w-h">Two things fill it, and neither needs to be stored.</h2>
      <div class="w-hid-n mono">1,536</div>
      <canvas class="w-hid" width="16" height="194"></canvas>
      <div class="w-lbl">each token's 1,536 numbers become 151,936 scores, one per vocabulary token</div>
      <div class="w-cnt mono">151,936</div>
      <div class="w-clip"><canvas class="w-wall" width="1600" height="194"></canvas><div class="w-bands"><i></i><i></i><i></i></div></div>
      <div class="w-math mono">4 × 512 × 151,936 = <span class="w-n">311,164,928</span> numbers</div>
      <div class="w-px">1 pixel here ≈ 1,000 numbers</div>
      <div class="w-gb mono">× 4 bytes in fp32 = <span class="base-c">1.24 GB</span> for one copy</div>
      <div class="w-head w-head-l">Copies of it, est. 5–7 GB</div>
      <div class="w-head w-head-a">28 layers, activations kept for backward</div>
      <div class="w-fw mono">forward →</div><div class="w-bw mono">← backward</div>
      <div class="w-bricks"></div>
      <div class="w-layers"></div>
      <div class="w-fly"></div>`,
    css: `
      .ch-where > * { position: absolute; }
      .ch-where .w-h { left: 120px; top: 88px; white-space: nowrap; }
      .ch-where .w-hid-n { left: ${HID.x}px; top: ${WALL.y - 34}px; font-size: 18px; color: #A9BEF5; }
      .ch-where .w-hid { left: ${HID.x}px; top: ${WALL.y}px; width: ${HID.w}px; height: ${WALL.h}px; }
      .ch-where .w-lbl { left: ${WALL.x}px; top: ${WALL.y - 36}px; font-size: 20px; color: var(--dim); }
      .ch-where .w-cnt { left: ${WALL.x + WALL.w - 200}px; width: 200px; text-align: right; top: ${WALL.y - 34}px; font-size: 18px; color: var(--ink); }
      .ch-where .w-clip { left: ${WALL.x}px; top: ${WALL.y}px; width: ${WALL.w}px; height: ${WALL.h}px; overflow: hidden; }
      .ch-where .w-wall { position: absolute; left: 0; top: 0; width: ${WALL.w}px; height: ${WALL.h}px; }
      .ch-where .w-bands i { position: absolute; left: 0; width: ${WALL.w}px; height: 3px; background: var(--bg); }
      .ch-where .w-bands i:nth-child(1) { top: ${WALL.h / 4 - 1.5}px; }
      .ch-where .w-bands i:nth-child(2) { top: ${WALL.h / 2 - 1.5}px; }
      .ch-where .w-bands i:nth-child(3) { top: ${WALL.h * 3 / 4 - 1.5}px; }
      .ch-where .w-math { left: ${WALL.x}px; top: ${WALL.y + WALL.h + 34}px; font-size: 34px; color: var(--ink); white-space: nowrap; }
      .ch-where .w-px { left: ${WALL.x + WALL.w - 420}px; width: 420px; text-align: right; top: ${WALL.y + WALL.h + 44}px; font-size: 20px; color: var(--dim); }
      .ch-where .w-gb { left: ${WALL.x}px; top: ${WALL.y + WALL.h + 88}px; font-size: 26px; color: var(--dim); white-space: nowrap; }
      .ch-where .w-head { top: 688px; font-size: 23px; font-weight: 600; color: var(--ink); white-space: nowrap; letter-spacing: -0.005em; }
      .ch-where .w-head-l { left: ${BRICK(0).x}px; }
      .ch-where .w-head-a { left: ${AX0}px; }
      .ch-where .w-fw, .ch-where .w-bw { top: 740px; font-size: 15px; color: var(--dim); }
      .ch-where .w-fw { left: ${AX0}px; }
      .ch-where .w-bw { left: ${AX1 - 160}px; width: 160px; text-align: right; color: #A9BEF5; }
      .ch-where .w-bricks, .ch-where .w-layers, .ch-where .w-fly { left: 0; top: 0; width: 1920px; height: 0; }
      .ch-where .w-brick { position: absolute; top: ${ROW.y}px; height: ${ROW.h}px; background-size: 100% 100%; box-shadow: inset 0 0 0 1px rgba(255,90,54,.55); }
      .ch-where .w-slot { position: absolute; top: ${ROW.y}px; height: ${ROW.h}px; border: 1px dashed rgba(255,90,54,.45); }
      .ch-where .w-blbl { position: absolute; top: ${ROW.y - 28}px; font-size: 18px; color: var(--ink); text-align: center; }
      .ch-where .w-layer { position: absolute; top: ${ROW.y}px; height: ${ROW.h}px; background: linear-gradient(180deg, #D44A2C 0%, #94321C 100%); }
      .ch-where .w-lrim { position: absolute; top: ${ROW.y}px; height: ${ROW.h}px; box-shadow: inset 0 0 0 1px #6B2C20; }
      .ch-where .w-ghost { position: absolute; background-size: 100% 100%; }`,
    box: BOX,

    build(root, api) {
      const wall = root.querySelector('.w-wall');
      paint(wall, WALL.w, WALL.h, [255, 90, 54], 7);
      paint(root.querySelector('.w-hid'), 16, WALL.h, [130, 172, 255], 3);
      const url = wall.toDataURL();
      this._url = url;
      const bricks = root.querySelector('.w-bricks');
      COPIES.forEach((name, i) => {
        const b = BRICK(i);
        const slot = document.createElement('div'); slot.className = 'w-slot';
        Object.assign(slot.style, { left: b.x + 'px', width: b.w + 'px' }); bricks.appendChild(slot);
        const d = document.createElement('div'); d.className = 'w-brick';
        Object.assign(d.style, { left: b.x + 'px', width: b.w + 'px', backgroundImage: `url(${url})` }); bricks.appendChild(d);
        const l = document.createElement('div'); l.className = 'w-blbl'; l.textContent = name;
        Object.assign(l.style, { left: b.x + 'px', width: b.w + 'px' }); bricks.appendChild(l);
      });
      const layers = root.querySelector('.w-layers');
      for (let i = 0; i < 28; i++) {
        const x = AX0 + i * LW;
        const r = document.createElement('div'); r.className = 'w-lrim';
        Object.assign(r.style, { left: x + 'px', width: (LW - 5) + 'px' }); layers.appendChild(r);
        const d = document.createElement('div'); d.className = 'w-layer';
        Object.assign(d.style, { left: x + 'px', width: (LW - 5) + 'px' }); layers.appendChild(d);
      }
    },

    _tl(root, api, T, D) {
      const q = s => root.querySelectorAll(s), q1 = s => root.querySelector(s);
      const tl = gsap.timeline();
      const box = api.box;

      // 1. X-ray: the solid base block is scanned into its parts; the total never changes
      box.clearAnnotations();
      const scan = api.el('line', { y1: 922, y2: 998, stroke: '#E8EDF2', 'stroke-width': 2, opacity: 0 }, box.node);
      const xr = box.to([...BOX, { key: 'base', mib: 0, color: 'base', label: 'base Soup run, measured' }], { duration: D.xray, ease: 'power1.inOut' });
      const sweep = { m: 0 };
      tl.add(xr, T.xray);
      tl.fromTo(sweep, { m: 0 }, { m: 14345, duration: D.xray, ease: 'power1.inOut', onUpdate() { const x = box.X(sweep.m); scan.setAttribute('x1', x); scan.setAttribute('x2', x); } }, T.xray);
      tl.fromTo(scan, { opacity: 0 }, { opacity: 0.9, duration: 0.2 }, T.xray);
      tl.to(scan, { opacity: 0, duration: 0.3 }, T.xray + D.xray - 0.2);
      tl.fromTo(q1('.w-h'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, T.head);

      // 2. the hidden state of one token: 1,536 numbers; the vocabulary turns it into 151,936
      tl.fromTo(q('.w-hid, .w-hid-n'), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, T.hid);
      const cnt = q1('.w-cnt'), clip = q1('.w-clip');
      const wv = { w: HID.w };
      tl.fromTo(wv, { w: HID.w }, {
        w: WALL.w, duration: D.wall, ease: 'power2.inOut',
        onUpdate() { clip.style.width = wv.w + 'px'; cnt.style.left = (WALL.x + wv.w - 200) + 'px'; cnt.textContent = api.fmt(151936 * wv.w / WALL.w); },
      }, T.wall);
      tl.fromTo([clip, cnt], { opacity: 0 }, { opacity: 1, duration: 0.25 }, T.wall);
      tl.fromTo(q1('.w-lbl'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.wall + D.wall * 0.5);

      // 3. 4 sequences × 512 tokens, 311,164,928 numbers
      tl.fromTo(q('.w-bands i'), { scaleX: 0, transformOrigin: '0 50%' }, { scaleX: 1, duration: 0.5, ease: 'power2.out', stagger: 0.12 }, T.rows);
      const nEl = q1('.w-n'), nv = { v: 0 };
      tl.fromTo(q1('.w-math'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.rows + 0.1);
      tl.fromTo(nv, { v: 0 }, { v: N, duration: D.count, ease: 'power2.out', onUpdate() { nEl.textContent = api.fmt(nv.v); } }, T.count);
      tl.fromTo(q1('.w-px'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.count + D.count * 0.7);
      tl.fromTo(q1('.w-gb'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, T.gb);

      // 4. each copy of the wall is a brick at the box's scale; five of them are the logit block
      tl.fromTo(q1('.w-head-l'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.slots);
      tl.fromTo(q('.w-slot'), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.06 }, T.slots);
      const bricks = q('.w-brick'), blbl = q('.w-blbl'), fly = q1('.w-fly');
      fly.innerHTML = '';
      COPIES.forEach((_, i) => {
        const b = BRICK(i);
        const g = document.createElement('div'); g.className = 'w-ghost';
        g.style.backgroundImage = `url(${this._url})`; fly.appendChild(g);
        const t = T.copies[i];
        tl.set(bricks[i], { opacity: 0 }, 0);
        tl.fromTo(g, { left: WALL.x, top: WALL.y, width: WALL.w, height: WALL.h, opacity: 0 },
          { left: b.x, top: ROW.y, width: b.w, height: ROW.h, opacity: 1, duration: D.fly, ease: 'power3.inOut' }, t);
        tl.set(g, { opacity: 0 }, t + D.fly);
        tl.set(bricks[i], { opacity: 1 }, t + D.fly);
        tl.fromTo(blbl[i], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, t + D.fly - 0.1);
      });

      // 5. 28 layers: each stores its activations on the way forward; backward reads them back
      tl.fromTo(q1('.w-head-a'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.layers - 0.2);
      tl.fromTo(q('.w-lrim'), { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: D.lstag }, T.layers);
      tl.fromTo(q('.w-layer'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.3, ease: 'power2.out', stagger: D.lstag }, T.fwd);
      tl.fromTo(q1('.w-fw'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.fwd);
      tl.fromTo(q1('.w-bw'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, T.bwd);
      if (D.read) tl.fromTo(q('.w-layer'), { filter: 'brightness(1)' }, { filter: 'brightness(1.6)', duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut', stagger: { each: D.read, from: 'end' } }, T.bwd);
      return tl;
    },

    enter(root, api) {
      const T = { xray: 0, head: 0.1, hid: 0.9, wall: 1.1, rows: 2.3, count: 2.4, gb: 3.0, slots: 3.2, copies: [3.3, 3.5, 3.7, 3.9, 4.1], layers: 4.7, fwd: 5.1, bwd: 6.0 };
      return this._tl(root, api, T, { xray: 1.3, wall: 1.2, count: 0.8, fly: 0.8, lstag: 0.025, read: 0 });
    },

    video(root, api, seg) {
      const w = (x, k) => api.word(seg, x, k || 0);
      const T = {
        xray: 0.35,                         // "Сначала мы посмотрели, куда уходит память"
        head: 0,
        hid: w('первое') - 0.1,
        wall: w('словарь') - 0.05,          // sweep across "...сто пятьдесят две тысячи токенов"
        rows: w('батч') - 0.15,
        count: w('триста') - 0.05,
        gb: w('гигабайта') - 0.1,
        slots: w('копий') - 0.1,
        copies: [w('лосс') - 0.55, w('градиент') - 0.55, w('энтропия') - 0.55, w('точность') - 0.55, w('точность') - 0.05],
        layers: w('двадцать') - 0.1,
        fwd: w('активации') - 0.45,
        bwd: w('обратного') - 0.15,
      };
      const D = { xray: 2.1, wall: Math.max(1.6, w('токенов') + 0.35 - T.wall), count: Math.max(1.2, w('чисел') + 0.3 - T.count), fly: 0.75, lstag: 0.03, read: 0.035 };
      const tl = this._tl(root, api, T, D);
      if (tl.duration() < seg.duration) tl.to({}, { duration: seg.duration - tl.duration() });
      return tl;
    },
  });
})();
