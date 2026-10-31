# STORY: the red thread for the deck and the video

One story, told twice: the deck (10 slides, clicked through by a presenter) and the video (the same 10 chapters, narrated in Russian by the user's cloned voice). Chapter N of the video IS slide N of the deck, animated to the narration: the slide's final state is the video chapter's keyframe.

## The thread

**Thesis: don't store what you can rebuild.** A free 16 GB T4 is almost full for one small LoRA fine-tune. Nothing about the training may change, so the only freedom is *what we keep in memory*. We found two things the base keeps that it never needs to: a 311-million-number matrix, and 28 layers of activations. We stopped storing them. 14,345 MiB became 2,541 MiB, measured from outside, same loss, all 10 checks. The price is 7 seconds; next we buy them back.

**The protagonist is the memory box**: the T4's 15,360 MiB usable memory, drawn as one horizontal box that appears on every slide in the same place and size (core component `Deck.bar`). Every chapter changes what is inside the box. The viewer always knows where we are by looking at it:

| Ch | Slide/beat id | Box state | Headline (deck, English) — one sentence that moves the story |
|---|---|---|---|
| 1 | `hook` | fills to 14,345, then (teaser) drains to 2,541 | "One small fine-tune fills a free GPU. We made it fit in a sixth." |
| 2 | `why` | 14,345, labelled "base" | "Memory decides who can fine-tune at all." (the free T4 is the GPU most people have; fitting in 2.5 GB means cheaper hardware, room for other work, longer context) |
| 3 | `rules` | 14,345, locked padlock on the box edges | "We may change how it computes, not what it computes." (model, data, steps, optimizer, outputs locked; 10 checks; score = speed term + memory term, ratios < 1.05 count as 1.0) |
| 4 | `where` | X-ray: box splits into weights (small), logit copies (est. 5–7 GB), activations of 28 layers (the rest) | "Two things fill it, and neither needs to be stored." |
| 5 | `head` | the logit-copies block dissolves (label "est. 5–7 GB", no fake measured number) | "Cut 1: the 151,936-wide logits never exist." (vocabulary streamed in chunks; online max / sum-exp; compensated fp16 gradient checked against FP64) |
| 6 | `body` | the activations block collapses; box lands on 2,541 measured | "Cut 2: forget a layer's activations, rebuild them exactly." (own recompute in backward, exact FP32 residual reconstruction bit for bit; NF4 / RMSNorm / RoPE kernels; Soup's gradient_checkpointing stays off, own recompute is allowed and its time counts) |
| 7 | `process` | 2,541; the real ledger path drawn: 14,345 → 12,385 → 9,661 → 5,283 → 2,459 → 2,541 | "We found it by measuring ~550 times." (two humans, two AI orchestrators, experiment → Kaggle T4 → ledger; killed ideas kept) |
| 8 | `result` | base box vs our box side by side | "Same training, 5.6× less memory." (14,345 vs 2,541 MiB by nvidia-smi from outside; eval loss 2.04964 → 2.04961; 10/10 checks; own kernels 8.5% of time; ≈ 47 memory points) |
| 9 | `limits` | our box + a clock: 83.13 s vs 90.07 s | "The price: 7 seconds. Next, we buy them back." (×1.083, inside check 8's +10% with 1.37 s headroom; speed scores 0; next: overlap/fuse recompute, fuse NF4 into the GEMM, cut ~24 s start-up → s ≥ 1.05 needs ≤ 79.2 s) |
| 10 | `close` | 2,541 | "KaskyrAlmaty — 14,345 → 2,541 MiB." Team, links. |

Rules for every chapter:
- One idea per slide. The visual IS the argument (a tensor, a sweep, a collapse, a chart from real data), not a picture next to bullets. Text on a slide ≤ ~40 words besides labels.
- Numbers only from `docs/submission-facts.md` (with the corrections below). Units: MiB for measured numbers; "GB" only for rounded talk ("2.5 GB").
- Motion has meaning: things move because the story changes (the box drains, the logits sweep, layers collapse and rebuild). Ease out, 0.4–1.2 s per move, staggered reveals; no bounces, no spinning, no decorative loops. Every animation settles into a clean, readable final state (the keyframe).
- Visual identity: background `#0B0F14`; text `#E8EDF2`; secondary `#8A96A3`; base/problem `#FF5A36`; ours/solution `#2EE6A6`; mechanism `#5B8CFF`; lines `#1E2833`; panels `#121922`. Fonts: Onest (display/body), IBM Plex Mono (numbers, code). Stage 1920×1080.

## Corrections to the facts sheet (red-team findings)
- The T4 card shows 15,360 MiB usable; say "14,345 of 15,360 MiB", never "14.3 of 16 GB".
- Chronological ledger path (measured): base 14,345 → example kernel 12,385 → body MLP recompute 9,661 → + streamed head 5,283 → + body replay/reconstruction 2,459 (main, failed check 8 in run 51) → submitted 029d932: 2,541. The head's isolated saving was never measured from the base: show the logit block's size only as the estimate "5–7 GB".

## Video narration (already voiced; do not change) — beat id, voiced seconds
hook 11.7 · why 19.0 · rules 9.9 · where 20.0 · head 17.3 · body 16.1 · process 16.3 · result 11.1 · limits 10.6 · close 4.3 (+ end card hold). Word timings: `words.json` in the video folder (see `SEGMENTS.json` when it exists). The narration text per beat is in that folder's `script.js`.
