import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CAP_HEIGHT, CAP_TOP, TEXT_BASE_STYLE } from "../font";
import { ramp, settle } from "../lib/motion";
import { letterMotion } from "../lib/physics";
import { STACK_STAGGER, T } from "../timeline";

const SLIDE_SPRING = { damping: 18, stiffness: 200, mass: 0.7 } as const;
const SLIDE_PX = 360;
/** Frames between the words of one line starting their mask-reveal. */
const WORD_STAGGER = 3;
/** Vertical gap between the cap boxes of two lines, px. */
const LINE_GAP_PX = 64;

/** Local frame (this scene starts at T.stack) on which the explosion fires. */
const EXPLODE_LOCAL = T.explode - T.stack;

type LineProps = {
  text: string;
  fontSize: number;
  color: string;
  index: number;
  frame: number;
};

const Line: React.FC<LineProps> = ({ text, fontSize, color, index, frame }) => {
  const dir = index % 2 === 0 ? -1 : 1; // -1: enters from the left, 1: from the right
  const start = index * STACK_STAGGER;

  const slide = settle(frame - start, SLIDE_SPRING);
  const dx = dir * SLIDE_PX * (1 - slide);

  const words = text.split(" ");
  const letterCount = text.replace(/ /g, "").length;
  let letterIndex = 0;

  return (
    <div style={{ height: CAP_HEIGHT * fontSize }}>
      <div
        style={{
          ...TEXT_BASE_STYLE,
          fontSize,
          height: fontSize,
          position: "relative",
          top: -CAP_TOP * fontSize, // not margin-top: that would collapse through the parent
          color,
          display: "flex",
          translate: `${dx}px 0`,
        }}
      >
        {words.map((word, wi) => {
          // Mask reveal: clip-path inset animates 100% -> 0% from the side the line enters.
          const wordSlide = settle(frame - start - wi * WORD_STAGGER, SLIDE_SPRING);
          const hidden = ramp(wordSlide, [0, 1], [100, 0]);
          const revealed = hidden <= 0.01;
          const clipPath = revealed
            ? undefined
            : dir < 0
              ? `inset(0 ${hidden}% 0 0)`
              : `inset(0 0 0 ${hidden}%)`;

          return (
            <React.Fragment key={wi}>
              {wi > 0 && <span style={{ display: "inline-block" }}>{" "}</span>}
              <span style={{ display: "inline-block", clipPath }}>
                {word.split("").map((ch, ci) => {
                  const spread =
                    letterCount > 1
                      ? (letterIndex / (letterCount - 1)) * 2 - 1
                      : 0;
                  const seed = index * 1000 + letterIndex * 17 + 3;
                  letterIndex++;
                  // +1: the first integration step lands ON the cue frame, in sync with the audio hit.
                  const t = frame - EXPLODE_LOCAL + 1;
                  const m = letterMotion(seed, spread, t);
                  const moving = t > 0;
                  return (
                    <span
                      key={ci}
                      style={{
                        display: "inline-block",
                        translate: moving ? `${m.x}px ${m.y}px` : undefined,
                        rotate: moving ? `${m.rotate}deg` : undefined,
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 90-270f (local 0-180). Three lines stack one at a time, 8 frames apart,
 * alternating entry side, each word mask-revealed. At local 90 (global 180)
 * every letter is launched with a seeded velocity and spin and falls under
 * gravity until it leaves the frame.
 */
export const StackScene: React.FC<{
  lines: readonly [string, string, string];
  sizes: readonly [number, number, number];
  colors: readonly [string, string, string];
}> = ({ lines, sizes, colors }) => {
  const frame = useCurrentFrame();

  // Slow push-in on the held stack so it never feels frozen.
  const drift = ramp(frame, [0, EXPLODE_LOCAL], [1, 1.02]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: LINE_GAP_PX,
        scale: drift,
      }}
    >
      {lines.map((text, i) => (
        <Line
          key={i}
          index={i}
          text={text.toUpperCase()}
          fontSize={sizes[i]}
          color={colors[i]}
          frame={frame}
        />
      ))}
    </AbsoluteFill>
  );
};
