import { AbsoluteFill, useCurrentFrame } from "remotion";
import { map } from "../lib/anim";
import { FLASH_FROM } from "../timeline";

/**
 * The 6-frame white flash that cuts to whatever comes next: hits ~55% on its first frame, is solid
 * white by the third, and stays white through the final frame so the cut lands on a clean frame.
 */
export const Flash: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  if (frame < FLASH_FROM) return null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: map(frame, [FLASH_FROM, FLASH_FROM + 2], [0.55, 1]),
      }}
    />
  );
};
