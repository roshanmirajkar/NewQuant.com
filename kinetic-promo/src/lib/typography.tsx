import type { CSSProperties, ReactNode } from "react";
import { fontFamily, fontWeight } from "../fonts";

/**
 * `text-box: trim-both cap alphabetic` (Chrome 133+) shrinks a text box to the
 * band between the cap height and the baseline. All our copy is capitals, so
 * flex-centring such a box centres the *glyphs*. Without it the line box's
 * asymmetric ascent/descent padding pushes caps visibly off-centre.
 */
export const capTrimmedText = {
  fontFamily,
  fontWeight,
  lineHeight: 1,
  whiteSpace: "pre",
  flexShrink: 0,
  textBox: "trim-both cap alphabetic",
} as CSSProperties;

export const CapText: React.FC<{
  children: ReactNode;
  fontSize: number;
  color: string;
  style?: CSSProperties;
}> = ({ children, fontSize, color, style }) => (
  <div style={{ ...capTrimmedText, fontSize, color, ...style }}>{children}</div>
);
