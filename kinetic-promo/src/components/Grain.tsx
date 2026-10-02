import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "../timeline";

/**
 * Film grain that leaves the underlying colours alone.
 *
 * feTurbulence is re-seeded with the frame number, so every frame gets a new
 * noise field. The field is split around mid-grey into two layers:
 *  - values above mid-grey -> `screen` layer: sparse light speckle
 *  - values below mid-grey -> `multiply` layer: sparse dark speckle
 * So black stays black (multiply can't lighten it, screen only adds a faint
 * sparkle), white stays white, and lime/mid-tones get the full texture.
 */
const GrainLayer: React.FC<{
  id: string;
  frame: number;
  baseFrequency: number;
  strength: number;
  mode: "light" | "dark";
}> = ({ id, frame, baseFrequency, strength, mode }) => {
  // light: clamp(4 * (n - 0.5)) ; dark: 1 - clamp(4 * (0.5 - n)) = clamp(4n - 1)
  const slope = 4;
  const intercept = mode === "light" ? -2 : -1;

  return (
    <AbsoluteFill
      style={{
        opacity: strength,
        mixBlendMode: mode === "light" ? "screen" : "multiply",
        pointerEvents: "none",
      }}
    >
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <filter
          id={id}
          x="0"
          y="0"
          width={WIDTH}
          height={HEIGHT}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFrequency}
            numOctaves={2}
            seed={frame}
            stitchTiles="stitch"
          />
          {/* RGB -> luminance, alpha forced opaque */}
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
          />
          <feComponentTransfer>
            <feFuncR type="linear" slope={slope} intercept={intercept} />
            <feFuncG type="linear" slope={slope} intercept={intercept} />
            <feFuncB type="linear" slope={slope} intercept={intercept} />
          </feComponentTransfer>
        </filter>
        <rect width={WIDTH} height={HEIGHT} filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ opacity: number; baseFrequency: number }> = ({
  opacity,
  baseFrequency,
}) => {
  const frame = useCurrentFrame();

  if (opacity <= 0) {
    return null;
  }

  return (
    <>
      <GrainLayer
        id="kinetic-grain-light"
        frame={frame}
        baseFrequency={baseFrequency}
        strength={opacity}
        mode="light"
      />
      <GrainLayer
        id="kinetic-grain-dark"
        frame={frame}
        baseFrequency={baseFrequency}
        strength={opacity}
        mode="dark"
      />
    </>
  );
};
