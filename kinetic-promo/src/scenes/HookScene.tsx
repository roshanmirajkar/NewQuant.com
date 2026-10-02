import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, ease } from "../motion";
import type { KineticPromoProps } from "../props";
import { HEIGHT, T } from "../timeline";
import { Word, type FittedSizes } from "../typography";

type Props = {
  copy: KineticPromoProps["copy"];
  colors: KineticPromoProps["colors"];
  sizes: FittedSizes;
};

const CENTER: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
};

// Slack on the em-based clip so round letters' overshoot (S, O) is never cut.
const PAD = "0.25em";

/**
 * 0-45f  STOP slams in (scale 3 -> 1, spring).
 * 45-90f STOP splits in two; the halves slide up/down off-screen, revealing SCROLLING.
 * 82-90f SCROLLING wipes out so the stack can start on a clean frame.
 * (Camera shake is applied by the parent, see KineticPromo.)
 */
export const HookScene: React.FC<Props> = ({ copy, colors, sizes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Slam -----------------------------------------------------------------
  const slam = spring({ frame, fps, config: { damping: 10, mass: 0.6 } });
  // Spring overshoots ~7% past 1. The input range runs to 1.25 (still clamped)
  // so that rebound survives; slam === 1 maps to exactly scale 1.
  const scale = interpolate(slam, [0, 1.25], [3, 0.5], CLAMP);

  // --- Split ----------------------------------------------------------------
  const split = ease(frame, fps, T.split, 24);
  // Half-height of the frame (+ slack) so both halves fully clear the screen.
  const travel = interpolate(split, [0, 1], [0, HEIGHT / 2 + 60], CLAMP);

  const hookWord = (style: React.CSSProperties) => (
    <Word
      text={copy.hook}
      fontSize={sizes.hook}
      color={colors.text}
      style={{ scale, ...style }}
    />
  );

  // --- SCROLLING exit mask (inset 0% -> 100% from the left) ------------------
  const exit = interpolate(frame, [T.stack - 8, T.stack], [0, 100], CLAMP);

  return (
    <AbsoluteFill style={CENTER}>
      {frame >= T.split && (
        // Only the slit between the two halves is visible: the clip opens
        // from the center line at exactly the speed the halves move.
        <AbsoluteFill
          style={{
            ...CENTER,
            clipPath: `inset(${Math.max(0, HEIGHT / 2 - travel)}px 0)`,
          }}
        >
          <Word
            text={copy.reveal}
            fontSize={sizes.reveal}
            color={colors.accent}
            style={{
              clipPath: `inset(-${PAD} 0 -${PAD} ${exit}%)`,
            }}
          />
        </AbsoluteFill>
      )}

      {travel === 0 ? (
        hookWord({})
      ) : (
        <>
          <AbsoluteFill style={CENTER}>
            {hookWord({
              translate: `0 ${-travel}px`,
              clipPath: `inset(-${PAD} -${PAD} 50% -${PAD})`,
            })}
          </AbsoluteFill>
          <AbsoluteFill style={CENTER}>
            {hookWord({
              translate: `0 ${travel}px`,
              clipPath: `inset(50% -${PAD} -${PAD} -${PAD})`,
            })}
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};
