import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { map, SLAM_FROM_SCALE, SPRING, springAt } from "../lib/anim";
import { placeLine, textStyle, type TypeLayout } from "../lib/typography";
import type { Colors } from "../props";
import { BEAT, CENTER_X, CENTER_Y, HEIGHT, SCENE } from "../timeline";

/** Each half must travel at least half the canvas height to clear the frame. */
const SPLIT_TRAVEL = CENTER_Y + 40;

/**
 * Beats 1 + 2.
 *   0–45  STOP slams in (scale 3 → 1, damping 10 / mass 0.6). The camera shake lives one level up.
 *  45–90  STOP splits through the middle of its caps: top half up, bottom half down, uncovering
 *         SCROLLING in the gap. The gap is a slot: SCROLLING only shows where the halves have
 *         parted, and the slot shuts again just before the first stacked line arrives.
 */
export const OpeningScenes: React.FC<{ layout: TypeLayout; colors: Colors }> = ({
  layout,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { stop, reveal } = layout;
  const splitFrom = SCENE.split.from;

  // ── STOP ────────────────────────────────────────────────────────────────────────────
  const stopBox = placeLine(stop, CENTER_Y);
  const stopText = (
    <div
      style={{
        ...textStyle(stop, colors.foreground),
        left: stopBox.left,
        top: stopBox.top,
        width: stop.width,
        height: stop.fontSize,
      }}
    >
      {stop.text}
    </div>
  );

  const slamScale = springAt(frame, fps, 0, SPRING.slam, {
    from: SLAM_FROM_SCALE,
    to: 1,
  });
  // Two frames of fade so frame 0 isn't a hard wall of giant white letters.
  const slamOpacity = map(frame, [0, 2], [0, 1]);

  // Squared spring: slow start (the gap opens visibly), then the halves whip away.
  const split = springAt(frame, fps, splitFrom, SPRING.split);
  const travel = SPLIT_TRAVEL * split * split;

  // ── SCROLLING ───────────────────────────────────────────────────────────────────────
  const revealBox = placeLine(reveal, CENTER_Y);
  const slotMax = Math.ceil(reveal.capHeight / 2) + 24;
  const slotClose = springAt(frame, fps, BEAT.revealCloseFrom, SPRING.smooth, {
    durationInFrames: BEAT.revealCloseFrames,
  });
  // Half-height of the visible slot around the cut line.
  const slot = Math.min(travel, slotMax) * (1 - slotClose);
  const pop = springAt(frame, fps, splitFrom, SPRING.pop, { from: 0.9, to: 1 });
  const push = map(frame, [splitFrom + 8, BEAT.revealCloseFrom], [1, 1.04]);

  return (
    <>
      {frame >= splitFrom && frame < SCENE.stack.from ? (
        <AbsoluteFill
          style={{
            clipPath: `inset(${CENTER_Y - slot}px 0 ${HEIGHT - CENTER_Y - slot}px 0)`,
          }}
        >
          <AbsoluteFill
            style={{
              scale: pop * push,
              transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
            }}
          >
            <div
              style={{
                ...textStyle(reveal, colors.accent),
                left: revealBox.left,
                top: revealBox.top,
                width: reveal.width,
                height: reveal.fontSize,
              }}
            >
              {reveal.text}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      {frame < splitFrom ? (
        <AbsoluteFill
          style={{
            scale: slamScale,
            opacity: slamOpacity,
            transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
          }}
        >
          {stopText}
        </AbsoluteFill>
      ) : travel < SPLIT_TRAVEL - 20 ? (
        <>
          {/* Top half: everything above the cut line, sliding up. */}
          <AbsoluteFill
            style={{
              clipPath: `inset(0 0 ${HEIGHT - CENTER_Y}px 0)`,
              translate: `0px ${-travel}px`,
            }}
          >
            {stopText}
          </AbsoluteFill>
          {/* Bottom half: everything below it, sliding down. */}
          <AbsoluteFill
            style={{
              clipPath: `inset(${CENTER_Y}px 0 0 0)`,
              translate: `0px ${travel}px`,
            }}
          >
            {stopText}
          </AbsoluteFill>
        </>
      ) : null}
    </>
  );
};
