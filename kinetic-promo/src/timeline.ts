// Single source of truth for format + timing. All values are in frames @ 30fps.

export const FPS = 30;
export const DURATION_IN_FRAMES = 360; // 12s
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Text is fitted to this width so it keeps >= 80px side margins (Reels/Shorts safe area).
export const SAFE_X = 80;
export const FIT_WIDTH = WIDTH - SAFE_X * 2; // 920
// Lines that slowly push in while holding are fitted a bit narrower so the push-in stays inside the margins.
export const DRIFT_FIT_WIDTH = 900;

export const T = {
  /** Frame where the STOP spring first reaches scale 1 (the visual "impact"). */
  slamImpact: 7,
  /** STOP splits, SCROLLING is revealed. */
  split: 45,
  /** Three-line stack starts. */
  stack: 90,
  /** Words explode into letters. */
  explode: 180,
  /** Circular lime wipe + brand. */
  wipe: 270,
  /** Hold on the brand. */
  hold: 330,
  /** 6-frame white flash. */
  flash: 354,
  end: DURATION_IN_FRAMES,
} as const;

export const SHAKE = { amplitude: 6, durationInFrames: 10 } as const;
