import { interpolate, random } from "remotion";
import { IMPACT_FRAME } from "./slam";

const SHAKE_PX = 6;
const SHAKE_FRAMES = 10;

/**
 * Camera shake on the slam's impact: a random offset within +/-6 px whose
 * amplitude decays linearly to zero over 10 frames. random() is seeded by the
 * frame number, so every render (and every parallel render tab) shakes the same.
 * Offsets are whole pixels so hard edges (the split seam) stay crisp.
 */
export const cameraShake = (frame: number) => {
  const t = frame - IMPACT_FRAME;
  if (t < 0 || t >= SHAKE_FRAMES) return { x: 0, y: 0 };

  const amplitude = interpolate(t, [0, SHAKE_FRAMES], [SHAKE_PX, 0], {
    extrapolateRight: "clamp",
  });
  const jitter = (axis: string) =>
    Math.round((random(`shake-${axis}-${frame}`) * 2 - 1) * amplitude);

  return { x: jitter("x"), y: jitter("y") };
};
