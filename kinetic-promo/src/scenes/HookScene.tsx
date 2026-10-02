import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CapText } from "../components/CapText";
import { ramp, settle } from "../lib/motion";
import { HEIGHT, SLAM_SPRING, T } from "../timeline";

const SPLIT_SPRING = { damping: 30, stiffness: 160, mass: 0.8 } as const;
/** Far enough that each half is fully off-screen (needs > HEIGHT / 2). */
const SPLIT_TRAVEL_PX = 1100;
/** SCROLLING wipes out over these frames, just before the stack cuts in. */
const REVEAL_EXIT_FRAMES = 6;

const centered: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * 0-90f. STOP slams in (scale 3 -> 1), then tears open along its horizontal
 * centre line; the lime SCROLLING is only visible through the widening gap.
 * Runs on global frames (the Sequence starts at 0).
 */
export const HookScene: React.FC<{
  hook: string;
  reveal: string;
  hookSize: number;
  revealSize: number;
  hookColor: string;
  revealColor: string;
}> = ({ hook, reveal, hookSize, revealSize, hookColor, revealColor }) => {
  const frame = useCurrentFrame();

  // The slam spring overshoots rest (peaks ~1.07). The raw value is mapped to
  // scale instead of going through a clamped interpolate(), which would clip
  // that overshoot and delete the rebound the damping:10 config is there for.
  const slam = settle(frame - T.slam, SLAM_SPRING);
  const scale = 3 - 2 * slam;

  const open = settle(frame - T.split, SPLIT_SPRING);
  const travel = open * SPLIT_TRAVEL_PX;
  const gap = Math.min(travel, HEIGHT / 2);

  // Wipe SCROLLING away left-to-right as the first stacked line enters from the left.
  const exit = ramp(frame, [T.stack - REVEAL_EXIT_FRAMES, T.stack], [0, 100]);
  const revealScale =
    1 + 0.12 * (1 - open) + ramp(frame, [T.split + 10, T.stack], [0, 0.04]);

  const stop = (
    <div style={{ scale }}>
      <CapText text={hook} fontSize={hookSize} color={hookColor} />
    </div>
  );

  if (frame < T.split) {
    return <AbsoluteFill style={centered}>{stop}</AbsoluteFill>;
  }

  return (
    <AbsoluteFill>
      {/* SCROLLING: clipped to the band between the two halves. */}
      <AbsoluteFill
        style={{
          ...centered,
          clipPath: `inset(${HEIGHT / 2 - gap}px 0 ${HEIGHT / 2 - gap}px ${exit}%)`,
        }}
      >
        <div style={{ scale: revealScale }}>
          <CapText text={reveal} fontSize={revealSize} color={revealColor} />
        </div>
      </AbsoluteFill>

      {/* Top half of STOP slides up. */}
      <AbsoluteFill
        style={{
          ...centered,
          clipPath: "inset(0 0 50% 0)",
          translate: `0 ${-travel}px`,
        }}
      >
        {stop}
      </AbsoluteFill>

      {/* Bottom half slides down. */}
      <AbsoluteFill
        style={{
          ...centered,
          clipPath: "inset(50% 0 0 0)",
          translate: `0 ${travel}px`,
        }}
      >
        {stop}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
