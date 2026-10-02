/**
 * Canvas + storyboard constants. Frame numbers are absolute: 30 fps x 360 f = 12 s.
 * Change a scene boundary here and every scene, cue and overlay follows.
 */
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const DURATION_IN_FRAMES = 360;

export const SCENES = {
  /** STOP slams in from scale 3 -> 1 (with a camera shake on impact). */
  slam: { from: 0, to: 45 },
  /** STOP splits, top half up / bottom half down, revealing SCROLLING. */
  split: { from: 45, to: 90 },
  /** Lines slide in from alternating sides with a mask reveal. */
  lines: { from: 90, to: 180 },
  /** Lines explode into letters that tumble off-screen under gravity. */
  explode: { from: 180, to: 270 },
  /** Circular lime wipe from the centre, brand fades up. */
  wipe: { from: 270, to: 330 },
  /** Hold, then a white flash to cut. */
  hold: { from: 330, to: 360 },
} as const;

/** Length of the closing white flash, in frames. */
export const FLASH_FRAMES = 6;

/** Scene 3: each line starts this many frames after the previous one. */
export const LINE_STAGGER = 8;

/** Safe area for key text on a 1080 x 1920 canvas (Reels / Shorts / LinkedIn). */
export const SAFE_X = 90;
export const SAFE_Y = 110;
export const MAX_TEXT_WIDTH = WIDTH - 2 * SAFE_X;
