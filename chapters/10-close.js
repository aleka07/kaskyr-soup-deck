/* Chapter 10: close. The end card: who, where to look, and the box at 2,541 one last time.
   The video segment holds this state calmly for the 7 s end-card tail. */
(function () {
  const BOX = [{ key: 'ours', mib: 2541, color: 'ours', label: 'ours' }];
  const BASE = 14345, OURS = 2541;
  const QR_N = 33;   // modules; QR (ECC M) of https://github.com/BAITC-Hacks/hack-bb68f34c-kaskyralmaty
  const QR_D = 'M0 0h7v1h-7zM9 0h4v1h-4zM14 0h1v1h-1zM16 0h3v1h-3zM20 0h1v1h-1zM23 0h1v1h-1zM26 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM11 1h2v1h-2zM15 1h2v1h-2zM20 1h3v1h-3zM26 1h1v1h-1zM32 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h2v1h-2zM12 2h1v1h-1zM14 2h1v1h-1zM18 2h1v1h-1zM21 2h2v1h-2zM26 2h1v1h-1zM28 2h3v1h-3zM32 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM17 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM26 3h1v1h-1zM28 3h3v1h-3zM32 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h1v1h-1zM11 4h2v1h-2zM14 4h8v1h-8zM23 4h2v1h-2zM26 4h1v1h-1zM28 4h3v1h-3zM32 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h1v1h-1zM13 5h1v1h-1zM18 5h1v1h-1zM20 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h7v1h-7zM8 7h1v1h-1zM10 7h2v1h-2zM14 7h1v1h-1zM16 7h1v1h-1zM21 7h1v1h-1zM23 7h2v1h-2zM0 8h1v1h-1zM2 8h5v1h-5zM9 8h5v1h-5zM26 8h5v1h-5zM0 9h1v1h-1zM4 9h2v1h-2zM12 9h2v1h-2zM16 9h2v1h-2zM20 9h1v1h-1zM23 9h1v1h-1zM26 9h2v1h-2zM29 9h2v1h-2zM32 9h1v1h-1zM1 10h2v1h-2zM5 10h3v1h-3zM10 10h7v1h-7zM24 10h2v1h-2zM28 10h1v1h-1zM30 10h2v1h-2zM3 11h2v1h-2zM7 11h3v1h-3zM12 11h2v1h-2zM19 11h1v1h-1zM21 11h2v1h-2zM24 11h1v1h-1zM26 11h1v1h-1zM28 11h4v1h-4zM1 12h1v1h-1zM4 12h1v1h-1zM6 12h2v1h-2zM9 12h4v1h-4zM14 12h4v1h-4zM22 12h3v1h-3zM28 12h2v1h-2zM0 13h1v1h-1zM2 13h1v1h-1zM5 13h1v1h-1zM8 13h2v1h-2zM13 13h1v1h-1zM15 13h1v1h-1zM18 13h3v1h-3zM23 13h1v1h-1zM25 13h3v1h-3zM30 13h3v1h-3zM0 14h1v1h-1zM6 14h1v1h-1zM8 14h2v1h-2zM13 14h4v1h-4zM22 14h1v1h-1zM24 14h6v1h-6zM31 14h1v1h-1zM0 15h2v1h-2zM7 15h2v1h-2zM11 15h1v1h-1zM14 15h2v1h-2zM18 15h2v1h-2zM21 15h1v1h-1zM25 15h3v1h-3zM29 15h2v1h-2zM1 16h1v1h-1zM3 16h6v1h-6zM11 16h3v1h-3zM15 16h1v1h-1zM22 16h1v1h-1zM24 16h2v1h-2zM27 16h2v1h-2zM32 16h1v1h-1zM0 17h3v1h-3zM9 17h3v1h-3zM14 17h1v1h-1zM16 17h1v1h-1zM18 17h1v1h-1zM20 17h2v1h-2zM23 17h1v1h-1zM26 17h2v1h-2zM29 17h2v1h-2zM32 17h1v1h-1zM1 18h1v1h-1zM3 18h2v1h-2zM6 18h2v1h-2zM10 18h1v1h-1zM12 18h2v1h-2zM15 18h2v1h-2zM18 18h1v1h-1zM20 18h2v1h-2zM24 18h1v1h-1zM26 18h3v1h-3zM30 18h2v1h-2zM0 19h1v1h-1zM2 19h3v1h-3zM7 19h5v1h-5zM14 19h2v1h-2zM19 19h4v1h-4zM27 19h4v1h-4zM1 20h1v1h-1zM5 20h3v1h-3zM10 20h1v1h-1zM12 20h4v1h-4zM17 20h1v1h-1zM19 20h2v1h-2zM22 20h1v1h-1zM25 20h1v1h-1zM27 20h3v1h-3zM32 20h1v1h-1zM0 21h2v1h-2zM3 21h1v1h-1zM5 21h1v1h-1zM7 21h1v1h-1zM9 21h4v1h-4zM15 21h2v1h-2zM19 21h6v1h-6zM26 21h1v1h-1zM32 21h1v1h-1zM0 22h1v1h-1zM3 22h4v1h-4zM10 22h2v1h-2zM14 22h1v1h-1zM17 22h2v1h-2zM20 22h1v1h-1zM25 22h1v1h-1zM27 22h3v1h-3zM31 22h1v1h-1zM0 23h1v1h-1zM2 23h1v1h-1zM4 23h2v1h-2zM7 23h1v1h-1zM9 23h1v1h-1zM14 23h1v1h-1zM16 23h1v1h-1zM21 23h7v1h-7zM30 23h2v1h-2zM0 24h1v1h-1zM2 24h1v1h-1zM5 24h3v1h-3zM9 24h2v1h-2zM13 24h2v1h-2zM17 24h3v1h-3zM22 24h1v1h-1zM24 24h5v1h-5zM32 24h1v1h-1zM8 25h4v1h-4zM16 25h1v1h-1zM18 25h2v1h-2zM21 25h1v1h-1zM23 25h2v1h-2zM28 25h1v1h-1zM30 25h1v1h-1zM32 25h1v1h-1zM0 26h7v1h-7zM10 26h6v1h-6zM20 26h1v1h-1zM23 26h2v1h-2zM26 26h1v1h-1zM28 26h1v1h-1zM30 26h2v1h-2zM0 27h1v1h-1zM6 27h1v1h-1zM8 27h1v1h-1zM10 27h1v1h-1zM14 27h2v1h-2zM18 27h1v1h-1zM20 27h5v1h-5zM28 27h5v1h-5zM0 28h1v1h-1zM2 28h3v1h-3zM6 28h1v1h-1zM8 28h1v1h-1zM10 28h5v1h-5zM17 28h1v1h-1zM19 28h2v1h-2zM22 28h1v1h-1zM24 28h6v1h-6zM31 28h2v1h-2zM0 29h1v1h-1zM2 29h3v1h-3zM6 29h1v1h-1zM8 29h2v1h-2zM13 29h1v1h-1zM15 29h1v1h-1zM17 29h1v1h-1zM19 29h2v1h-2zM23 29h3v1h-3zM28 29h2v1h-2zM31 29h2v1h-2zM0 30h1v1h-1zM2 30h3v1h-3zM6 30h1v1h-1zM8 30h9v1h-9zM20 30h1v1h-1zM22 30h1v1h-1zM26 30h2v1h-2zM29 30h2v1h-2zM0 31h1v1h-1zM6 31h1v1h-1zM9 31h1v1h-1zM13 31h3v1h-3zM19 31h1v1h-1zM21 31h3v1h-3zM25 31h1v1h-1zM28 31h3v1h-3zM0 32h7v1h-7zM8 32h1v1h-1zM19 32h1v1h-1zM22 32h1v1h-1zM24 32h1v1h-1zM26 32h2v1h-2zM31 32h1v1h-1z';
  const E = 'power3.out', IO = 'power2.inOut';
  let N = null;

  // the freed part of the box: a dashed outline from 2,541 to the base's 14,345, drawn as a box annotation
  function ghost(api) {
    const { C, el } = api, G = api.box.geom || api.geom, X = m => G.x0 + m / G.max * (G.x1 - G.x0);
    const g = el('g', { class: 'cl-ghost' }, api.box.node);
    const x0 = X(OURS) + 1, x1 = X(BASE);
    const r = el('rect', { x: x0, y: G.y0 + 1, width: x1 - x0, height: G.y1 - G.y0 - 2, fill: C.base, 'fill-opacity': 0.05,
      stroke: C.base, 'stroke-opacity': 0.8, 'stroke-width': 1.5, 'stroke-dasharray': '7 6' }, g);
    const t = el('text', { x: x1 - 16, y: (G.y0 + G.y1) / 2 + 6, 'text-anchor': 'end', 'font-size': 18 }, g);
    t.style.fill = C.base;
    el('tspan', {}, t, 'base peak ');
    el('tspan', {}, t, '14,345');
    return { g, r, t, w: x1 - x0 };
  }

  function seq(api, T, tl) {
    const n = N, gh = ghost(api);
    tl.fromTo(n.name, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: E }, T.name)
      .fromTo(n.from, { opacity: 0 }, { opacity: 1, duration: 0.5 }, T.nums)
      // the base's peak returns as an outline only: what the same fine-tune used to need
      .fromTo(gh.g, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: E }, T.nums)
      .fromTo([n.arrow, n.to], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.12, ease: E }, T.nums + 0.35)
      .fromTo(n.sub, { opacity: 0 }, { opacity: 1, duration: 0.6 }, T.nums + 0.6)
      .fromTo(n.people, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: E }, T.people);
    T.links.forEach((t, i) => tl.fromTo(n.links[i], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: E }, t));
    tl.fromTo(n.qr, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: E }, T.qr);
    return tl;
  }

  Deck.chapter({
    n: 10, id: 'close',
    title: 'KaskyrAlmaty: 14,345 to 2,541 MiB.',
    box: BOX,
    html: `
      <h1 class="cl-name">KaskyrAlmaty</h1>
      <p class="cl-nums"><span class="cl-from">14,345</span><span class="cl-arrow">→</span><span class="cl-to">2,541<small>MiB</small></span></p>
      <p class="cl-sub">Peak GPU memory of the same LoRA fine-tune on a Kaggle T4, run 52.</p>
      <div class="cl-people">
        <div class="cl-p"><b>Alikhan Amirkhanov</b><span>captain, head lane</span></div>
        <div class="cl-p"><b>Timur Ishmurzin</b><span>body lane</span></div>
      </div>
      <dl class="cl-links">
        <div class="cl-l"><dt>code and ledgers</dt><dd><a href="https://github.com/BAITC-Hacks/hack-bb68f34c-kaskyralmaty">github.com/BAITC-Hacks/hack-bb68f34c-kaskyralmaty</a></dd></div>
        <div class="cl-l"><dt>notebook, run 52</dt><dd><a href="https://www.kaggle.com/code/alikhanamirkhanov/kaskyr-head-1?scriptVersionId=364215273">kaggle.com/code/alikhanamirkhanov/kaskyr-head-1?scriptVersionId=364215273</a></dd></div>
        <div class="cl-l"><dt>this deck</dt><dd><a href="https://aleka07.github.io/kaskyr-soup-deck/">aleka07.github.io/kaskyr-soup-deck</a></dd></div>
      </dl>
      <figure class="cl-qr">
        <svg viewBox="-4 -4 ${QR_N + 8} ${QR_N + 8}" shape-rendering="crispEdges" aria-label="QR code: repository"><rect x="-4" y="-4" width="${QR_N + 8}" height="${QR_N + 8}" fill="#E8EDF2"/><path d="${QR_D}" fill="#0B0F14"/></svg>
        <figcaption>repository</figcaption>
      </figure>`,
    css: `
      .ch-close .cl-name { font-size: 168px; line-height: 0.92; font-weight: 700; letter-spacing: -0.045em; margin-left: -8px; color: #E8EDF2; }
      .ch-close .cl-nums { margin-top: 44px; font-family: "Plex Mono", ui-monospace, monospace; font-weight: 500; font-size: 76px; line-height: 1;
        letter-spacing: -0.03em; color: #E8EDF2; display: flex; align-items: baseline; gap: 30px; }
      .ch-close .cl-from { color: #FF5A36; }
      .ch-close .cl-arrow { color: #8A96A3; font-family: "Onest", system-ui, sans-serif; font-weight: 300; }
      .ch-close .cl-to { color: #2EE6A6; }
      .ch-close .cl-to small { font-size: 0.42em; color: #8A96A3; letter-spacing: 0; margin-left: 0.35em; }
      .ch-close .cl-sub { margin-top: 20px; font-size: 24px; color: #8A96A3; }
      .ch-close .cl-people { position: absolute; left: 120px; top: 560px; display: flex; gap: 96px; }
      .ch-close .cl-p b { display: block; font-size: 34px; font-weight: 600; letter-spacing: -0.02em; color: #E8EDF2; line-height: 1.15; }
      .ch-close .cl-p span { display: block; font-size: 22px; color: #8A96A3; margin-top: 6px; }
      .ch-close .cl-links { position: absolute; left: 120px; top: 686px; display: grid; row-gap: 14px; }
      .ch-close .cl-l { display: grid; grid-template-columns: 220px auto; align-items: baseline; }
      .ch-close .cl-l dt { font-size: 20px; color: #8A96A3; }
      .ch-close .cl-l dd a { font-family: "Plex Mono", ui-monospace, monospace; font-weight: 500; font-size: 25px; color: #E8EDF2; text-decoration: none; letter-spacing: -0.01em; }
      .ch-close .cl-l dd a:hover, .ch-close .cl-l dd a:focus-visible { text-decoration: underline; text-underline-offset: 5px; outline: none; }
      .ch-close .cl-qr { position: absolute; right: 120px; top: 560px; width: 196px; margin: 0; }
      .ch-close .cl-qr svg { display: block; width: 196px; height: 196px; }
      .ch-close .cl-qr figcaption { margin-top: 12px; font-size: 18px; color: #8A96A3; }
    `,

    build(root) {
      N = {
        name: root.querySelector('.cl-name'), from: root.querySelector('.cl-from'), arrow: root.querySelector('.cl-arrow'),
        to: root.querySelector('.cl-to'), sub: root.querySelector('.cl-sub'), people: root.querySelectorAll('.cl-p'),
        links: root.querySelectorAll('.cl-l'), qr: root.querySelector('.cl-qr'),
      };
    },

    enter(root, api) {
      api.box.set(BOX);
      return seq(api, { name: 0, nums: 0.5, people: 1.4, links: [1.7, 1.85, 2.0], qr: 2.3 }, gsap.timeline());
    },

    video(root, api, seg) {
      const at = (w, fb) => { const t = (seg.words || []).length ? api.word(seg, w) : null; return t == null ? fb : t; };
      api.box.set(BOX);
      // narration (close): Команда Каскыр Алматы. Код, ноутбук и все журналы в репозитории.
      const tl = gsap.timeline({ paused: true });
      seq(api, {
        name: at('Команда', 0.26),
        nums: at('Алматы', 1.09),
        people: at('Алматы', 1.09) + 0.5,
        links: [at('Код', 1.88), at('ноутбук', 2.24), at('журналы', 3.06)],
        qr: at('репозитории', 3.72),
      }, tl);
      if (tl.duration() < seg.duration) tl.set({}, {}, seg.duration);
      return tl;
    },
  });
})();
