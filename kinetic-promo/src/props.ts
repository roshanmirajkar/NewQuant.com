import { zColor } from "@remotion/zod-types";
import { z } from "zod";

/**
 * Everything you need to reskin the video lives here: copy, colors, grain and
 * sound-effect filenames. Edit `defaultProps`, tweak them live in the Studio
 * sidebar, or override from the CLI:
 *
 *   npx remotion render src/index.ts KineticPromo out/x.mp4 \
 *     --props='{"copy":{"brand":"ACME"},"colors":{"accent":"#FF3D00"}}'
 */
export const kineticPromoSchema = z.object({
  copy: z.object({
    /** 0-45f: slams in, then splits in two. */
    hook: z.string(),
    /** 45-90f: revealed in the accent color behind the split. */
    reveal: z.string(),
    /**
     * 90-180f: 1-4 lines, stacked one at a time (8-frame stagger), sliding in from
     * alternating sides. Odd-numbered lines (2nd, 4th) are drawn in the accent color.
     */
    stack: z.array(z.string()).min(1).max(4),
    /** 270-360f: black on the accent-colored wipe. */
    brand: z.string(),
  }),
  colors: z.object({
    background: zColor(),
    text: zColor(),
    /** Electric lime by default; also the wipe color. */
    accent: zColor(),
    /** Text color on top of the accent wipe. */
    onAccent: zColor(),
    flash: zColor(),
  }),
  grain: z.object({
    /** 0 disables the film grain. ~0.04 is subtle. */
    opacity: z.number().min(0).max(1),
    /** Grain cell size in px (bigger = chunkier, more "filmic"). */
    size: z.number().min(1).max(4),
  }),
  audio: z.object({
    enabled: z.boolean(),
    /** Master volume, 0-1. 0.6 leaves headroom: overlapping hits + AAC overshoot clip above ~0.8. */
    volume: z.number().min(0).max(1),
    /**
     * Files in `public/`. Defaults are synthesized by `npm run sfx`
     * (scripts/generate-sfx.mjs). TODO: swap in your own whooshes/hits by
     * dropping files into public/sfx/ and changing the names here.
     */
    files: z.object({
      whooshIn: z.string(),
      hit: z.string(),
      split: z.string(),
      line: z.string(),
      riser: z.string(),
      explode: z.string(),
      wipe: z.string(),
      brand: z.string(),
      flash: z.string(),
    }),
  }),
});

export type KineticPromoProps = z.infer<typeof kineticPromoSchema>;

export const defaultProps: KineticPromoProps = {
  copy: {
    hook: "STOP",
    reveal: "SCROLLING",
    stack: ["THIS IS", "WHAT MOTION", "LOOKS LIKE"],
    brand: "YOUR BRAND",
  },
  colors: {
    background: "#000000",
    text: "#FFFFFF",
    accent: "#C6FF00",
    onAccent: "#000000",
    flash: "#FFFFFF",
  },
  grain: { opacity: 0.04, size: 2 },
  audio: {
    enabled: true,
    volume: 0.6,
    files: {
      whooshIn: "sfx/whoosh-in.wav",
      hit: "sfx/hit.wav",
      split: "sfx/split.wav",
      line: "sfx/line.wav",
      riser: "sfx/riser.wav",
      explode: "sfx/explode.wav",
      wipe: "sfx/wipe.wav",
      brand: "sfx/brand.wav",
      flash: "sfx/flash.wav",
    },
  },
};
