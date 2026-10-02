/**
 * Everything you need to reskin the promo lives in `defaultProps` below:
 * copy, colours, grain and audio. Timing lives in `timeline.ts`.
 *
 * Copy is upper-cased at render time (Anton's caps are what the layout math
 * is built around), and every line is auto-fitted to `layout.maxTextWidth`,
 * so longer or shorter copy re-flows by itself.
 */

export type KineticPromoProps = {
  copy: {
    /** 0-45f: slams in, then splits open. */
    hook: string;
    /** 45-90f: revealed in the gap between the two halves of `hook`. */
    reveal: string;
    /** 90-180f: stacked one line at a time, then exploded into letters. */
    stack: readonly [string, string, string];
    /** 270-360f: the sign-off on the lime wipe. */
    brand: string;
  };
  colors: {
    /** Scenes 1-4 background. */
    background: string;
    /** Hook word colour. */
    hook: string;
    /** Reveal word colour (the contrasting electric lime). */
    reveal: string;
    /** One colour per stacked line. */
    stack: readonly [string, string, string];
    /** Colour the background wipes to in scene 5. */
    wipe: string;
    /** Sign-off text colour (sits on `wipe`). */
    brand: string;
    /** Final 6-frame flash. */
    flash: string;
  };
  layout: {
    /** Widest any line may be, in px. 1080 - 2 * 90px side margin = 900. */
    maxTextWidth: number;
    /** Upper bound for the stacked lines' font size, so short lines don't dwarf the rest. */
    maxStackFontSize: number;
  };
  grain: {
    /** 0 disables the overlay. */
    opacity: number;
    /** feTurbulence baseFrequency: higher = finer grain. Below ~0.4 it turns blotchy. */
    baseFrequency: number;
  };
  audio: {
    enabled: boolean;
    /** Multiplies every cue's own volume (see `sfx.ts`). */
    masterVolume: number;
  };
};

export const defaultProps: KineticPromoProps = {
  copy: {
    hook: "STOP",
    reveal: "SCROLLING",
    stack: ["THIS IS", "WHAT MOTION", "LOOKS LIKE"],
    brand: "YOUR BRAND",
  },
  colors: {
    background: "#000000",
    hook: "#FFFFFF",
    reveal: "#C6FF00",
    stack: ["#FFFFFF", "#C6FF00", "#FFFFFF"],
    wipe: "#C6FF00",
    brand: "#000000",
    flash: "#FFFFFF",
  },
  layout: {
    maxTextWidth: 900,
    maxStackFontSize: 330,
  },
  // Fresh noise every frame is the worst case for H.264, so this is a size
  // dial as much as a look dial. At crf 18: 0.16 -> ~146 MB, 0.10 -> ~60 MB,
  // 0.06 -> ~25 MB, and at <= 0.04 the encoder drops the grain entirely.
  grain: {
    opacity: 0.06,
    baseFrequency: 0.7,
  },
  audio: {
    enabled: true,
    masterVolume: 1,
  },
};
