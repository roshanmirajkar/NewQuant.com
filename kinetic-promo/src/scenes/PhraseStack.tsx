import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { map, SPRING, springAt } from "../lib/anim";
import { makeLaunch, simulate, type Launch } from "../lib/physics";
import {
  CAP_CENTER_EM,
  placeLine,
  textStyle,
  type FittedLine,
  type TypeLayout,
} from "../lib/typography";
import type { Colors } from "../props";
import { BEAT, CENTER_X, CENTER_Y, SCENE } from "../timeline";

/** Space between the cap boxes of neighbouring lines. */
const STACK_GAP = 44;
/** How far a line starts from its resting place before it slides in. */
const SLIDE_PX = 360;

type LetterSpec = { key: string; char: string; x: number; w: number; launch: Launch };
type WordSpec = { key: string; x: number; w: number; letters: LetterSpec[] };
type LineSpec = {
  key: string;
  line: FittedLine;
  left: number;
  top: number;
  words: WordSpec[];
};

/** Lay the lines out as a block centred on the canvas and give every letter its seeded launch. */
const buildStack = (lines: readonly FittedLine[]): LineSpec[] => {
  const total =
    lines.reduce((sum, l) => sum + l.capHeight, 0) + STACK_GAP * (lines.length - 1);
  let cursor = CENTER_Y - total / 2;

  const placed = lines.map((line, li) => {
    const capCenterY = cursor + line.capHeight / 2;
    cursor += line.capHeight + STACK_GAP;
    return { line, li, capCenterY, ...placeLine(line, capCenterY) };
  });

  let maxDist = 1;
  for (const p of placed) {
    for (const word of p.line.words) {
      for (const g of word.glyphs) {
        maxDist = Math.max(
          maxDist,
          Math.hypot(p.left + g.x + g.w / 2 - CENTER_X, p.capCenterY - CENTER_Y),
        );
      }
    }
  }

  return placed.map((p) => ({
    key: `line-${p.li}`,
    line: p.line,
    left: p.left,
    top: p.top,
    words: p.line.words.map((word, wi) => ({
      key: `word-${p.li}-${wi}`,
      x: word.x,
      w: word.w,
      letters: word.glyphs.map((g, gi) => ({
        key: `letter-${p.li}-${wi}-${gi}`,
        char: g.char,
        x: g.x - word.x,
        w: g.w,
        launch: makeLaunch({
          seed: `letter:${p.li}:${wi}:${gi}:${g.char}`,
          x: p.left + g.x + g.w / 2,
          y: p.capCenterY,
          cx: CENTER_X,
          cy: CENTER_Y,
          maxDist,
        }),
      })),
    })),
  }));
};

/**
 * Beats 3 + 4.
 *  90–180  Three lines stack up one at a time (8 frames apart), sliding in from alternating
 *          sides. Every word is uncovered by a clip-path inset that animates 100% → 0%.
 * 180–270  The lines blow apart into individual letters. Each letter has its own seeded launch
 *          and is stepped frame by frame (velocity += gravity, position += velocity, spin) until
 *          it has fallen out of the bottom of the frame.
 */
export const PhraseStack: React.FC<{ layout: TypeLayout; colors: Colors }> = ({
  layout,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stack = useMemo(() => buildStack(layout.lines), [layout]);

  if (frame < SCENE.stack.from || frame >= SCENE.wipe.from) return null;

  // Slow push-in while the phrase sits there, so it never feels frozen.
  const push = map(frame, [SCENE.stack.from + 8, SCENE.explode.from], [1, 1.035]);
  const sinceBlast = frame - SCENE.explode.from;

  return (
    <AbsoluteFill
      style={{ scale: push, transformOrigin: `${CENTER_X}px ${CENTER_Y}px` }}
    >
      {stack.map((ln, li) => {
        const start = SCENE.stack.from + BEAT.lineStagger * li;
        const fromLeft = li % 2 === 0;
        const slide = springAt(frame, fps, start, SPRING.snap);
        const slideX = (fromLeft ? -1 : 1) * SLIDE_PX * (1 - slide);
        const color = colors.lines[li] ?? colors.foreground;

        return (
          <div
            key={ln.key}
            style={{
              position: "absolute",
              left: ln.left,
              top: ln.top,
              width: ln.line.width,
              height: ln.line.fontSize,
              translate: `${slideX}px 0px`,
            }}
          >
            {ln.words.map((word, wi) => {
              const reveal = springAt(
                frame,
                fps,
                start + BEAT.wordStagger * wi,
                SPRING.snap,
              );
              // Mask reveal: the inset (percent of the word's box) goes 100% → 0%.
              const hidden = map(reveal, [0, 1], [100, 0]);
              const clipPath =
                hidden < 0.1
                  ? "none" // fully revealed: let the letters fly out freely
                  : fromLeft
                    ? `inset(0 ${hidden}% 0 0)`
                    : `inset(0 0 0 ${hidden}%)`;

              return (
                <div
                  key={word.key}
                  style={{
                    position: "absolute",
                    left: word.x,
                    top: 0,
                    width: word.w,
                    height: ln.line.fontSize,
                    clipPath,
                  }}
                >
                  {word.letters.map((letter) => {
                    const off =
                      sinceBlast >= 0 ? simulate(letter.launch, sinceBlast) : null;
                    return (
                      <div
                        key={letter.key}
                        style={{
                          ...textStyle(ln.line, color),
                          left: letter.x,
                          top: 0,
                          width: letter.w,
                          height: ln.line.fontSize,
                          transformOrigin: `50% ${CAP_CENTER_EM * 100}%`,
                          translate: off ? `${off.x}px ${off.y}px` : undefined,
                          rotate: off ? `${off.rotation}deg` : undefined,
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
    </AbsoluteFill>
  );
};
