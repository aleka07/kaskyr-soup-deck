# Deck v2 contract (core ↔ chapters)

Read `STORY.md` first. The deck is rebuilt as a core plus 10 chapter modules, one file per chapter, so chapter owners work in parallel. The v1 deck is preserved in `v1/` (reference only; reuse its ideas or code freely).

## Files and ownership
- Core (one owner): `index.html`, `assets/core.js`, `assets/core.css`, `assets/gsap.min.js`, `assets/fonts/`, `tools/capture.mjs`, `tools/shots.mjs`.
- Chapter N (its owner only): `chapters/NN-<id>.js` and, if needed, `chapters/NN-<id>.assets/`. Ids: 01-hook, 02-why, 03-rules, 04-where, 05-head, 06-body, 07-process, 08-result, 09-limits, 10-close.
- Video timing (from the video agent): `video/SEGMENTS.json`; mux: `video/mux.sh`.
- Nobody but the orchestrator runs `git add`/`git commit` in this worktree.

## Chapter module API
`index.html` loads `assets/gsap.min.js`, `assets/ledger.js`, `assets/core.js`, then `chapters/01-hook.js` … `chapters/10-close.js` in order, then calls `Deck.start()`. A missing chapter file must not break the deck (core shows a placeholder slide).

```js
Deck.chapter({
  n: 5, id: 'head',
  title: 'Cut 1: the 151,936-wide logits never exist.',   // used for the hash/title
  html: `...`,          // inner HTML of the slide's <section>; core wraps it in <section class="slide ch-head">
  css: `...`,           // injected once into <head>; every selector must start with .ch-head
  box: [ /* box state when the slide is at its keyframe; see Deck.box */ ],
  build(root, api) {},  // once, after insertion: create SVG etc.
  enter(root, api) {    // deck: called on slide entry; return a gsap timeline (≤ 7 s) ending in the keyframe state
    return gsap.timeline();
  },
  video(root, api, seg) { // video: return a PAUSED-able gsap timeline whose duration is exactly seg.duration
    // seg = the SEGMENTS.json entry: { id, start, duration, voiceOffset, words: [{word, start, end}] } (times relative to the segment)
    // api.word(seg, 'гигабайт', k=0) -> start time (s) of the k-th occurrence of a word (case-insensitive, punctuation ignored)
    return gsap.timeline();
  },
});
```

`api` (from core): `C` (palette `{bg, ink, dim, base, ours, mech, line, panel}`), `el(tag, attrs, parent, text)` (SVG element helper), `fmt(n)` (en-US thousands separator), `word(seg, w, k)`, `box` (below), `reduced` (prefers-reduced-motion).

