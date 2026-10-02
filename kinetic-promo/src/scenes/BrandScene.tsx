import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, ease } from "../motion";
import type { KineticPromoProps } from "../props";
import { HEIGHT, WIDTH } from "../timeline";
import { Word, type FittedSizes } from "../typography";

type Props = {
  copy: KineticPromoProps["copy"];
  colors: KineticPromoProps["colors"];
  sizes: FittedSizes;
};

const WIPE_FRAMES = 24;
const TEXT_DELAY = 12; // text starts rising once the wipe is mostly open
const TEXT_FRAMES = 18;
const TEXT_RISE = 20; // px
const DRIFT = 1.025;
// Radius that covers the corners from the center.
const MAX_RADIUS = Math.hypot(WIDTH / 2, HEIGHT / 2) + 4;

/**
 * 270-330f The background wipes to the accent color with a circle expanding
 *          from the center; the brand fades up (20px) in black.
 * 330-354f Hold (the flash is a separate top-level layer).
 */
export const BrandScene: React.FC<Props> = ({ copy, colors, sizes }) => {
  const frame = useCurrentFrame(); // 0 == global frame 270
  const { fps } = useVideoConfig();

  const wipe = ease(frame, fps, 0, WIPE_FRAMES);
  const radius = interpolate(wipe, [0, 1], [0, MAX_RADIUS], CLAMP);

  const rise = ease(frame, fps, TEXT_DELAY, TEXT_FRAMES);
  const drift = interpolate(frame, [0, 90], [1, DRIFT], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.accent,
        justifyContent: "center",
        alignItems: "center",
        // Text lives inside the circle too, so it is revealed by it as well.
        clipPath: `circle(${radius}px at 50% 50%)`,
      }}
    >
      <Word
        text={copy.brand}
        fontSize={sizes.brand}
        color={colors.onAccent}
        style={{
          opacity: rise,
          translate: `0 ${interpolate(rise, [0, 1], [TEXT_RISE, 0], CLAMP)}px`,
          scale: drift,
        }}
      />
    </AbsoluteFill>
  );
};
