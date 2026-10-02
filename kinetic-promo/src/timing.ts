export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_IN_FRAMES = 360;

/** Every frame number in the storyboard. All scenes read from here. */
export const T = {
  // 0-45: STOP slams in
  /** First frame where spring({damping: 10, mass: 0.6}) reaches 1 (scale 3 -> 1). Verified numerically. */
  slamImpact: 7,
  shakeFrames: 10,
  shakeAmplitude: 6,

  // 45-90: STOP splits, SCROLLING revealed
  splitStart: 45,
  splitFrames: 22,
  /** SCROLLING's reveal band closes again over the last 10 frames of the scene. */
  revealCloseStart: 80,

  // 90-180: three lines stack in
  linesStart: 90,
  lineStagger: 8,
  wordStagger: 3,
  maskFrames: 12,

  // 180-270: letters explode and fall
  explodeStart: 180,

  // 270-330: lime circular wipe, brand fades up
  wipeStart: 270,
  wipeFrames: 26,
  brandIn: 288,
  brandFadeFrames: 18,

  // 330-360: hold, then 6-frame white flash
  holdStart: 330,
  flashFrames: 6,
  end: 360,
} as const;

/** Flash occupies the last 6 frames: 354..359. */
export const FLASH_START = T.end - T.flashFrames;
