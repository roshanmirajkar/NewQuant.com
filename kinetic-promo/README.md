# Kinetic promo

A 12-second, 1080x1920, 30 fps kinetic-typography video for Reels / Shorts / LinkedIn.
Two renderers of the same storyboard live here.

## Remotion (`src/`)

```console
npm i
npm run dev                      # Studio preview
npx remotion render src/index.ts KineticPromo out/kinetic.mp4 --codec h264 --crf 18
npx remotion still  src/index.ts KineticPromo out/still-030.png --frame=30
npm run lint                     # eslint + tsc
```

Animation is driven only by `useCurrentFrame`, `interpolate` and `spring` (no CSS transitions).
Font: Anton via `@remotion/google-fonts`.

**Reskin:** everything lives in `src/props.ts` (`KineticPromoProps`): copy, colours, grain
strength, seed, sound on/off. Frame numbers live in `src/timing.ts`. Font sizes are fitted to the
copy automatically, so changing the words does not clip them.

**Sound:** `src/sfx.ts` is the cue sheet (frame, file, volume). `public/sfx/*.wav` are synthesised
placeholders from `node scripts/generate-sfx.mjs`; drop a file with the same name into
`public/sfx/` to replace one.

**Grain vs. file size:** the film grain is the dominant cost at CRF 18 (about 2 MB without it,
about 20 MB at the default `grainOpacity` of 0.14, about 3x that at 0.3).

## Python (`kinetic_promo.py`)

One file, numpy + Pillow + an `ffmpeg` binary. Frames are composited in memory and piped as raw
RGB to ffmpeg; nothing is written to disk except the MP4 and a 3-tile contact sheet.

```console
python3 kinetic_promo.py         # -> out/kinetic_py.mp4, out/kinetic_py_contact.png
```

Video only (no sound design); uses a system bold sans (Liberation Sans Bold, falling back to
DejaVu Sans Bold).
