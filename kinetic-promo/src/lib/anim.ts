import { interpolate, spring, type SpringConfig } from "remotion";
import { rand } from "./rng";

/**
 * All motion in this video is driven by exactly three things: useCurrentFrame(), interpolate() and
 * spring(). No CSS transitions or animations (they don't render deterministically).
 */

/** interpolate() that never runs past its end values (extrapolateRight: 'clamp' on every call). */
export const map = (
  frame: number,
  input: readonly number[],
  output: readonly number[],
): number =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const SPRING = {
  /** Spec: STOP slams in from scale 3 → 1. */
  slam: { damping: 10, mass: 0.6 },
  /** No bounce. Shutter close, fade-ups. */
  smooth: { damping: 200 },
  /** Slow start, fast middle: drives the split (squared in the scene). */
  split: { damping: 200, stiffness: 60 },
  /** Stacked lines whip in, ~8 frames to 90%. */
  snap: { damping: 22, stiffness: 160, mass: 0.8 },
  /** Little bounce for the reveal word. */
  pop: { damping: 12, stiffness: 140 },
  /** The lime flood. */
  iris: { damping: 200, stiffness: 70 },
} as const satisfies Record<string, Partial<SpringConfig>>;

/** spring() that is safe to call before its start frame (returns the start value). */
export const springAt = (
  frame: number,
  fps: number,
  start: number,
  config: Partial<SpringConfig>,
  extra: { from?: number; to?: number; durationInFrames?: number } = {},
): number => spring({ frame: Math.max(0, frame - start), fps, config, ...extra });

export const SLAM_FROM_SCALE = 3;

/** First frame on which the slam has reached scale 1: that's the impact, so that's when the camera shakes. */
export const findImpactFrame = (fps: number): number => {
  for (let f = 0; f < 90; f++) {
    const scale = spring({
      frame: f,
      fps,
      config: SPRING.slam,
      from: SLAM_FROM_SCALE,
      to: 1,
    });
    if (scale <= 1) return f;
  }
  return 0;
};

export const SHAKE_PX = 6;
export const SHAKE_FRAMES = 10;

/** Camera shake: random ±6px translate that decays to zero over 10 frames, starting at the impact. */
export const cameraShake = (
  frame: number,
  impactFrame: number,
): { x: number; y: number } => {
  const amp = map(
    frame,
    [impactFrame - 1, impactFrame, impactFrame + SHAKE_FRAMES],
    [0, SHAKE_PX, 0],
  );
  if (amp === 0) return { x: 0, y: 0 };
  // Whole pixels keep the text crisp while the camera is jolting.
  return {
    x: Math.round((rand(`shake:x:${frame}`) * 2 - 1) * amp),
    y: Math.round((rand(`shake:y:${frame}`) * 2 - 1) * amp),
  };
};
