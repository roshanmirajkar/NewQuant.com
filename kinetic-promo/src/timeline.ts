/** 1080×1920 vertical (Reels / Shorts / LinkedIn), 30 fps, 12 s. */
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const DURATION_IN_FRAMES = 360;

export const CENTER_X = WIDTH / 2;
export const CENTER_Y = HEIGHT / 2;

/** Keep key text ≥ 80px from the sides (and well clear of the platform UI at the top/bottom). */
export const SAFE_X = 80;
export const SAFE_WIDTH = WIDTH - SAFE_X * 2;

/** Storyboard beats, in frames (from inclusive, to exclusive). */
export const SCENE = {
  slam: { from: 0, to: 45 },
  split: { from: 45, to: 90 },
  stack: { from: 90, to: 180 },
  explode: { from: 180, to: 270 },
  wipe: { from: 270, to: 330 },
  hold: { from: 330, to: 360 },
} as const;

/** Fine timing inside the beats. */
export const BEAT = {
  /** Stacked lines enter one at a time, this many frames apart. */
  lineStagger: 8,
  /** Words inside a line follow each other by this many frames. */
  wordStagger: 3,
  /** The reveal word's slot starts closing here (shutter), ready for line 1 at frame 90. */
  revealCloseFrom: 82,
  revealCloseFrames: 8,
  /** End-card text + mark start fading up here (the iris is already past the text by then). */
  brandFrom: 284,
} as const;

/** The last 6 frames are the white flash that cuts to the next shot. */
export const FLASH_FRAMES = 6;
export const FLASH_FROM = DURATION_IN_FRAMES - FLASH_FRAMES;
