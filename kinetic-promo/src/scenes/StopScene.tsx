import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { centered, displayText } from "../text";
import { T } from "../timing";
import type { SceneProps } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Distance each half travels. Anything past ~1000px is fully off a 1920px canvas. */
const SPLIT_DISTANCE = 1150;

/**
 * Frames 0-90.
 *   0-45  "STOP" slams in from scale 3 -> 1 on spring({damping: 10, mass: 0.6}).
 *   45-90 It splits along its horizontal centre line: top half up, bottom half down, and the
 *         accent-coloured reveal word appears in the opening gap, then the gap closes again.
 */
export const StopScene: React.FC<SceneProps> = ({ copy, colors, layout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame >= T.linesStart) return null;

  // ---- slam -------------------------------------------------------------------------------
  const slam = spring({ frame, fps, config: { damping: 10, mass: 0.6 } });
  // Input range runs past 1 on purpose: the spring overshoots to ~1.07, and this keeps the
  // 3 -> 1 line going (scale ~0.86) so the word squashes in before settling, not clamped flat.
  const slamScale = interpolate(slam, [0, 1.2], [3, 0.6], { extrapolateRight: "clamp" });
  const slamOpacity = interpolate(frame, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  // Slow push-in while it holds, so the beat before the split is not dead still.
  const creep = interpolate(frame, [T.slamImpact + 10, T.splitStart], [1, 1.04], clamp);

  // ---- split ------------------------------------------------------------------------------
  const split = interpolate(frame, [T.splitStart, T.splitStart + T.splitFrames], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const offset = split * SPLIT_DISTANCE;
  const splitting = frame >= T.splitStart;

  const capHalf = (layout.capRatio * layout.revealSize) / 2;
  // Half-height of the visible band of the reveal word: opens with the gap, closes at the end.
  const closeExtent = interpolate(frame, [T.revealCloseStart, T.linesStart], [capHalf * 1.15, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const bandHalf = Math.min(offset, closeExtent);
  const revealScale =
    interpolate(frame, [T.splitStart, T.splitStart + 20], [0.9, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) *
    interpolate(frame, [T.splitStart + 20, T.linesStart], [1, 1.04], clamp);

  // A thin accent "laser" along the cut, firing as the split starts.
  const cutWidth = interpolate(frame, [T.splitStart, T.splitStart + 3], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const cutOpacity = interpolate(frame, [T.splitStart + 3, T.splitStart + 8], [1, 0], clamp);

  const hookStyle = {
    ...displayText,
    fontSize: layout.hookSize,
    color: colors.text,
  };

  return (
    <>
      {splitting ? (
        <>
          {/* Behind everything, and gone within 8 frames, so it never reads as a strike-through. */}
          <AbsoluteFill style={centered}>
            <div
              style={{
                width: "100%",
                height: 6,
                background: colors.accent,
                opacity: cutOpacity,
                scale: `${cutWidth} 1`,
              }}
            />
          </AbsoluteFill>

          <AbsoluteFill style={centered}>
            <div
              style={{
                clipPath: `inset(calc(50% - ${bandHalf}px) -4% calc(50% - ${bandHalf}px) -4%)`,
              }}
            >
              <div style={{ ...displayText, fontSize: layout.revealSize, color: colors.accent, scale: revealScale }}>
                {copy.reveal}
              </div>
            </div>
          </AbsoluteFill>

          {/* The wrappers are unscaled so "50%" is exactly the cap-height centre; negative
              insets on the other sides keep round-letter overshoot from being clipped. */}
          <AbsoluteFill style={centered}>
            <div style={{ translate: `0px ${-offset}px`, clipPath: "inset(-8% -8% 50% -8%)" }}>
              <div style={{ ...hookStyle, scale: creep }}>{copy.hook}</div>
            </div>
          </AbsoluteFill>
          <AbsoluteFill style={centered}>
            <div style={{ translate: `0px ${offset}px`, clipPath: "inset(50% -8% -8% -8%)" }}>
              <div style={{ ...hookStyle, scale: creep }}>{copy.hook}</div>
            </div>
          </AbsoluteFill>

        </>
      ) : (
        <AbsoluteFill style={centered}>
          <div style={{ ...hookStyle, scale: slamScale * creep, opacity: slamOpacity }}>{copy.hook}</div>
        </AbsoluteFill>
      )}
    </>
  );
};
