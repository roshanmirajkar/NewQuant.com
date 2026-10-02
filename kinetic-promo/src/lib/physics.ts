import { makeRng } from "./rng.ts";

/**
 * Letter-explosion physics, stepped one frame at a time:
 *   every frame:  vy += GRAVITY   (acceleration → velocity)
 *                 y  += vy        (velocity → position)
 * Each letter gets its own seeded launch (delay, direction, speed, spin), so the blast is chaotic
 * but identical on every render. Dependency-free so scripts/check-physics.ts can run it in Node.
 */

/** px / frame², added to vertical velocity every frame. */
export const GRAVITY = 1.25;
/** Horizontal air drag, multiplied into vx every frame. */
export const DRAG_X = 0.992;

export type Launch = {
  /** Frames after the blast before this letter lets go: the shock wave reaches outer letters later. */
  delay: number;
  /** px / frame */
  vx: number;
  /** px / frame, negative = up */
  vy: number;
  /** degrees / frame */
  spin: number;
};

export type Offset = { x: number; y: number; rotation: number };

export const makeLaunch = (a: {
  seed: string;
  /** Letter centre on the canvas. */
  x: number;
  y: number;
  /** Blast centre. */
  cx: number;
  cy: number;
  /** Distance from the blast centre to the farthest letter (normalises the delay). */
  maxDist: number;
}): Launch => {
  const rng = makeRng(a.seed);
  const dx = a.x - a.cx;
  const dy = a.y - a.cy;
  const dist = Math.hypot(dx, dy);
  // Shock wave: letters farther from the centre let go a few frames later.
  const delay = Math.round((dist / a.maxDist) * 5 + rng() * 2);
  // Sideways: a gentle push away from the centre line plus a random drift. Kept small so the
  // letters fall through the frame instead of being flung sideways out of it.
  const vx = dx * 0.008 + (rng() - 0.5) * 6;
  // Upwards: every letter pops before it falls, and the higher it sits the harder it is thrown.
  const vy = -(8 + rng() * 16) + dy * 0.02;
  const spinDir = rng() < 0.5 ? -1 : 1;
  return { delay, vx, vy, spin: spinDir * (3 + rng() * 9) };
};

/** Offset from the letter's resting place `framesSinceBlast` frames after the blast. */
export const simulate = (launch: Launch, framesSinceBlast: number): Offset => {
  const n = Math.max(0, framesSinceBlast - launch.delay);
  let x = 0;
  let y = 0;
  let vx = launch.vx;
  let vy = launch.vy;
  let rotation = 0;
  for (let i = 0; i < n; i++) {
    vy += GRAVITY;
    vx *= DRAG_X;
    x += vx;
    y += vy;
    rotation += launch.spin;
  }
  return { x, y, rotation };
};

/**
 * Last frame (since the blast) at which the letter is still inside the canvas grown by `margin`.
 * After that it is gone for good: x only drifts one way and gravity only pulls down.
 */
export const lastVisibleFrame = (
  launch: Launch,
  home: { x: number; y: number },
  canvas: { width: number; height: number },
  margin: number,
  maxFrames = 400,
): number => {
  let last = 0;
  for (let f = 0; f <= maxFrames; f++) {
    const o = simulate(launch, f);
    const x = home.x + o.x;
    const y = home.y + o.y;
    const inside =
      x > -margin &&
      x < canvas.width + margin &&
      y > -margin &&
      y < canvas.height + margin;
    if (inside) last = f;
  }
  return last;
};
