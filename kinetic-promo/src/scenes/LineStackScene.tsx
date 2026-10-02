import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LINE_GAP_PX, WORD_GAP_EM } from "../layout";
import { mixSeed, seededRandom } from "../random";
import { centered, displayText } from "../text";
import { T, WIDTH } from "../timing";
import type { SceneProps } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** How far off to the side a line starts (px). The mask reveal hides most of the trip. */
const SLIDE_DISTANCE = WIDTH * 0.65;

// Letter physics, all per frame at 30fps. Euler-integrated, one step per frame.
const GRAVITY = 1.2; // px/frame^2, added to vy every frame
const VX_MAX = 18; // px/frame, horizontal burst (either direction)
const VY_UP_MIN = 8; // px/frame, initial upward kick
const VY_UP_MAX = 28;
const SPIN_MIN = 3; // deg/frame
const SPIN_MAX = 14;
const MAX_DELAY = 5; // frames of random per-letter delay, so the burst is not one uniform pop
const LINE_RIPPLE = 4; // extra frames per line: top line lets go first, then the next, then the last

type Motion = { x: number; y: number; rotate: number };

/**
 * Position of one letter `t` frames after the explosion starts.
 * Per-letter velocity, spin and start delay come from a PRNG seeded by (seed, letterIndex);
 * lines add a small ripple delay on top.
 * y and x are accumulated frame by frame: vy += gravity; y += vy; x += vx.
 */
const letterMotion = (letterIndex: number, lineIdx: number, framesSinceExplode: number, seed: number): Motion => {
  const rnd = seededRandom(mixSeed(seed, letterIndex));
  const delay = Math.floor(rnd() * (MAX_DELAY + 1)) + lineIdx * LINE_RIPPLE;
  const vx = (rnd() * 2 - 1) * VX_MAX;
  let vy = -(VY_UP_MIN + rnd() * (VY_UP_MAX - VY_UP_MIN));
  const spin = (rnd() < 0.5 ? -1 : 1) * (SPIN_MIN + rnd() * (SPIN_MAX - SPIN_MIN));

  const t = Math.max(0, framesSinceExplode - delay);
  let x = 0;
  let y = 0;
  for (let k = 0; k < t; k++) {
    vy += GRAVITY;
    x += vx;
    y += vy;
  }
  return { x, y, rotate: spin * t };
};

/**
 * Frames 90-270.
 *   90-180  Three lines slide in from alternating sides, 8 frames apart. Every word is revealed
 *           through a clip-path inset animating 100% -> 0%.
 *   180-270 Each letter gets its own seeded velocity + spin and falls off-screen under gravity.
 */
export const LineStackScene: React.FC<SceneProps & { seed: number }> = ({ copy, colors, layout, seed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < T.linesStart || frame >= T.wipeStart) return null;

  const push = interpolate(frame, [T.linesStart, T.explodeStart], [1, 1.05], clamp);
  const sinceExplode = frame - T.explodeStart;
  let letterIndex = 0;

  return (
    <AbsoluteFill style={centered}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", rowGap: LINE_GAP_PX, scale: push }}>
        {copy.lines.map((line, lineIdx) => {
          const start = T.linesStart + lineIdx * T.lineStagger;
          const fromLeft = lineIdx % 2 === 0;
          const slide = spring({
            frame: Math.max(0, frame - start),
            fps,
            config: { damping: 20, mass: 0.5, stiffness: 140 },
          });
          const x = interpolate(slide, [0, 1], [fromLeft ? -SLIDE_DISTANCE : SLIDE_DISTANCE, 0], {
            extrapolateRight: "clamp",
          });
          const color = lineIdx === 1 ? colors.accent : colors.text;

          return (
            <div
              key={lineIdx}
              style={{
                display: "flex",
                columnGap: `${WORD_GAP_EM}em`,
                fontSize: layout.lineSizes[lineIdx],
                translate: `${x}px 0px`,
              }}
            >
              {line
                .split(" ")
                .filter((w) => w.length > 0)
                .map((word, wordIdx) => {
                  // 100% -> 0% inset on the trailing edge: the word is "drawn" in the direction it travels.
                  const reveal = interpolate(
                    frame - start - wordIdx * T.wordStagger,
                    [0, T.maskFrames],
                    [100, 0],
                    { ...clamp, easing: Easing.out(Easing.cubic) },
                  );
                  // Once fully revealed the mask must go, or it would clip letters as they fly out.
                  const clipPath =
                    reveal <= 0
                      ? "none"
                      : fromLeft
                        ? `inset(-8% ${reveal}% -8% 0%)`
                        : `inset(-8% 0% -8% ${reveal}%)`;

                  return (
                    <div key={wordIdx} style={{ display: "flex", clipPath }}>
                      {Array.from(word).map((char, charIdx) => {
                        const idx = letterIndex++;
                        const m = sinceExplode >= 0 ? letterMotion(idx, lineIdx, sinceExplode, seed) : null;
                        return (
                          <div
                            key={charIdx}
                            style={{
                              ...displayText,
                              color,
                              translate: m ? `${m.x}px ${m.y}px` : undefined,
                              rotate: m ? `${m.rotate}deg` : undefined,
                            }}
                          >
                            {char}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
