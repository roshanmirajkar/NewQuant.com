import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "../timeline";

/**
 * Animated film grain: an SVG feTurbulence whose `seed` is the frame number, so every frame gets
 * a fresh, independent noise field (no CSS animation involved).
 *
 * The noise is split into white and black speckles (alpha from how far the noise is above/below
 * 0.5) and drawn with normal blending, so it is visible on the black beats AND on the lime flood
 * without shifting either colour's average.
 */
export const Grain: React.FC<{ opacity: number; size: number; loop: number }> = ({
  opacity,
  size,
  loop,
}) => {
  const frame = useCurrentFrame();
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ display: "block" }}
      >
        <filter
          id="kinetic-grain"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.8 / Math.max(0.5, size)}
            numOctaves={2}
            seed={(loop > 0 ? frame % Math.round(loop) : frame) + 1}
            stitchTiles="stitch"
            result="noise"
          />
          {/* alpha = 5·(noise − 0.5) → white specks where the noise is high */}
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  5 0 0 0 -2.5"
            result="light"
          />
          {/* alpha = 5·(0.5 − noise) → black specks where the noise is low */}
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 2.5"
            result="dark"
          />
          <feMerge>
            <feMergeNode in="light" />
            <feMergeNode in="dark" />
          </feMerge>
        </filter>
        <rect width={WIDTH} height={HEIGHT} filter="url(#kinetic-grain)" />
      </svg>
    </AbsoluteFill>
  );
};
