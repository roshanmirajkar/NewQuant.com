import type { ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { slamScale } from "../lib/slam";
import { CapText } from "../lib/typography";
import type { Colors } from "../props";
import { HEIGHT, SCENES, WIDTH } from "../timeline";

/** Frames the two halves take to clear the frame. */
const SPLIT_FRAMES = 16;
/**
 * Travel per half. Larger than HEIGHT / 2 so that each half is completely off
 * screen while it is still accelerating (nothing lingers at the frame edge).
 */
const SPLIT_TRAVEL = HEIGHT * 0.6;
/** SCROLLING zooms and fades out over the last frames of the scene. */
const SCROLLING_EXIT_FRAMES = 6;
/** spring() with a fixed duration reaches 0.995 at its last frame. */
const SETTLED = 0.995;

/**
 * One half of the split word. Each half is an opaque, full-width panel that
 * clips its own half of the word; sliding the panels apart uncovers whatever
 * sits behind them. The child is laid out in full-frame coordinates, so both
 * halves line up into the whole word at rest.
 */
const Half: React.FC<{
  half: "top" | "bottom";
  travel: number;
  background: string;
  children: ReactNode;
}> = ({ half, travel, background, children }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: half === "top" ? 0 : HEIGHT / 2,
      width: WIDTH,
      height: HEIGHT / 2,
      overflow: "hidden",
      background,
      translate: `0 ${half === "top" ? -travel : travel}px`,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: half === "top" ? 0 : -HEIGHT / 2,
        width: WIDTH,
        height: HEIGHT,
      }}
    >
      {children}
    </div>
  </div>
);

export const StopSplit: React.FC<{
  stop: string;
  scrolling: string;
  stopFontSize: number;
  scrollingFontSize: number;
  colors: Colors;
}> = ({ stop, scrolling, stopFontSize, scrollingFontSize, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const splitStart = SCENES.split.from;

  // Scene 1: slam from scale 3 -> 1 (spring overshoots, then settles).
  // Fully opaque from the very first frame, so the video opens on the hit.
  const slam = slamScale(frame, fps);

  // Scene 2: the halves fall apart with constant acceleration (t squared).
  const t = interpolate(frame, [splitStart, splitStart + SPLIT_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const travel = t * t * SPLIT_TRAVEL;

  // SCROLLING lands 12% oversized and settles; it zooms out before the cut.
  const settle = spring({
    frame: Math.max(0, frame - splitStart - 2),
    fps,
    durationInFrames: 14,
    config: { damping: 200 },
  });
  const exit = interpolate(
    frame,
    [SCENES.split.to - SCROLLING_EXIT_FRAMES, SCENES.split.to],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // The exit grows by 12% at most: 880 px of SCROLLING stays inside the 1080 px frame.
  const scrollingScale =
    interpolate(settle, [0, SETTLED], [1.12, 1], { extrapolateRight: "clamp" }) *
    (1 + 0.12 * exit);

  const word = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        scale: String(slam),
      }}
    >
      <CapText fontSize={stopFontSize} color={colors.text}>
        {stop}
      </CapText>
    </div>
  );

  return (
    <>
      {/* Behind the halves; not mounted until the split starts so that no
          sliver can leak through the seam while the camera shakes. */}
      {frame >= splitStart && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: String(scrollingScale),
            opacity: 1 - exit,
          }}
        >
          <CapText fontSize={scrollingFontSize} color={colors.accent}>
            {scrolling}
          </CapText>
        </div>
      )}
      <Half half="top" travel={travel} background={colors.background}>
        {word}
      </Half>
      <Half half="bottom" travel={travel} background={colors.background}>
        {word}
      </Half>
    </>
  );
};
