import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "./timeline";

/**
 * Animated film grain: SVG feTurbulence whose `seed` changes every frame, so
 * the noise pattern is new on each frame (and identical on every render).
 *
 * The noise is thresholded into black/white specks (salt-and-pepper) rather
 * than gray fog, so it stays visible on both the black and the lime
 * backgrounds without lifting the blacks into a milky gray.
 */
export const Grain: React.FC<{ opacity: number; size: number }> = ({
  opacity,
  size,
}) => {
  const frame = useCurrentFrame();

  if (opacity <= 0) {
    return null;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      {/* viewBox smaller than the frame => each noise cell is `size` px wide */}
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH / size} ${HEIGHT / size}`}
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
            baseFrequency="0.9"
            numOctaves={2}
            seed={frame}
            stitchTiles="stitch"
          />
          {/* luminance -> gray, then push contrast so most pixels are near black or white */}
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0    0    0    0 1"
          />
          <feComponentTransfer>
            <feFuncR type="linear" slope="6" intercept="-2.5" />
            <feFuncG type="linear" slope="6" intercept="-2.5" />
            <feFuncB type="linear" slope="6" intercept="-2.5" />
          </feComponentTransfer>
        </filter>
        <rect
          width={WIDTH / size}
          height={HEIGHT / size}
          filter="url(#kinetic-grain)"
        />
      </svg>
    </AbsoluteFill>
  );
};
