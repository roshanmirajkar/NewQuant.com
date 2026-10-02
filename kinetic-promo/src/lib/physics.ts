import { rand, randSigned } from "./motion";

/** Downward acceleration, px per frame per frame. */
export const GRAVITY = 1.2;

export type LetterMotion = { x: number; y: number; rotate: number };

const AT_REST: LetterMotion = { x: 0, y: 0, rotate: 0 };

/**
 * Offset of one letter `framesSinceExplode` frames after the explosion.
 *
 * Every letter is seeded: the seed fixes its start delay, launch velocity and
 * spin, so the result is identical on every render and every frame order.
 * Position is integrated frame by frame (velocity += gravity; position +=
 * velocity), not solved in closed form.
 *
 * @param seed            unique per letter (line, index)
 * @param spread          -1 (left end of its line) .. 1 (right end); fans the burst outwards
 * @param framesSinceExplode  frames since the explosion cue
 */
export const letterMotion = (
  seed: number,
  spread: number,
  framesSinceExplode: number,
): LetterMotion => {
  const delay = Math.floor(rand(seed + 1) * 7); // 0..6 frames
  const steps = framesSinceExplode - delay;
  if (steps <= 0) {
    return AT_REST;
  }

  let vx = spread * 14 + randSigned(seed + 2) * 8; // px / frame
  let vy = -(10 + rand(seed + 3) * 22); // initial pop upwards
  const spin = (4 + rand(seed + 4) * 10) * (rand(seed + 5) < 0.5 ? -1 : 1); // deg / frame

  let x = 0;
  let y = 0;
  let rotate = 0;
  for (let i = 0; i < steps; i++) {
    vy += GRAVITY;
    x += vx;
    y += vy;
    rotate += spin;
    vx *= 0.99; // a touch of air drag so the fan doesn't run away sideways
  }
  return { x, y, rotate };
};
