import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CLAMP } from "./motion";
import { T } from "./timeline";

/**
 * 6-frame white flash on the last frames (354-359): pops in at 40%, hits full
 * white by the third frame and stays there, so the cut lands on pure white.
 */
export const Flash: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();

  if (frame < T.flash) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: interpolate(frame, [T.flash, T.flash + 3], [0.4, 1], CLAMP),
      }}
    />
  );
};
