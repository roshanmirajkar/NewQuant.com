import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "../timing";

/**
 * Animated film grain: feTurbulence with `seed` bound to the frame number, so the noise
 * re-rolls every frame. Rendered with hard-light so it sparkles on black (a plain
 * overlay/soft-light blend would do nothing there) and also textures lime and white.
 */
export const Grain: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "hard-light", pointerEvents: "none" }}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <filter id="kinetic-grain" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={WIDTH} height={HEIGHT} filter="url(#kinetic-grain)" />
      </svg>
    </AbsoluteFill>
  );
};