## The memory box (core component, the protagonist)
One horizontal box, same place on every slide: x 120–1800, y 930–990 on the 1920×1080 stage, scale 0 … 15,360 MiB (the T4's usable memory), tick labels every 2,048 MiB, a "15,360 MiB T4" label at its right end, a value readout (`14,345 MiB`) at its left above it.
A state is an array of blocks from left to right: `[{ key, mib, color, label, est }]` (`color` one of 'base' | 'ours' | 'mech' | 'dim' or a hex; `est: true` draws the block hatched with its label marked "est."). Methods:
- `api.box.set(state)` — jump.
- `api.box.to(state, { duration = 1, ease = 'power2.inOut' }) → gsap tween/timeline` — animates block widths (blocks matched by key; new keys grow from 0, missing keys shrink to 0) and the readout (sum of blocks).
- `api.box.hide()` / `api.box.show()` and `api.box.tweenHide()`… → tweens — for chapters that draw a large box of their own (e.g. hook, result).
- `api.box.node` — the root SVG group, if a chapter needs to add an annotation (remove it on leave).
On slide entry core sets the box to the previous slide's keyframe state; the chapter animates it to its own `box` state inside `enter()`/`video()`.

## Modes
- Deck (default): 16:9 stage scaled to the viewport and centred; ←/→/space/PageUp/PageDown/click; `#N` hash; slide counter; `?print` lays all slides out at keyframe states for PDF; reduced motion → keyframe states.
- Video: `index.html?video=<id>` shows only that chapter, with `video()` built and paused at t=0; `window.__seek(t)` seeks it (and any core tweens) and resolves after a frame; `window.__ready` is true when fonts and build are done. `tools/capture.mjs <id>` (run on superpc) captures every frame at 30 fps 1920×1080 into `video/seg-NN-<id>.mp4` (silent, exact duration from SEGMENTS.json).
- `tools/shots.mjs [ids…]` (superpc): keyframe screenshot per chapter into `shots/NN-<id>.png`, plus `shots/NN-<id>-mid.png` at the middle of `enter()`; reports DOM overflow.

## superpc
Heavy commands (headless Chrome, ffmpeg) run on superpc only: `~/.claude/superpc/README.md`. Use `SUPERPC_MIRROR=decentrathon-deck` (it has `node_modules` with `puppeteer-core`); push from the worktree root: `SUPERPC_MIRROR=decentrathon-deck ~/.claude/superpc/push.sh presentation/<your files>`; run `node presentation/tools/…`; pull your own outputs. Sessions are serialised by a lock: keep each run short and batch your work.

## Changes (core owner; all backward-compatible)
- `SEGMENTS.json` is `{ fps, …, segments: [ { n, id, start, duration, voiceOffset, words, … } ] }`; core and `capture.mjs` accept that or a bare array.
- `api` also has `geom` (`{x0:120, x1:1800, y0:930, y1:990, max:15360, tick:2048}`), `mode` ('deck' | 'print' | 'video') and `box.X(mib)` → stage x of a MiB value, `box.total()`, `box.state` (last target), `box.clearAnnotations()`.
- Optional `leave(root, api)` hook. Core also removes everything a chapter appended to `api.box.node` and resets box opacity to 1 on every slide entry, so annotations need no manual cleanup.
- Layout zones: chapter content stays within x 120–1800, y 80–870. y > 880 is the memory box (readout and above-labels at y 890–916, box 930–990, tick labels to ~1020). The slide counter sits top-right (x ≤ 1800, y 40–56). `shots.mjs` flags leaf elements below y 880 (opt out with `data-allow-box-zone` on a container).
- `enter()`/`video()` are called as methods (`this` = the chapter object, so `this.box` works); `enter` runs inside a `gsap.context` scoped to the slide root (string selectors resolve inside the slide) and is reverted on leave.
- Video: if a chapter has no `video()`, core uses `enter()` padded to `seg.duration`. Put every tween in the returned timeline; tweens created in `onComplete`/`call` callbacks run on a paused global clock and will not animate. `api.word()` falls back to a prefix match (Russian inflections: `api.word(seg, 'гигабайт')` matches "гигабайта"), and returns `null` with a console warning when the word is missing (so `api.word(...) ?? fallback` works).
- SVG text: core.css sets only the font for `svg text`; its fill rule is scoped to the box (`.mbox text`). Chapter text with a `fill` attribute, inline style or class rule keeps that colour; chapter text with no fill at all falls back to `--dim` through a zero-specificity `:where(.slide svg text:not([fill]))`. `shots.mjs` reports any SVG text that still renders black.
- Internally box keys are prefixed, so any key name is safe. `api.box.to()` tweens are non-lazy; in video mode `gsap.defaults({lazy:false})` is set.
- `?freeze` shows keyframes without animation; `?reduced` forces reduced motion; `?video=<id>&dur=7` fakes a segment length when SEGMENTS.json has no entry.

## Core status (22:40, works; hardened)
1. Core is live: `index.html`, `assets/core.js`, `assets/core.css`. Load your chapter by its file name; a missing file shows a placeholder slide.
2. Test in the deck: open `presentation/index.html#N` (N = chapter number). `?freeze#N` = keyframe; `?print` = all slides; `?video=<id>` + `window.__seek(t)` in devtools.
3. Memory box: `api.box.set/to/hide/show/tweenHide/tweenShow`, keyed blocks, `est: true` → hatched + "· est." label. Labels that do not fit inside their block move above it with a leader line, or hide.
4. Screenshots (superpc): `SUPERPC_MIRROR=decentrathon-deck ~/.claude/superpc/push.sh presentation/chapters/NN-<id>.js` (and your `.assets/`), then `~/.claude/superpc/run.sh 'node presentation/tools/shots.mjs <id>'`, pull `presentation/shots/NN-<id>.png`, `NN-<id>-mid.png`, `presentation/shots/report.json` (overflow + errors).
5. Video (superpc): `run.sh 'node presentation/tools/capture.mjs <id> [<id>…|all]'` → `presentation/video/seg-NN-<id>.mp4` (exact frame count from SEGMENTS.json; `--from 2 --to 4` writes a short preview `seg-NN-<id>-fA-B.mp4`). The JSON report lists page errors and `api.word` misses.
6. The core's own push set (if the mirror lacks it): `presentation/index.html presentation/assets presentation/tools/shots.mjs presentation/tools/capture.mjs`.
7. Verified on superpc with a sample chapter: stage centred at 1920×1080, 1366×768, 1280×1024, 2560×1080; keys/clicks/hash; capture 150/150 frames at ~23 frames/s on the RTX 4090; hook 412/412 at ~20 frames/s; a fresh-page partial capture matches the full one at ~56 dB PSNR (deterministic, no stale frame). `?print` → 1 page per slide, each with its own box. The sample chapter is no longer loaded.
