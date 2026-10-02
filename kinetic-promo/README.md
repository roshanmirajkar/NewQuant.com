# Kinetic promo

A 12-second, 1080×1920 (Reels / Shorts / LinkedIn), 30 fps, 360-frame kinetic-typography promo built
with [Remotion](https://www.remotion.dev). Black, white and electric lime, set in **Anton**
(`@remotion/google-fonts`), with a synthesised sound-design track and animated film grain.

```
STOP  →  SCROLLING  →  THIS IS / WHAT MOTION / LOOKS LIKE  →  letters explode  →  lime flood  →  YOUR BRAND  →  flash
```

## Run it

```bash
npm i
npm run dev                       # Remotion Studio preview
npx remotion render src/index.ts KineticPromo out/kinetic.mp4 --codec h264 --crf 18   # = npm run render
npx remotion still  src/index.ts KineticPromo out/stills/frame-030.png --frame=30
npm run lint                      # eslint + tsc
npm run check:physics             # proves every exploded letter is off-screen before the wipe
npm run sfx                       # regenerate public/sfx/*.wav
```

Rendering needs network access once per render: Anton is fetched from Google Fonts. Frames are
rendered as PNG and the output is tagged Rec.709 (`remotion.config.ts`), so the lime stays lime and
the type edges stay clean.

## Storyboard → code

| Frames | What happens | Where |
| --- | --- | --- |
| 0–45 | Black. `STOP` slams in from scale 3 → 1 with `spring({damping: 10, mass: 0.6})`. Camera shake: random ±6px, decaying over 10 frames, starting on the impact frame (7, the first frame the spring reaches scale 1, found by `findImpactFrame`). | `scenes/OpeningScenes.tsx`, `lib/anim.ts` |
| 45–90 | `STOP` splits through the middle of its caps: top half slides up, bottom half down. `SCROLLING` (`#C6FF00`) shows only through the gap, then the slot shuts just before the stack. | `scenes/OpeningScenes.tsx` |
| 90–180 | Three lines stack one at a time, **8 frames apart**, from alternating sides (left / right / left). Every word has a `clip-path: inset()` mask reveal animating **100% → 0%**. | `scenes/PhraseStack.tsx` |
| 180–270 | The lines explode into letters that rotate and fall off-screen. Per frame: `vy += gravity; y += vy; rotation += spin`, with a seeded random launch (delay, direction, speed, spin) per letter. | `scenes/PhraseStack.tsx`, `lib/physics.ts` |
| 270–330 | A circular `clip-path` grows from the centre and floods the frame with lime. Black `YOUR BRAND` fades up with a 20px rise. | `scenes/LimeWipe.tsx` |
| 330–360 | Hold, then a 6-frame white flash (frames 354–359) to cut. | `components/Flash.tsx` |

Frame numbers live in `src/timeline.ts`.

**Motion rules:** everything is driven by `useCurrentFrame()`, `interpolate()` (always with
`extrapolateRight: 'clamp'`, see `map()` in `lib/anim.ts`) and `spring()`. No CSS transitions or
animations, no `Math.random()` (seeded PRNG in `lib/rng.ts`, so parallel render tabs agree).

## Reskin it

All copy and colours are one typed object, `KineticPromoProps` in `src/props.ts`:

```bash
npx remotion render src/index.ts KineticPromo out/brand.mp4 --codec h264 --crf 18 \
  --props='{"copy":{"stop":"WAIT","reveal":"LOOK","lines":["THIS","IS","YOURS"],"brand":"ACME"},
            "colors":{"accent":"#FF2E93","lines":["#FFFFFF","#FF2E93","#FFFFFF"]}}'
```

| Prop | Meaning |
| --- | --- |
| `copy.stop / reveal / lines[3] / brand` | All on-screen text. Shown uppercase and auto-fitted to the width, so any length works. |
| `colors.background / foreground / accent / ink / flash / mark` | Canvas, STOP, reveal + flood, text on the flood, cut flash, fox-mark fill. |
| `colors.lines[3]` | Colour of each stacked line (and of the letters it explodes into). |
| `grain.opacity / size / loop` | See "Grain" below. `opacity: 0` turns it off. |
| `audio.enabled / volume` | Master switch / gain for every sound slot. |

Type is placed on the **cap-height box** and centred on the **measured ink** (not the advance box), so
caps are optically centred whatever the copy. Measured on the render: STOP margins 90/90px,
SCROLLING 102/102, stack 92/92, end card 121/120.

## Sound design

`src/sfx.ts` lists every cue: file, start frame, volume. `src/components/SoundDesign.tsx` places one
`<Audio>` per cue. The WAVs in `public/sfx/` are synthesised by `scripts/generate-sfx.mjs`
(sine sweeps, filtered noise, a little saturation and reverb), so the project has a punchy track out
of the box.

**TODO(sound):** swap in your own licensed or recorded hits and whooshes. Drop files with the same
names into `public/sfx/` (`hit`, `whoosh-in`, `whoosh`, `swish`, `riser`, `explode`, `brand`,
`flash`), or change `file` in `src/sfx.ts`. Keep `riser.wav` ending where `brand.wav` starts and
`flash.wav` 6 frames long, or lower their volumes, so the loudest peaks don't stack and clip.

## Grain

`components/Grain.tsx` is an SVG `feTurbulence` whose `seed` changes every frame; it is drawn as
white and black speckles so it shows on both the black and the lime.

Random noise is the one thing h264 can't compress. At `--crf 18` a fresh, fine, visible grain every
frame (opacity 0.12) made a **175 MB** file. The defaults (`opacity 0.06`, `size 2.5`, `loop 3`)
give about **24 MB**: subtle, which also survives platform re-encoding far better than heavy grain.
`loop` is how many different noise fields the seed cycles through (`0` = a brand-new one every
frame, much bigger files). Raise `opacity` or lower `size` for more grain and a bigger file.

## Theme

The brief asked for a "Megan Fox themed" video. I treated that as a **styling direction only**: a
noir black / white / toxic-lime look with a geometric fox mark (an animal glyph, `FoxMark.tsx`) on the
end card, in fox orange. No name, photo or likeness of any real person is used anywhere. If you want a
different take, everything visual is in the props and `FoxMark` is a plain SVG you can replace with
your logo.

## Using another font

`lib/typography.ts` holds the font and two measured numbers (`capHeightEm`, `capTopEm`) so caps can be
centred. To switch fonts, render a `T` at 400px with `line-height: 1`, trim it, and put the cap
height and the distance from the top of the line box to the cap top (both ÷ 400) there.
