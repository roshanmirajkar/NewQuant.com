import { interpolate, random, spring } from "remotion";

/** Always clamp both ends so values never run away outside their keyframes. */
export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * Smooth, non-bouncing 0 -> 1 progress that starts at `start` and is at rest by
 * `start + duration`. A spring (not a CSS transition) so it is frame-deterministic.
 */
export const ease = (
  frame: number,
  fps: number,
  start: number,
  duration: number,
) =>
  spring({
    frame: Math.max(0, frame - start),
    fps,
    durationInFrames: duration,
    config: { damping: 200 },
  });

/**
 * Camera shake: random +/- `amplitude` px translate, decaying linearly to 0
 * over `duration` frames, seeded per frame so every render is identical.
 */
export const shake = (
  frame: number,
  start: number,
  amplitude: number,
  duration: number,
) => {
  const t = frame - start;
  if (t < 0 || t >= duration) {
    return { x: 0, y: 0 };
  }

  const decay = interpolate(t, [0, duration], [1, 0], CLAMP);
  return {
    x: (random(`shake-x-${frame}`) * 2 - 1) * amplitude * decay,
    y: (random(`shake-y-${frame}`) * 2 - 1) * amplitude * decay,
  };
};
