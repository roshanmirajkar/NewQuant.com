import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CapText } from "../lib/typography";
import type { Colors } from "../props";
import { HEIGHT, WIDTH } from "../timeline";

/** Frames the circle takes to settle (it covers the whole frame well before). */
const WIPE_FRAMES = 36;
/** The brand fades up this many frames after the wipe starts. */
const TEXT_DELAY = 6;
const TEXT_FRAMES = 18;
const TEXT_RISE_PX = 20;
/** Radius to the farthest corner, plus headroom so the corners are covered mid-spring. */
const MAX_RADIUS = Math.hypot(WIDTH / 2, HEIGHT / 2) * 1.2;
/** spring() with a fixed duration reaches 0.995 at its last frame. */
const SETTLED = 0.995;

/**
 * Scene 5 (and the hold of scene 6): the accent colour wipes in as a circular
 * clip-path expanding from the centre, then the brand fades up with a 20 px rise.
 */
export const LimeWipe: React.FC<{
  brand: string;
  brandFontSize: number;
  colors: Colors;
}> = ({ brand, brandFontSize, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wipe = spring({
    frame,
    fps,
    durationInFrames: WIPE_FRAMES,
    config: { damping: 200 },
  });
  const radius = interpolate(wipe, [0, SETTLED], [0, MAX_RADIUS], {
    extrapolateRight: "clamp",
  });

  const text = spring({
    frame: Math.max(0, frame - TEXT_DELAY),
    fps,
    durationInFrames: TEXT_FRAMES,
    config: { damping: 200 },
  });
  const opacity = interpolate(text, [0, SETTLED], [0, 1], {
    extrapolateRight: "clamp",
  });
  const rise = interpolate(text, [0, SETTLED], [TEXT_RISE_PX, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: colors.accent,
          clipPath: `circle(${radius}px at 50% 50%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          translate: `0 ${rise}px`,
        }}
      >
        <CapText fontSize={brandFontSize} color={colors.onAccent}>
          {brand}
        </CapText>
      </div>
    </>
  );
};
