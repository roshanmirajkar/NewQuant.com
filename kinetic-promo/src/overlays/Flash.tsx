import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DURATION_IN_FRAMES, FLASH_FRAMES } from "../timeline";

/**
 * The closing flash: for the last FLASH_FRAMES frames a solid layer ramps from
 * clear to opaque, so the final frames are pure flash colour, ready to cut.
 * (Frames 354-359 -> 20%, 40%, 60%, 80%, 100%, 100%.)
 */
export const Flash: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const start = DURATION_IN_FRAMES - FLASH_FRAMES;

  const opacity = interpolate(frame, [start - 1, start + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;

  return <AbsoluteFill style={{ backgroundColor: color, opacity }} />;
};
