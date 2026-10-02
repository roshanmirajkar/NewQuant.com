import { interpolate, spring } from "remotion";
import { FPS } from "../timeline";

/** interpolate() that never extrapolates, on either side. */
export const ramp = (
  frame: number,
  input: readonly number[],
  output: readonly number[],
): number =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** spring() at the project fps. `frame` is relative to when the motion starts. */
export const settle = (
  frame: number,
  config: { damping?: number; stiffness?: number; mass?: number },
): number => spring({ frame, fps: FPS, config });

/**
 * Deterministic pseudo-random number in [0, 1) for an integer seed
 * (mulberry32 mixing step). Same seed, same value, on every render.
 */
export const rand = (seed: number): number => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** rand() remapped to [-1, 1). */
export const randSigned = (seed: number): number => rand(seed) * 2 - 1;
