/**
 * Everything you need to reskin the promo lives in this one object:
 * copy, colours, grain strength, seeds and sound on/off.
 *
 * Override from the CLI without touching code:
 *   npx remotion render src/index.ts KineticPromo out/x.mp4 \
 *     --props='{"colors":{"background":"#000","text":"#fff","accent":"#FF3D00","brandText":"#000","flash":"#fff"}}'
 * (--props replaces whole top-level keys, so pass complete `copy` / `colors` objects.)
 */
export type KineticPromoProps = {
  copy: {
    /** 0-45f: slams in, then splits open. Keep it short (1 word reads best). */
    hook: string;
    /** 45-90f: revealed in the accent colour behind the split. */
    reveal: string;
    /** 90-180f: three lines, one per stack row; spaces separate masked words. */
    lines: [string, string, string];
    /** 270-360f: black-on-accent end card. */
    brand: string;
  };
  colors: {
    background: string;
    /** Hook word and stack lines 1 and 3. */
    text: string;
    /** Reveal word, stack line 2 and the circular wipe background. */
    accent: string;
    /** End-card text, drawn on top of the accent wipe. */
    brandText: string;
    /** Final 6-frame flash. */
    flash: string;
  };
  effects: {
    /** 0 disables the grain overlay. ~0.14 is subtle, ~0.3 is gritty (and ~3x the file size at CRF 18). */
    grainOpacity: number;
    /** Seeds the camera shake and the letter explosion so they are repeatable. */
    seed: number;
  };
  sound: {
    enabled: boolean;
    /** Master volume 0-1, multiplied into every cue in src/sfx.ts. */
    volume: number;
  };
};

export const defaultProps: KineticPromoProps = {
  copy: {
    hook: "STOP",
    reveal: "SCROLLING",
    lines: ["THIS IS", "WHAT MOTION", "LOOKS LIKE"],
    brand: "YOUR BRAND",
  },
  colors: {
    background: "#000000",
    text: "#FFFFFF",
    accent: "#C6FF00",
    brandText: "#000000",
    flash: "#FFFFFF",
  },
  effects: {
    grainOpacity: 0.14,
    seed: 7,
  },
  sound: {
    enabled: true,
    volume: 0.7,
  },
};
