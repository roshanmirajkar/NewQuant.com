# Kinetic promo

12-second kinetic-typography video for Reels / Shorts / LinkedIn. 1080×1920, 30fps, 360 frames. Built with [Remotion](https://www.remotion.dev/) and Anton (via `@remotion/google-fonts`).

```bash
npm i
npm run dev        # Remotion Studio, composition "KineticPromo"
npm run render     # out/kinetic.mp4  (h264, crf 18)
npm run sfx        # regenerate the placeholder sound effects in public/sfx/
npx remotion still src/index.ts KineticPromo out/still.png --frame=120
```

## Storyboard

| Frames  | What happens |
| ------- | ------------ |
| 0–45    | `STOP` slams in from scale 3 → 1 (`spring({damping: 10, mass: 0.6})`). Random ±6px camera shake from the frame it lands, decaying over 10 frames. |
| 45–90   | `STOP` splits along its centre line; top half slides up, bottom half down, revealing lime `SCROLLING` in the gap. |
| 90–180  | `THIS IS` / `WHAT MOTION` / `LOOKS LIKE` slide in from alternating sides, 8 frames apart. Each word is mask-revealed with an animated `clip-path: inset()`. |
| 180–270 | Every letter is launched with a seeded velocity and spin and falls under gravity (integrated per frame) until it is off-screen. |
| 270–330 | A lime circle wipes out from the centre; `YOUR BRAND` fades up 20px. |
| 330–360 | Hold, then a 6-frame white flash into the cut (fully white on the last two frames). |

Animation is driven only by `useCurrentFrame`, `interpolate` (clamped) and `spring`; there are no CSS transitions. The film grain is an SVG `feTurbulence` re-seeded with the frame number.

## Reskinning

Everything lives in **`src/props.ts` → `defaultProps`**:

- `copy`: all the words. Anything you type is upper-cased and auto-fitted to `layout.maxTextWidth`, so longer or shorter copy re-flows by itself.
- `colors`: background, per-word colours, the wipe colour, sign-off colour, flash.
- `grain`: strength and fineness (`opacity: 0` turns it off).
- `audio`: on/off and a master volume.

You can also override them per render: `npx remotion render ... --props='{"copy":{"brand":"ACME"}}'` (pass the full `copy` object).

Timing constants are in `src/timeline.ts`; spring configs sit at the top of each scene file in `src/scenes/`.

## Sound design

`src/sfx.ts` is the cue sheet: ten `<Audio>` slots (frame, volume, and a `todo` note describing what each sound should do). The files in `public/sfx/` are placeholders synthesised by `scripts/generate-sfx.mjs` (whooshes, hits, a riser, a chime) so the video has a full mix out of the box.

To use licensed samples, drop a file with the **same name** into `public/sfx/` and delete its entry in `generate-sfx.mjs` so `npm run sfx` stops overwriting it. Two cues have timing contracts: `01_slam-whoosh.wav` should peak 6 frames in, and `06_wipe-riser.wav` should peak on its last frame.

## Notes

- If you swap the font, re-derive the three metric constants in `src/font.ts`; the centring maths depends on cap-height and ascent/descent.
- Grain is incompressible by design, so it dominates the file size. Lower `grain.opacity` (or set it to 0) for a much smaller file.
