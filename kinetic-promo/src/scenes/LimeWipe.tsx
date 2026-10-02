import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FoxMark } from "../components/FoxMark";
import { map, SPRING, springAt } from "../lib/anim";
import { placeLine, textStyle, type TypeLayout } from "../lib/typography";
import type { Colors } from "../props";
import { BEAT, CENTER_X, CENTER_Y, HEIGHT, SCENE, WIDTH } from "../timeline";

/** Smallest circle (about the canvas centre) that covers every corner. */
const IRIS_RADIUS = Math.ceil(Math.hypot(WIDTH / 2, HEIGHT / 2)) + 20;
const MARK_SIZE = 200;
const MARK_GAP = 68;
/** The fox's ears are pointed, so its box looks emptier at the top than the text block at the bottom. */
const OPTICAL_NUDGE_Y = -4;

/**
 * Beat 5 (270–330, then held to the flash).
 * The background wipes to the accent colour through a circular clip-path growing from the centre.
 * The end card lives inside that clipped layer, so black-on-black can never show, and fades up
 * with a 20px rise once the iris has swallowed the text.
 */
export const LimeWipe: React.FC<{ layout: TypeLayout; colors: Colors }> = ({
  layout,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < SCENE.wipe.from) return null;

  const { brand } = layout;
  const iris = springAt(frame, fps, SCENE.wipe.from, SPRING.iris);
  const radius = map(iris, [0, 1], [0, IRIS_RADIUS]);

  // Mark first, text 3 frames behind it.
  const markIn = springAt(frame, fps, BEAT.brandFrom, SPRING.smooth);
  const textIn = springAt(frame, fps, BEAT.brandFrom + 3, SPRING.smooth);

  // Mark above, text below, the pair centred on the canvas.
  const blockTop =
    CENTER_Y - (MARK_SIZE + MARK_GAP + brand.capHeight) / 2 + OPTICAL_NUDGE_Y;
  const textBox = placeLine(brand, blockTop + MARK_SIZE + MARK_GAP + brand.capHeight / 2);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.accent,
        clipPath: `circle(${radius}px at ${CENTER_X}px ${CENTER_Y}px)`,
      }}
    >
      <FoxMark
        size={MARK_SIZE}
        fill={colors.mark}
        ink={colors.ink}
        patch={colors.foreground}
        style={{
          position: "absolute",
          left: CENTER_X - MARK_SIZE / 2,
          top: blockTop,
          opacity: markIn,
          translate: `0px ${map(markIn, [0, 1], [20, 0])}px`,
        }}
      />
      <div
        style={{
          ...textStyle(brand, colors.ink),
          left: textBox.left,
          top: textBox.top,
          width: brand.width,
          height: brand.fontSize,
          opacity: textIn,
          translate: `0px ${map(textIn, [0, 1], [20, 0])}px`,
        }}
      >
        {brand.text}
      </div>
    </AbsoluteFill>
  );
};
