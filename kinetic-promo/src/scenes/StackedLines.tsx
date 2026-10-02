import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../lib/layout";
import { letterFuse, simulateLetter } from "../lib/physics";
import { capTrimmedText } from "../lib/typography";
import type { Colors } from "../props";
import { HEIGHT, LINE_STAGGER, SCENES, WIDTH } from "../timeline";

/** Frames each slide / mask reveal takes. */
const REVEAL_FRAMES = 16;
/** Extra delay between the words of one line. */
const WORD_STAGGER = 2;
/**
 * Start offset of a line's slide, in px. Kept short enough that the line is
 * already on screen on its first frame (a longer run-up wastes frames off-screen).
 */
const SLIDE_DISTANCE = 340;
/** spring() with a fixed duration reaches 0.995 at its last frame. */
const SETTLED = 0.995;

/**
 * Scene 3 + 4 in one component, so that the letters that explode at frame 180
 * are the very same DOM boxes that were revealed in scene 3 (no jump at the cut).
 *
 *  - Lines slide in from alternating sides, staggered by LINE_STAGGER frames.
 *  - Each word has its own mask reveal: clip-path inset 100% -> 0%.
 *  - From SCENES.explode.from every letter flies off on a seeded-random
 *    trajectory under gravity (see lib/physics).
 */
export const StackedLines: React.FC<{ layout: Layout; colors: Colors }> = ({
  layout,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const explodeAt = SCENES.explode.from - SCENES.lines.from;

  return (
    <>
      {layout.lines.map((line, i) => {
        const fromLeft = i % 2 === 0;
        const lineStart = i * LINE_STAGGER;
        const color = i % 2 === 0 ? colors.text : colors.accent;

        const slide = spring({
          frame: Math.max(0, frame - lineStart),
          fps,
          durationInFrames: REVEAL_FRAMES,
          config: { damping: 200 },
        });
        const slideX = interpolate(
          slide,
          [0, SETTLED],
          [(fromLeft ? -1 : 1) * SLIDE_DISTANCE, 0],
          { extrapolateRight: "clamp" },
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              width: WIDTH,
              top: HEIGHT / 2 + line.centerY - line.capHeight / 2,
              height: line.capHeight,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: line.spaceWidth,
              translate: `${slideX}px 0`,
            }}
          >
            {line.words.map((word, j) => {
              const reveal = spring({
                frame: Math.max(0, frame - lineStart - j * WORD_STAGGER),
                fps,
                durationInFrames: REVEAL_FRAMES,
                config: { damping: 200 },
              });
              // Mask reveal: the clipped-away share of the word, 100% -> 0%.
              // It opens in the direction the line travels.
              const hidden = interpolate(reveal, [0, SETTLED], [100, 0], {
                extrapolateRight: "clamp",
              });
              const clipPath =
                hidden <= 0
                  ? "none"
                  : fromLeft
                    ? `inset(0 ${hidden}% 0 0)`
                    : `inset(0 0 0 ${hidden}%)`;

              return (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    flexShrink: 0,
                    fontSize: line.fontSize,
                    // Padding keeps glyph overshoot inside the mask's box;
                    // the equal negative margin keeps the layout unchanged.
                    padding: "0.1em 0.06em",
                    margin: "-0.1em -0.06em",
                    clipPath,
                  }}
                >
                  {word.letters.map((letter, k) => {
                    const seed = `letter-${i}-${j}-${k}`;
                    const flight = frame - explodeAt - letterFuse(seed);
                    const state =
                      flight > 0
                        ? simulateLetter(seed, letter.centerX, flight)
                        : null;

                    return (
                      <div
                        key={k}
                        style={{
                          ...capTrimmedText,
                          color,
                          translate: state ? `${state.x}px ${state.y}px` : undefined,
                          rotate: state ? `${state.rotate}deg` : undefined,
                        }}
                      >
                        {letter.char}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
};
