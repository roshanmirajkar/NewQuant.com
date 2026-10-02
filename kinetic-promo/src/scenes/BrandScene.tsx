import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { centered, displayText } from "../text";
import { HEIGHT, T, WIDTH } from "../timing";
import type { SceneProps } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Farthest canvas corner from the centre, plus a little slack, so the circle fully covers the frame. */
const FULL_RADIUS = Math.ceil(Math.hypot(WIDTH / 2, HEIGHT / 2)) + 8;

/**
 * Frames 270-360.
 *   270-296 Accent-coloured circle expands from the centre (clip-path: circle()).
 *   288-306 Brand text fades up with a 20px y offset.
 *   306-354 Hold, with a barely-there push-in.
 * The white flash is layered on top by <KineticPromo />.
 */
export const BrandScene: React.FC<SceneProps> = ({ copy, colors, layout }) => {
  const frame = useCurrentFrame();
  if (frame < T.wipeStart) return null;

  const radius = interpolate(frame, [T.wipeStart, T.wipeStart + T.wipeFrames], [0, FULL_RADIUS], {
    ...clamp,
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  const fadeEase = { ...clamp, easing: Easing.out(Easing.cubic) };
  const opacity = interpolate(frame, [T.brandIn, T.brandIn + T.brandFadeFrames], [0, 1], fadeEase);
  const lift = interpolate(frame, [T.brandIn, T.brandIn + T.brandFadeFrames], [20, 0], fadeEase);
  const creep = interpolate(frame, [T.brandIn, T.end], [1, 1.04], clamp);

  return (
    <AbsoluteFill style={{ background: colors.accent, clipPath: `circle(${radius}px at 50% 50%)` }}>
      <AbsoluteFill style={centered}>
        <div style={{ translate: `0px ${lift}px`, opacity }}>
          <div style={{ ...displayText, fontSize: layout.brandSize, color: colors.brandText, scale: creep }}>
            {copy.brand}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
