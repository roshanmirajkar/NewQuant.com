# Kinetic typography promo

A 12-second vertical kinetic-typography video built with [Remotion](https://www.remotion.dev):
**1080 x 1920, 30 fps, 360 frames**, made for Reels / Shorts / LinkedIn.

## Commands

```console
npm i                # install
npm run dev          # Remotion Studio (edit the props live in the sidebar)
npm run render       # -> out/kinetic.mp4  (h264, crf 18)
npm run stills       # -> out/still-{30,120,220,340}.png
npm run sfx          # regenerate the placeholder sound effects in public/sfx
npm run lint         # eslint + tsc
```

`npm run render` is exactly:

```console
npx remotion render src/index.ts KineticPromo out/kinetic.mp4 --codec h264 --crf 18
```

## Storyboard

| Frames  | Scene                                                                                         |
| ------- | --------------------------------------------------------------------------------------------- |
| 0-45    | Black. `STOP` slams in from scale 3 to 1 (`spring` damping 10, mass 0.6) with a camera shake  |
|         | of random +/-6 px that decays over 10 frames, starting on the frame of impact.                |
| 45-90   | `STOP` splits: top half slides up, bottom half down, revealing `SCROLLING` in lime `#C6FF00`. |
| 90-180  | Three lines stack in from alternating sides, 8 frames apart, each word with a                 |
|         | `clip-path: inset()` mask reveal (100% to 0%).                                                |
| 180-270 | The words explode into letters that spin and fall off-screen under gravity. Velocity and      |
|         | acceleration are integrated per frame; the launch is seeded-random per letter.                |
| 270-330 | A circular `clip-path` wipes the background to lime from the centre; black `YOUR BRAND`       |
|         | fades up with a 20 px rise.                                                                   |
| 330-360 | Hold, then a 6-frame white flash (frames 354-359) to cut.                                     |

Scene boundaries live in `src/timeline.ts`.

## Reskin it

Everything you would want to change is one typed object, `KineticPromoProps` in
`src/props.ts` (zod schema + defaults): **all copy, all colours**, plus the grain
and sound intensity.

```ts
copy:   { stop, scrolling, lines: string[], brand }
colors: { background, text, accent, onAccent, flash }
grainOpacity, grainSize, sfxVolume
```

- In **Studio** the props show up as a form with colour pickers.
- From the **CLI**, override any top-level key:
  `npx remotion render src/index.ts KineticPromo out/acme.mp4 --props='{"copy":{"stop":"WAIT","scrolling":"SCROLLING","lines":["MAKE","SOME","NOISE"],"brand":"ACME"}}'`
  (`--props` replaces whole top-level keys, so pass the complete `copy` object.)

Copy is upper-cased and **auto-fitted** to the safe area (90 px side margins) by
measuring the loaded font, so longer or shorter text keeps working. `lines`
takes 1-5 entries (3 is the design).

## Grain and file size

The grain is an animated layer with a new random pattern every frame, which an
H.264 encoder cannot predict, so **the grain is almost the entire file size**.
Measured on this video at `--crf 18` (1080 x 1920, 12 s):

| `grainOpacity` (size 2.5) | file size |
| ------------------------- | --------- |
| 0 (no grain)              | ~1.4 MB   |
| 0.04                      | ~25 MB    |
| **0.055 (default)**       | **~38 MB**|
| 0.08                      | ~59 MB    |
| 0.12 (size 1, fine)       | ~128 MB   |

Roughly 14 Mbps per unit of noise that survives encoding, regardless of grain
size. Keep it subtle: social platforms re-encode uploads at a few Mbps, where
heavy grain turns into blocky mush. Coarser `grainSize` (about 2 to 3) shows more
grain per byte than pixel-fine grain.

## Motion rules

Animation is driven only by `useCurrentFrame()`, `interpolate()` (always with
`extrapolateRight: "clamp"`) and `spring()`. No CSS transitions or animations.
`random()` (seeded) is used for the shake and the per-letter launches, so every
render is identical. Font: **Anton** via `@remotion/google-fonts`. The grain is an
SVG `feTurbulence` layer whose `seed` is the frame number.

## Sound design

`src/SoundDesign.tsx` places one `<Audio>` slot per beat. The files in
`public/sfx/` are **synthesised placeholders** (`scripts/generate-sfx.mjs`, plain
Node, no dependencies). `@remotion/media-utils` can only analyse audio, not
generate it. To use premium or stock SFX, drop a file with the **same filename**
into `public/sfx/` and the cue keeps its timing.

| File                          | Cue (frame)                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `whoosh-in.wav`               | 0 (STOP flying in), 270 (wipe)                                |
| `hit-heavy.wav`               | 7 (impact, same frame as the shake), 270 (wipe lands)         |
| `split.wav`                   | 45 (STOP splits)                                              |
| `whoosh-left.wav` / `-right`  | 90, 98, 106 (lines slide in; pan follows the direction)       |
| `tick.wav`                    | 98, 106, 114 (lines lock in), 286 (brand lands)               |
| `explosion.wav`               | 180 (words explode)                                           |
| `riser.wav`                   | 153 (into the explosion), 243 (into the wipe), 327 (flash)    |
| `flash.wav`                   | 354 (white flash)                                             |

## Notes

- Text is centred on its capitals with `text-box: trim-both cap alphabetic`
  (Chrome 133+; Remotion's bundled Chrome supports it).
- Fonts are fetched from Google Fonts when the first frame renders, so the
  machine needs network access to `fonts.gstatic.com`.
- Frames are rendered as PNG (see `remotion.config.ts`) so the film grain and
  the hard lime/black edges reach the encoder untouched.
