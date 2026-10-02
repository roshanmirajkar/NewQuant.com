import type { CSSProperties } from "react";

/**
 * A small geometric fox head: the end-card mark (stand-in for your logo) and the video's only
 * "fox noir" motif. Pure SVG shapes, no photos or likenesses.
 */
export const FoxMark: React.FC<{
  size: number;
  /** Head colour. */
  fill: string;
  /** Outline, ears, eyes, nose. */
  ink: string;
  /** Muzzle / cheeks. */
  patch: string;
  style?: CSSProperties;
}> = ({ size, fill, ink, patch, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ display: "block", overflow: "visible", ...style }}
  >
    {/* head */}
    <polygon
      points="10,4 36,28 50,36 64,28 90,4 88,40 99,58 74,68 50,98 26,68 1,58 12,40"
      fill={fill}
      stroke={ink}
      strokeWidth={4}
      strokeLinejoin="round"
    />
    {/* muzzle + cheeks */}
    <polygon points="50,54 74,68 50,98 26,68" fill={patch} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
    <polygon points="1,58 26,68 22,54" fill={patch} />
    <polygon points="99,58 74,68 78,54" fill={patch} />
    {/* inner ears */}
    <polygon points="15,16 28,28 16,34" fill={ink} />
    <polygon points="85,16 72,28 84,34" fill={ink} />
    {/* eyes */}
    <polygon points="24,46 42,52 33,58" fill={ink} />
    <polygon points="76,46 58,52 67,58" fill={ink} />
    {/* nose */}
    <polygon points="43,88 57,88 50,98" fill={ink} />
  </svg>
);
