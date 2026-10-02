import { spring } from "remotion";
import { FPS } from "../timeline";

/** The slam: scale 3 -> 1 on a bouncy spring (it overshoots below 1, then settles). */
export const SLAM_SPRING = { damping: 10, mass: 0.6 } as const;
const SLAM_FROM_SCALE = 3;

export const slamScale = (frame: number, fps: number) =>
  spring({ frame, fps, from: SLAM_FROM_SCALE, to: 1, config: SLAM_SPRING });

/**
 * The frame on which the word first reaches scale 1, i.e. the moment of impact.
 * The camera shake and the impact sound are both keyed to it. spring() is a pure
 * function of the frame, so it can be evaluated up-front.
 */
export const IMPACT_FRAME = (() => {
  for (let frame = 0; frame < 45; frame++) {
    if (slamScale(frame, FPS) <= 1) return frame;
  }
  return 7;
})();
