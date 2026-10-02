import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "../timeline";

/**
 * Animated film grain: SVG fractal noise whose seed is the frame number, so
 * every frame gets a fresh, uncorrelated pattern (and renders are repeatable).
 *
 * The colour matrix turns the noise into contrast-boosted mono grey centred on
 * 50%. It is composited with `hard-light`: noise above 50% only brightens
 * (screen) and noise below 50% only darkens (multiply). So the grain shows as
 * fine speckle on black, lime and white alike, without veiling the blacks in
 * grey or dulling the lime and the whites the way a plain grey layer would.
 *
 * Mind the file size: new random noise every frame cannot be predicted by the
 * encoder, so the grain is almost the whole bitrate at --crf 18. Measured on
 * this video (1080x1920, crf 18): no grain = 1.4 MB, opacity 0.055 = ~38 MB,
 * opacity 0.12 at fine size = ~128 MB. Roughly 14 Mbps per unit of noise that
 * survives encoding, whatever the grain size. A single octave at size ~2.5 gives
 * the most visible grain per byte; raise `grainOpacity` only if you accept the size.
 */
export const Grain: React.FC<{ opacity: number; size: number }> = ({
  opacity,
  size,
}) => {
  const frame = useCurrentFrame();
  if (opacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{ opacity, mixBlendMode: "hard-light", pointerEvents: "none" }}
    >
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
            baseFrequency={0.85 / size}
            numOctaves={1}
            seed={frame}
          />
          {/* grey = 2.4 x (mean of R,G,B - 0.5) + 0.5 ; alpha = 1 */}
          <feColorMatrix
            type="matrix"
            values="0.8 0.8 0.8 0 -0.7  0.8 0.8 0.8 0 -0.7  0.8 0.8 0.8 0 -0.7  0 0 0 0 1"
          />
        </filter>
        <rect width={WIDTH} height={HEIGHT} filter="url(#kinetic-grain)" />
      </svg>
    </AbsoluteFill>
  );
};
