# KineticPromo

12-second (360 frames @ 30fps) vertical 1080x1920 kinetic-typography promo for
Reels / Shorts / LinkedIn, built with [Remotion](https://www.remotion.dev).

| Frames  | What happens |
| ------- | ------------ |
| 0-45    | `STOP` slams in (scale 3 -> 1, `spring({damping: 10, mass: 0.6})`) with a 10-frame decaying +/-6px camera shake |
| 45-90   | `STOP` splits; top half slides up, bottom slides down, revealing `SCROLLING` in lime |
| 90-180  | Three lines stack in (8-frame stagger, alternating sides), each word mask-revealed with an animated `clip-path: inset()` |
| 180-270 | Every letter breaks off and falls with per-frame gravity, seeded random per letter |
| 270-330 | Circular `clip-path` wipe to lime; black brand text fades up 20px |
| 330-360 | Hold, then a 6-frame white flash to cut |

## Run

```bash
npm i
npm run dev        # Remotion Studio (props editable in the sidebar)
npm run sfx        # (re)generate the sound-effect WAVs in public/sfx
npm run render     # -> out/kinetic.mp4  (h264, crf 18)

npx remotion still src/index.ts KineticPromo out/still-030.png --frame=30
```

## Reskin

Everything customizable is in **`src/props.ts`** (a typed zod schema + `defaultProps`):
copy, colors, grain strength/size, and sound-effect filenames. Override from the CLI:

```bash
npx remotion render src/index.ts KineticPromo out/acme.mp4 --codec h264 --crf 18 \
  --props='{"copy":{"brand":"ACME"},"colors":{"accent":"#FF3D00"}}'
```

Text is auto-fitted to the 80px side safe-area with `fitText`, so longer or shorter
copy won't overflow. `copy.stack` takes 1-4 lines (odd lines use the accent color).

Timing lives in `src/timeline.ts`.

## Animation rules

Only `useCurrentFrame`, `interpolate` (always clamped) and `spring` drive motion;
there are no CSS transitions/animations. Randomness uses Remotion's seeded `random()`.
Font is Anton via `@remotion/google-fonts`.

## Sound design

`scripts/generate-sfx.mjs` synthesizes nine stems (whoosh-in, hit, split, line swipe,
riser, explode, wipe, brand sting, flash) into `public/sfx/*.wav`. Each is placed on the
frame of its visual in `src/SoundDesign.tsx`. To use your own sounds, drop files into
`public/sfx/` and change the names in `audio.files` (`src/props.ts`).

## File size

Animated grain is the main cost at `--crf 18` (the scene without grain is ~1 MB).
For smaller files: lower `grain.opacity`, or render with `--crf 23`.
