import React, { Fragment } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CLAMP, ease } from "../motion";
import type { KineticPromoProps } from "../props";
import { T } from "../timeline";
import { baseText, CAP_BOX, type FittedSizes } from "../typography";

type Props = {
  copy: KineticPromoProps["copy"];
  colors: KineticPromoProps["colors"];
  sizes: FittedSizes;
};

const LINE_STAGGER = 8; // frames between lines
const WORD_STAGGER = 2; // frames between words inside a line
const SLIDE_FRAMES = 12;
const REVEAL_FRAMES = 12;
const SLIDE_DISTANCE = 540; // px, lines start half a screen away
const LINE_GAP = 56; // px between stacked lines
const DRIFT = 1.025; // slow push-in while the text holds
const PAD = "0.25em";

// --- Letter physics (180-270f) ----------------------------------------------
const GRAVITY = 1.5; // px / frame^2
const MAX_SPIN = 14; // deg / frame
const MAX_DELAY = 4; // frames

type LetterState = { x: number; y: number; rotation: number };

/**
 * Integrates one letter frame by frame: velocity += gravity, position += velocity.
 * Every launch parameter is seeded from the letter's key, so any frame renders
 * identically no matter the order frames are rendered in.
 *
 * @param key     unique id of the letter, e.g. "1-4"
 * @param relX    -0.5..0.5, position of the letter along its line (scatters outward)
 * @param relY    -0.5..0.5, position of its line in the stack (top lines pop higher)
 * @param elapsed frames since the explosion started
 */
const simulateLetter = (
  key: string,
  relX: number,
  relY: number,
  elapsed: number,
): LetterState => {
  const delay = Math.floor(random(`${key}-delay`) * (MAX_DELAY + 1));
  const steps = Math.max(0, elapsed - delay);

  const vx = relX * 16 + (random(`${key}-vx`) - 0.5) * 10;
  let vy = -(12 + random(`${key}-vy`) * 24) + relY * 10;
  const spin = (random(`${key}-spin`) - 0.5) * 2 * MAX_SPIN;

  let x = 0;
  let y = 0;
  let rotation = 0;
  for (let i = 0; i < steps; i++) {
    vy += GRAVITY;
    x += vx;
    y += vy;
    rotation += spin;
  }

  return { x, y, rotation };
};

/**
 * 90-180f  Lines stack in one at a time (8f stagger), sliding from alternating
 *          sides; every word is revealed through an animated clip-path inset.
 * 180-270f Every letter breaks off and falls away with gravity.
 */
export const StackScene: React.FC<Props> = ({ copy, colors, sizes }) => {
  const frame = useCurrentFrame(); // 0 == global frame 90
  const { fps } = useVideoConfig();
  const explodeAt = T.explode - T.stack;
  const lineCount = copy.stack.length;

  // Held text is never fully static: slow push-in until the explosion.
  const drift = interpolate(frame, [0, explodeAt], [1, DRIFT], CLAMP);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        gap: LINE_GAP,
        scale: drift,
      }}
    >
      {copy.stack.map((text, lineIndex) => {
        const fromLeft = lineIndex % 2 === 0;
        const start = lineIndex * LINE_STAGGER;
        const slide = ease(frame, fps, start, SLIDE_FRAMES);
        const x = interpolate(
          slide,
          [0, 1],
          [(fromLeft ? -1 : 1) * SLIDE_DISTANCE, 0],
          CLAMP,
        );
        const relY =
          lineCount > 1 ? lineIndex / (lineCount - 1) - 0.5 : 0;

        const words = text.split(" ");
        let charIndex = 0;

        return (
          <div
            key={lineIndex}
            style={{
              ...baseText,
              fontSize: sizes.stack[lineIndex],
              color: lineIndex % 2 === 0 ? colors.text : colors.accent,
              translate: `${x}px 0`,
            }}
          >
            {words.map((word, wordIndex) => {
              const wordStart = start + wordIndex * WORD_STAGGER;
              const reveal = ease(frame, fps, wordStart, REVEAL_FRAMES);
              // Mask reveal: inset 100% -> 0% on the trailing edge, so the word
              // is drawn in the direction it is travelling.
              const inset = interpolate(reveal, [0, 1], [100, 0], CLAMP);
              const revealed = frame >= wordStart + REVEAL_FRAMES;
              const clipPath = revealed
                ? "none" // letters must be free to leave the word box
                : fromLeft
                  ? `inset(-${PAD} ${inset}% -${PAD} 0)`
                  : `inset(-${PAD} 0 -${PAD} ${inset}%)`;

              const letters = [...word].map((char) => {
                const index = charIndex++;
                const state =
                  frame >= explodeAt
                    ? simulateLetter(
                        `${lineIndex}-${index}`,
                        (index + 0.5) / text.length - 0.5,
                        relY,
                        frame - explodeAt,
                      )
                    : null;

                return (
                  <span
                    key={index}
                    style={{
                      display: "inline-block",
                      ...CAP_BOX,
                      translate: state ? `${state.x}px ${state.y}px` : undefined,
                      rotate: state ? `${state.rotation}deg` : undefined,
                    }}
                  >
                    {char}
                  </span>
                );
              });
              // the space between words occupies one character slot
              charIndex++;

              return (
                <Fragment key={wordIndex}>
                  {wordIndex > 0 && " "}
                  <span
                    style={{
                      display: "inline-block",
                      ...CAP_BOX,
                      clipPath,
                    }}
                  >
                    {letters}
                  </span>
                </Fragment>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
