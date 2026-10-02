import { random } from "remotion";
import { WIDTH } from "../timeline";

/**
 * Tuned against the real layout (see the explosion timing in the README): the
 * burst fills the 90-frame scene and the last letter leaves the frame on frame
 * ~268, just before the lime wipe at 270.
 */
/** Downward acceleration in px per frame^2 (about 1,000 px/s^2 at 30 fps). */
export const GRAVITY = 1.1;
/** Upward launch speed range, px per frame. */
const KICK_MIN = 14;
const KICK_RANGE = 18;
/** Sideways push away from the centre of the frame (far-left/right letters), px per frame. */
const PUSH_OUT = 7;
/** Random sideways variation, px per frame (total range). */
const SIDE_JITTER = 6;
/** Letters detonate over this many frames instead of all at once. */
const MAX_FUSE = 6;

export type LetterState = { x: number; y: number; rotate: number };

/** Per-letter detonation delay in whole frames, seeded so renders are repeatable. */
export const letterFuse = (seed: string) =>
  Math.floor(random(`${seed}-fuse`) * MAX_FUSE);

/**
 * Simulates one letter `frames` frames after it detonates.
 *
 * Every letter gets a seeded-random launch velocity (pushed away from the
 * centre of the frame, always with an upward kick) and a seeded-random spin.
 * Each frame: velocity += acceleration, then position += velocity, which is
 * the same integration the closed form y = v0*t + g*t*(t+1)/2 gives.
 */
export const simulateLetter = (
  seed: string,
  centerX: number,
  frames: number,
): LetterState => {
  const rand = (key: string) => random(`${seed}-${key}`);

  // -1 (far left) .. +1 (far right): outward push grows with distance from centre.
  const outward = centerX / (WIDTH / 2);
  const vx = outward * PUSH_OUT + (rand("vx") - 0.5) * SIDE_JITTER;
  let vy = -(KICK_MIN + rand("vy") * KICK_RANGE);
  const spin = (rand("dir") < 0.5 ? -1 : 1) * (5 + rand("spin") * 11); // deg / frame

  let x = 0;
  let y = 0;
  let rotate = 0;
  for (let i = 0; i < frames; i++) {
    vy += GRAVITY;
    x += vx;
    y += vy;
    rotate += spin;
  }
  return { x, y, rotate };
};
