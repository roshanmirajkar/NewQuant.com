/**
 * Everything you need to reskin the video lives in this one typed object.
 *
 * Pass overrides at render time, e.g.
 *   npx remotion render src/index.ts KineticPromo out/brand.mp4 \
 *     --props='{"copy":{"brand":"ACME"},"colors":{"accent":"#FF2E93"}}'
 * or edit `defaultProps` below. (`type`, not `interface`: Remotion needs props to be a plain record.)
 */

export type Copy = {
  /** Beat 1 – slams in, then splits. */
  stop: string;
  /** Beat 2 – revealed behind the split, set in `colors.accent`. */
  reveal: string;
  /** Beat 3 – three stacked lines. They explode into letters in beat 4. */
  lines: readonly [string, string, string];
  /** Beat 5 – end card, black on the accent colour. */
  brand: string;
};

export type Colors = {
  /** Canvas colour for beats 1–4. */
  background: string;
  /** STOP (and the default colour for stacked lines). */
  foreground: string;
  /** Electric lime: the reveal word, and the iris wipe that floods the frame. */
  accent: string;
  /** Text colour on top of the accent flood (end card). */
  ink: string;
  /** The 6-frame cut flash. */
  flash: string;
  /** Fox-mark fill on the end card. */
  mark: string;
  /** Colour of each stacked line (and of the letters it explodes into). */
  lines: readonly [string, string, string];
};

export type KineticPromoProps = {
  copy: Copy;
  colors: Colors;
  /**
   * Film-grain overlay. `opacity` 0 (off) – 1; `size` is the grain's rough size in pixels (1 = fine
   * and sharp, 2–3 = coarser).
   * `loop`: the feTurbulence seed changes every frame, cycling through this many different noise
   * fields (0 = a brand-new one every frame). Random noise is the one thing h264 cannot compress,
   * so a short loop is what keeps the mp4 a sensible size at --crf 18: the encoder can reuse an
   * earlier frame's noise as a reference.
   */
  grain: { opacity: number; size: number; loop: number };
  audio: {
    /** Master switch for every sound-effect slot (see src/sfx.ts). */
    enabled: boolean;
    /** Master gain, 0 – 1. */
    volume: number;
  };
};

export const defaultProps: KineticPromoProps = {
  copy: {
    stop: "STOP",
    reveal: "SCROLLING",
    lines: ["THIS IS", "WHAT MOTION", "LOOKS LIKE"],
    brand: "YOUR BRAND",
  },
  colors: {
    background: "#000000",
    foreground: "#FFFFFF",
    accent: "#C6FF00",
    ink: "#000000",
    flash: "#FFFFFF",
    mark: "#FF4A1C",
    lines: ["#FFFFFF", "#C6FF00", "#FFFFFF"],
  },
  grain: { opacity: 0.06, size: 2.5, loop: 3 },
  audio: {
    enabled: true,
    volume: 0.8,
  },
};
