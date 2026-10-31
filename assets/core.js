/* KaskyrAlmaty deck v2 core. Implements presentation/CONTRACT.md.
   Chapters register with Deck.chapter({...}); index.html calls Deck.start().
   Modes: deck (default), ?print, ?video=<id>, ?freeze (keyframes, no animation), ?reduced. */
(function () {
  'use strict';
  const C = { bg: '#0B0F14', ink: '#E8EDF2', dim: '#8A96A3', base: '#FF5A36', ours: '#2EE6A6', mech: '#5B8CFF', line: '#1E2833', panel: '#121922', edge: '#3A4756' };
  const NS = 'http://www.w3.org/2000/svg';
  const IDS = ['hook', 'why', 'rules', 'where', 'head', 'body', 'process', 'result', 'limits', 'close'];
  const params = new URLSearchParams(location.search);
  const MODE = params.has('video') ? 'video' : params.has('print') ? 'print' : 'deck';
  const FREEZE = params.has('freeze');
  const REDUCED = params.has('reduced') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad2 = n => String(n).padStart(2, '0');

  /* ---------- word timings ---------- */
  const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, '');
  function word(seg, w, k = 0) {
    const words = (seg && seg.words) || [];
    const q = norm(w);
    let hits = words.filter(x => norm(x.word) === q);
    if (hits.length <= k) hits = words.filter(x => norm(x.word).startsWith(q));
    if (hits.length > k) return hits[k].start;
    console.warn(`[deck] api.word: "${w}" #${k} not found in segment ${seg && seg.id}; returning null`);
    return null;
  }

  /* ---------- text measuring (canvas, after fonts load) ---------- */
  const mctx = document.createElement('canvas').getContext('2d');
  const mcache = new Map();
  function textW(str, font) {
    const key = font + '|' + str;
    let v = mcache.get(key);
    if (v == null) { mctx.font = font; v = mctx.measureText(str).width; mcache.set(key, v); }
    return v;
  }
  const F_LBL = '600 17px Onest', F_ABOVE = '500 15px Onest', F_READ = '500 30px "Plex Mono"', F_READU = '500 18px "Plex Mono"', F_T4 = '500 16px "Plex Mono"';

  /* ---------- the memory box ---------- */
  const G = { x0: 120, x1: 1800, y0: 930, y1: 990, max: 15360, tick: 2048 };
  const X = m => G.x0 + m / G.max * (G.x1 - G.x0);
  const colorOf = c => (c && C[c]) || c || C.dim;
  let boxUid = 0;

  function mergeOrder(prev, next) {
    const out = next.slice();
    prev.forEach((k, i) => {
      if (out.includes(k)) return;
      let j = i - 1; while (j >= 0 && !out.includes(prev[j])) j--;
      out.splice(j < 0 ? 0 : out.indexOf(prev[j]) + 1, 0, k);
    });
    return out;
  }

  function createBox(svg) {
    const uid = ++boxUid;
    const node = el('g', { class: 'mbox' }, svg);
    const core = new Set();
    const mk = (tag, attrs, text) => { const e = el(tag, attrs, node, text); core.add(e); return e; };
    const defs = mk('defs', {});
    const hatches = {};
    function hatch(col) {
      if (hatches[col]) return hatches[col];
      const id = `mbh${uid}-${Object.keys(hatches).length}`;
      const p = el('pattern', { id, width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      el('rect', { width: 9, height: 9, fill: col, 'fill-opacity': 0.10 }, p);
      el('rect', { width: 2, height: 9, fill: col, 'fill-opacity': 0.55 }, p);
      return (hatches[col] = `url(#${id})`);
    }
    const W = G.x1 - G.x0, H = G.y1 - G.y0;
    mk('rect', { x: G.x0, y: G.y0, width: W, height: H, fill: C.panel });
    const blocksG = mk('g', { class: 'mb-blocks' });
    const gridG = mk('g', { class: 'mb-grid mb-crisp' });
    const ticksG = mk('g', { class: 'mb-ticks' });
    for (let m = G.tick; m < G.max; m += G.tick) {
      const x = Math.round(X(m)) + 0.5;
      el('line', { x1: x, x2: x, y1: G.y0 + 1, y2: G.y1 - 1, stroke: C.bg, 'stroke-opacity': 0.55, 'stroke-width': 1 }, gridG);
    }
    for (let m = 0; m <= G.max; m += G.tick) {
      const x = Math.round(X(m)) + 0.5;
      el('line', { x1: x, x2: x, y1: G.y1, y2: G.y1 + 7, stroke: C.edge, 'stroke-width': 1, class: 'mb-crisp' }, ticksG);
      el('text', { x: X(m), y: G.y1 + 29, 'text-anchor': m === 0 ? 'start' : 'middle', class: 'mb-tick', style: `fill:${C.dim}` }, ticksG, fmt(m));
    }
    el('line', { x1: G.x1 - 0.5, x2: G.x1 - 0.5, y1: G.y1, y2: G.y1 + 7, stroke: C.edge, class: 'mb-crisp' }, ticksG);
    mk('rect', { x: G.x0 + 0.5, y: G.y0 + 0.5, width: W - 1, height: H - 1, fill: 'none', stroke: C.edge, 'stroke-width': 1, class: 'mb-crisp' });
    const t4 = mk('text', { x: G.x1, y: G.y0 - 14, 'text-anchor': 'end', 'font-size': 16 });
    el('tspan', { fill: C.ink }, t4, '15,360');
    el('tspan', { fill: C.dim }, t4, ' MiB T4');
    const t4W = textW('15,360 MiB T4', F_T4);
    const read = mk('text', { x: G.x0, y: G.y0 - 14 });
    const readN = el('tspan', { fill: C.ink, 'font-size': 30 }, read, '0');
    el('tspan', { fill: C.dim, 'font-size': 18 }, read, ' MiB');
    const labelsG = mk('g', { class: 'mb-labels' });

    const vals = {};          // 'k_'+key -> current MiB (tweened; prefixed so no key collides with a GSAP var name)
    const K = k => 'k_' + k, unK = k => k.slice(2);
    let order = [], meta = {}; // current layout
    let lastTarget = [];      // target of the most recently created set/to (build-time chain)
    const items = {};
    function item(key) {
      if (items[key]) return items[key];
      const g = el('g', { 'data-key': key }, blocksG);
      const it = {
        g,
        rect: el('rect', { y: G.y0, height: H }, g),
        edge: el('rect', { y: G.y0 + 0.5, height: H - 1, fill: 'none', 'stroke-width': 1, class: 'mb-crisp' }, g),
        text: el('text', { y: G.y0 + H / 2 + 6, class: 'mb-lbl' }, g),
        above: el('text', { y: G.y0 - 22, class: 'mb-above', 'text-anchor': 'middle' }, labelsG),
        lead: el('path', { fill: 'none', 'stroke-width': 1 }, labelsG),
      };
      return (items[key] = it);
    }
    const labelOf = m => (m.label || '') + (m.est && m.label && !/est\./i.test(m.label) ? ' · est.' : '');

    function render() {
      let acc = 0;
      const above = [];
      const seen = new Set();
      for (const key of order) {
        seen.add(key);
        const it = item(key), m = meta[key] || {};
        const v = Math.max(0, vals[K(key)] || 0);
        const xa = X(acc), xb = X(acc + v); acc += v;
        const w = xb - xa;
        if (w < 0.25) { it.g.style.display = 'none'; it.above.style.display = 'none'; it.lead.style.display = 'none'; continue; }
        it.g.style.display = '';
        const col = colorOf(m.color);
        const rw = Math.max(0.25, w - (w > 3 ? 1 : 0)); // 1px seam between blocks
        it.rect.setAttribute('x', xa); it.rect.setAttribute('width', rw);
        if (m.est) {
          it.rect.setAttribute('fill', hatch(col));
          it.edge.style.display = ''; it.edge.setAttribute('x', xa + 0.5); it.edge.setAttribute('width', Math.max(0, rw - 1)); it.edge.setAttribute('stroke', col);
        } else { it.rect.setAttribute('fill', col); it.edge.style.display = 'none'; }
        const lbl = labelOf(m);
        it.text.textContent = lbl;
        const tw = lbl ? textW(lbl, F_LBL) : 0;
        const inA = lbl ? clamp((w - tw - 28) / 18, 0, 1) : 0;
        it.text.setAttribute('x', xa + 14);
        it.text.style.fill = (m.est || m.color === 'dim' || m.color === 'line' || m.color === 'panel') ? C.ink : C.bg;
        it.text.style.display = inA > 0 ? '' : 'none';
        it.text.setAttribute('opacity', inA);
        const upA = lbl ? (1 - inA) * clamp(w / 8, 0, 1) : 0;
        if (upA > 0.01) above.push({ it, lbl, col, cx: xa + w / 2, w: textW(lbl, F_ABOVE), a: upA });
        else { it.above.style.display = 'none'; it.lead.style.display = 'none'; }
      }
      for (const key in items) if (!seen.has(key)) { items[key].g.style.display = 'none'; items[key].above.style.display = 'none'; items[key].lead.style.display = 'none'; }
      readN.textContent = fmt(acc);
      // above-labels: one row, left to right, never over the readout, the T4 label or each other
      const L = G.x0 + textW(fmt(acc), F_READ) + textW(' MiB', F_READU) + 28;
      const R = G.x1 - t4W - 28;
      let prevEnd = L;
      for (const a of above) {
        let left = Math.max(a.cx - a.w / 2, prevEnd);
        const ok = left + a.w <= R;
        const lx = left + a.w / 2;
        if (!ok) { a.it.above.style.display = 'none'; a.it.lead.style.display = 'none'; continue; }
        prevEnd = left + a.w + 18;
        const t = a.it.above, p = a.it.lead;
        t.style.display = ''; p.style.display = '';
        t.textContent = a.lbl; t.setAttribute('x', lx); t.style.fill = a.col; t.setAttribute('opacity', a.a);
        const cx = Math.round(a.cx) + 0.5, sx = Math.round(lx) + 0.5;
        p.setAttribute('d', Math.abs(cx - sx) < 1 ? `M${cx},${G.y0 - 16}V${G.y0}` : `M${sx},${G.y0 - 16}L${cx},${G.y0 - 4}V${G.y0}`);
        p.setAttribute('stroke', a.col); p.setAttribute('opacity', a.a * 0.8);
      }
    }

    function metaOf(state) { const o = {}; state.forEach(b => { o[b.key] = { color: b.color, label: b.label, est: !!b.est }; }); return o; }
    function norm(state) { return (state || []).map(b => ({ key: String(b.key), mib: +b.mib || 0, color: b.color, label: b.label, est: !!b.est })); }

    const box = {
      node, geom: Object.assign({}, G), X,
      vals,
      get state() { return lastTarget.map(b => Object.assign({}, b)); },
      total() { return order.reduce((s, k) => s + Math.max(0, vals[K(k)] || 0), 0); },
      set(state) {
        state = norm(state);
        for (const k in vals) vals[k] = 0;
        state.forEach(b => { vals[K(b.key)] = b.mib; });
        order = state.map(b => b.key); meta = Object.assign({}, meta, metaOf(state));
        lastTarget = state;
        render();
        return box;
      },
      to(state, opts = {}) {
        state = norm(state);
        const { duration = 1, ease = 'power2.inOut' } = opts;
        const ord = mergeOrder(mergeOrder(Object.keys(vals).filter(k => vals[k] > 0).map(unK), lastTarget.map(b => b.key)), state.map(b => b.key));
        const mt = Object.assign({}, meta, metaOf(lastTarget), metaOf(state));
        const target = {};
        for (const k of ord) { if (!(K(k) in vals)) vals[K(k)] = 0; target[K(k)] = 0; }
        state.forEach(b => { target[K(b.key)] = b.mib; });
        lastTarget = state;
        const apply = () => { order = ord; meta = mt; render(); };
        return gsap.to(vals, Object.assign({}, target, { duration, ease, lazy: false, overwrite: false, onStart: apply, onUpdate: apply, onComplete: apply, onReverseComplete: apply }));
      },
      hide() { node.style.opacity = 0; return box; },
      show() { node.style.opacity = 1; return box; },
      tweenHide(o = {}) { return gsap.to(node, { opacity: 0, duration: o.duration ?? 0.6, ease: o.ease ?? 'power2.out' }); },
      tweenShow(o = {}) { return gsap.to(node, { opacity: 1, duration: o.duration ?? 0.6, ease: o.ease ?? 'power2.out' }); },
      clearAnnotations() { Array.from(node.childNodes).forEach(c => { if (!core.has(c)) c.remove(); }); },
      render,
    };
    render();
    return box;
  }

  /* ---------- registry ---------- */
  const registry = [];
  const injected = new Set();
  function chapter(def) {
    if (!def || def.n == null || !def.id) { console.error('[deck] chapter needs n and id', def); return; }
    if (registry.some(c => c.id === def.id)) { console.error('[deck] duplicate chapter', def.id); return; }
    registry.push(def);
  }
  function injectCss(ch) {
    if (!ch.css || injected.has(ch.id)) return;
    const s = document.createElement('style'); s.dataset.chapter = ch.id; s.textContent = ch.css;
    document.head.appendChild(s); injected.add(ch.id);
  }
  function showError(root, ch, phase, e) {
    console.error(`[deck] ${ch.id}.${phase}:`, e);
    const d = document.createElement('pre'); d.className = 'ch-error'; d.textContent = `${ch.id}.${phase}: ${e && e.message || e}`;
    root.appendChild(d);
  }

  /* ---------- deck state ---------- */
  let slides = [];   // [{ch, root, api, built}]
  let cur = -1, curCtx = null, curTl = null;
  let stage, slidesEl, hud, sharedBox;

  function makeApi(box) { return { C, el, fmt, word, box, reduced: REDUCED, mode: MODE, geom: Object.assign({}, G) }; }

  function buildSlides(list) {
    slides = list.map(ch => {
      const root = document.createElement('section');
      root.className = `slide ch-${ch.id}` + (ch.placeholder ? ' placeholder' : '');
      root.dataset.n = ch.n; root.dataset.id = ch.id;
      if (ch.placeholder) root.innerHTML = `<div class="ph-n">${pad2(ch.n)} · ${ch.id}</div><div class="ph-t">chapter module missing</div>`;
      else { injectCss(ch); root.innerHTML = ch.html || ''; }
      slidesEl.appendChild(root);
      return { ch, root, api: null, built: false };
    });
  }
  function build(s) {
    if (s.built) return; s.built = true;
    if (s.ch.build) { try { s.ch.build(s.root, s.api); } catch (e) { showError(s.root, s.ch, 'build', e); } }
  }
  function prevState(i) {
    for (let j = i - 1; j >= 0; j--) if (slides[j].ch.box) return slides[j].ch.box;
    return [];
  }
  function keyState(i) { return slides[i].ch.box || prevState(i); }

  function show(n, progress) {
    const i = clamp(n - 1, 0, slides.length - 1);
    if (curCtx) { try { curCtx.revert(); } catch (e) { console.error(e); } curCtx = null; }
    if (curTl) { curTl.kill(); curTl = null; }
    if (cur >= 0 && cur !== i && slides[cur].ch.leave) { try { slides[cur].ch.leave(slides[cur].root, slides[cur].api); } catch (e) { console.error(e); } }
    slides.forEach((s, k) => s.root.classList.toggle('active', k === i));
    const s = slides[i];
    const box = s.api.box;
    gsap.killTweensOf(box.vals); gsap.killTweensOf(box.node);
    box.clearAnnotations(); box.show(); box.set(prevState(i));
    let tl = null;
    if (s.ch.enter) {
      curCtx = gsap.context(() => { try { tl = s.ch.enter(s.root, s.api); } catch (e) { showError(s.root, s.ch, 'enter', e); } }, s.root);
    }
    if (!tl || typeof tl.progress !== 'function') tl = gsap.timeline();
    tl.pause();
    const p = progress != null ? progress : (REDUCED || FREEZE) ? 1 : null;
    const settle = () => { if (s.ch.box && Math.abs(box.total() - sum(s.ch.box)) > 0.5) box.to(s.ch.box, { duration: 0.6 }); };
    if (p != null) { tl.progress(p); if (p === 1 && s.ch.box && Math.abs(box.total() - sum(s.ch.box)) > 0.5) box.set(s.ch.box); }
    else { tl.call(settle, null, tl.duration()); tl.play(0); }
    curTl = tl;
    cur = i;
    hud.textContent = `${pad2(i + 1)} / ${pad2(slides.length)}`;
    document.title = `${pad2(i + 1)} · ${s.ch.title || s.ch.id} — KaskyrAlmaty`;
    if (location.hash !== '#' + (i + 1)) history.replaceState(null, '', '#' + (i + 1));
    return tl;
  }
  const sum = st => (st || []).reduce((a, b) => a + (+b.mib || 0), 0);

  function fit() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  }

  // DOM overflow report for one slide (stage coordinates): outside the stage, overflowing its box,
  // or intruding into the memory-box zone (y > 880) or the HUD.
  function overflow(n) {
    const s = slides[n - 1]; if (!s) return [];
    const o = stage.getBoundingClientRect(), k = o.width / 1920, out = [];
    const boxVisible = +getComputedStyle(s.api.box.node).opacity > 0.05;
    const nameOf = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : (e.className && e.className.baseVal ? '.' + e.className.baseVal.trim().split(/\s+/).join('.') : ''));
    s.root.querySelectorAll('*').forEach(e => {
      if (e.closest('defs, clipPath, mask, pattern, style, script')) return;
      const cs = e instanceof SVGElement ? null : getComputedStyle(e);
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return;
      const r = e.getBoundingClientRect(); if (!r.width && !r.height) return;
      const l = (r.left - o.left) / k, t = (r.top - o.top) / k, rr = (r.right - o.left) / k, bb = (r.bottom - o.top) / k;
      const box = [Math.round(l), Math.round(t), Math.round(rr), Math.round(bb)];
      const leaf = !e.children.length || e.tagName === 'text' || e.tagName === 'P' || /^H[1-6]$/.test(e.tagName);
      if (e.tagName === 'text' && e.textContent.trim()) { const f = getComputedStyle(e).fill; if (f === 'rgb(0, 0, 0)' || f === '#000000') out.push({ n, el: nameOf(e), issue: 'svg text has no fill (renders black)', text: e.textContent.trim().slice(0, 40) }); }
      if (l < -1 || t < -1 || rr > 1921 || bb > 1081) out.push({ n, el: nameOf(e), issue: 'outside stage', box });
      else if (boxVisible && leaf && bb > 880 && !e.closest('[data-allow-box-zone]')) out.push({ n, el: nameOf(e), issue: 'in box zone (y>880)', box });
      if (cs && cs.overflow === 'visible' && !(e instanceof SVGElement) && (e.scrollWidth > e.clientWidth + 2) && e.clientWidth > 0) out.push({ n, el: nameOf(e), issue: 'content wider than element', scroll: [e.scrollWidth, e.clientWidth] });
    });
    return out;
  }

  async function fontsReady() {
    try {
      await Promise.all([document.fonts.load('600 17px Onest'), document.fonts.load('500 16px "Plex Mono"')]);
      await document.fonts.ready;
    } catch (e) { console.warn('[deck] fonts', e); }
    mcache.clear();
  }
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));

  function chapterList() {
    const list = registry.slice().sort((a, b) => a.n - b.n);
    IDS.forEach((id, k) => { if (!list.some(c => c.n === k + 1)) list.push({ n: k + 1, id, placeholder: true, title: `${pad2(k + 1)} ${id} (missing)` }); });
    return list.sort((a, b) => a.n - b.n);
  }

  async function startDeck() {
    sharedBox = createBox(document.getElementById('boxlayer'));
    buildSlides(chapterList());
    slides.forEach(s => { s.api = makeApi(sharedBox); build(s); });
    addEventListener('resize', fit); fit();
    const go = d => show(cur + 1 + d);
    addEventListener('keydown', e => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') show(1); else if (e.key === 'End') show(slides.length);
    });
    addEventListener('click', e => { if (e.target.closest('a, button, input')) return; go(e.clientX < innerWidth * 0.25 ? -1 : 1); });
    addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10); if (n && n - 1 !== cur) show(n); });
    show(parseInt(location.hash.slice(1), 10) || 1);
  }

  function startPrint() {
    document.body.classList.add('print'); document.documentElement.classList.add('print');
    document.getElementById('boxlayer').style.display = 'none';
    buildSlides(chapterList());
    slides.forEach((s, k) => {
      const svg = el('svg', { class: 'boxlayer', viewBox: '0 0 1920 1080', width: 1920, height: 1080 }, s.root);
      s.api = makeApi(createBox(svg));
      build(s);
      s.api.box.set(prevState(k));
      let tl = null;
      if (s.ch.enter) { try { tl = s.ch.enter(s.root, s.api); } catch (e) { showError(s.root, s.ch, 'enter', e); } }
      if (tl && tl.progress) { tl.pause(); tl.progress(1); }
      if (s.ch.box && Math.abs(s.api.box.total() - sum(s.ch.box)) > 0.5) s.api.box.set(s.ch.box);
      const p = document.createElement('span'); p.className = 'pg-print'; p.textContent = `${pad2(k + 1)} / ${pad2(slides.length)}`; s.root.appendChild(p);
    });
  }

  async function findSegment(id) {
    if (window.__SEGMENT && window.__SEGMENT.id === id) return window.__SEGMENT;
    const pick = j => { const arr = Array.isArray(j) ? j : (j.segments || j.beats || Object.values(j)); return arr.find(x => x && x.id === id); };
    if (window.__SEGMENTS) { const s = pick(window.__SEGMENTS); if (s) return s; }
    try { const r = await fetch('video/SEGMENTS.json'); if (r.ok) { const s = pick(await r.json()); if (s) return s; } } catch (e) { /* file:// without access */ }
    return { id, start: 0, duration: +(params.get('dur') || 5), voiceOffset: 0, words: [], fake: true };
  }

  async function startVideo(id) {
    document.body.classList.add('video');
    gsap.ticker.lagSmoothing(0);
    gsap.defaults({ lazy: false });
    sharedBox = createBox(document.getElementById('boxlayer'));
    buildSlides(chapterList());
    const i = slides.findIndex(s => s.ch.id === id);
    if (i < 0) throw new Error('no chapter ' + id);
    const s = slides[i];
    s.api = makeApi(sharedBox);
    slides.forEach((x, k) => x.root.classList.toggle('active', k === i));
    fit(); addEventListener('resize', fit);
    const seg = await findSegment(id);
    build(s);
    sharedBox.set(prevState(i));
    let tl = null;
    try { tl = s.ch.video ? s.ch.video(s.root, s.api, seg) : (s.ch.enter ? s.ch.enter(s.root, s.api) : null); } catch (e) { showError(s.root, s.ch, 'video', e); }
    if (!tl || typeof tl.duration !== 'function') tl = gsap.timeline();
    if (tl.duration() < seg.duration) tl.to({}, { duration: seg.duration - tl.duration() });
    if (tl.duration() > seg.duration + 1e-3) console.warn(`[deck] ${id}: video timeline ${tl.duration().toFixed(3)} s > segment ${seg.duration} s`);
    // Everything created so far (the chapter timeline and any stray tweens) goes under one paused root,
    // and the global timeline is paused, so nothing moves by wall clock: frames come only from __seek(t).
    tl.paused(false);
    const root = gsap.exportRoot();
    root.pause();
    gsap.globalTimeline.pause();
    const t0 = tl.startTime();
    // Sweep to the end and back so every tween renders its start state; otherwise frame 0
    // shows the keyframe built by build() for one frame (a flash at every chapter cut).
    root.seek(t0 + tl.duration(), true);
    root.seek(t0, true);
    window.__seek = async t => { root.seek(t0 + t, false); await frame(); return t; };
    window.__info = { n: s.ch.n, id, duration: seg.duration, timeline: tl.duration(), fakeSegment: !!seg.fake };
    window.__timeline = tl;
  }

  async function start() {
    stage = document.getElementById('stage');
    slidesEl = document.getElementById('slides');
    hud = document.getElementById('hud');
    await fontsReady();
    try {
      if (MODE === 'video') await startVideo(params.get('video'));
      else if (MODE === 'print') startPrint();
      else await startDeck();
    } catch (e) { console.error('[deck] start', e); window.__error = String(e); }
    await frame(); await frame();
    window.__ready = true;
  }

  window.Deck = {
    chapter, start, show, overflow,
    get count() { return slides.length; },
    get slides() { return slides.map(s => ({ n: s.ch.n, id: s.ch.id, title: s.ch.title, placeholder: !!s.ch.placeholder })); },
    get current() { return cur + 1; },
    get box() { return sharedBox; },
    get timeline() { return curTl; },
    C, el, fmt, word, mode: MODE,
  };
})();
