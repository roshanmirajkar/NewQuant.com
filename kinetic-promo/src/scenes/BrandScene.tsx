import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CapText } from "../components/CapText";
import { ramp, settle } from "../lib/motion";
import { HEIGHT, T, WIDTH } from "../timeline";

const WIPE_SPRING = { damping: 24, stiffness: 90, mass: 0.9 } as const;
const FADE_SPRING = { damping: 24, stiffness: 120, mass: 0.8 } as const;
/** Circle radius that clears the frame corners, with a little to spare. */
const WIPE_MAX_RADIUS = Math.ceil(Math.hypot(WIDTH / 2, HEIGHT / 2)) + 50;
/** Local frame the sign-off starts rising, once the circle is well underway. */
const TEXT_IN = 12;
const RISE_PX = 20;

/**
 * 270-360f (local 0-90). A circle of the wipe colour grows from the centre
 * until it covers the frame; the sign-off fades up 20px as it does, then holds
 * with a slow push-in. The 6-frame flash lives in the root, above everything.
 */
export const BrandScene: React.FC<{
  brand: string;
  brandSize: number;
  wipeColor: string;
  brandColor: string;
}> = ({ brand, brandSize, wipeColor, brandColor }) => {
  const frame = useCurrentFrame();

  const radius = settle(frame, WIPE_SPRING) * WIPE_MAX_RADIUS;

  const opacity = ramp(frame, [TEXT_IN, TEXT_IN + 10], [0, 1]);
  const rise = (1 - settle(frame - TEXT_IN, FADE_SPRING)) * RISE_PX;
  const push = ramp(frame, [TEXT_IN, T.flash - T.wipe], [1, 1.02]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: wipeColor,
        clipPath: `circle(${radius}px at 50% 50%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ opacity, translate: `0 ${rise}px`, scale: push }}>
        <CapText text={brand} fontSize={brandSize} color={brandColor} />
      </div>
    </AbsoluteFill>
  );
};
