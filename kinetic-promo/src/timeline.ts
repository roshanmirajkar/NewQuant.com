import { spring } from "remotion";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 360;

/** Scene start frames (global). */
export const T = {
  /** STOP slams in. */
  slam: 0,
  /** STOP splits, SCROLLING is revealed. */
  split: 45,
  /** Three stacked lines slide in, 8 frames apart. */
  stack: 90,
  /** Lines explode into letters that fall off-screen. */
  explode: 180,
  /** Circular lime wipe + sign-off. */
  wipe: 270,
  /** Static hold on the sign-off. */
  hold: 330,
  /** 6-frame white flash: frames 354..359. */
  flash: 354,
} as const;

export const STACK_STAGGER = 8;

/** Spec'd slam spring. */
export const SLAM_SPRING = { damping: 10, mass: 0.6 } as const;

/**
 * Frame on which the slam spring first reaches rest scale (1.0), i.e. the
 * moment STOP actually hits. The camera shake is keyed to it, so it stays in
 * sync if the spring config above is changed.
 */
export const IMPACT_FRAME = (() => {
  for (let f = 1; f < FPS; f++) {
    if (spring({ frame: f, fps: FPS, config: SLAM_SPRING }) >= 1) {
      return f;
    }
  }
  return 10;
})();

export const SHAKE_FRAMES = 10;
export const SHAKE_AMPLITUDE_PX = 6;
