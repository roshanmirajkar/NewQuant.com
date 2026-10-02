import type { CSSProperties } from "react";
import { fontFamily } from "./font";

/**
 * Base style for every piece of display text.
 *
 * `text-box: trim-both cap alphabetic` shrinks the element's box to exactly the cap height,
 * so "centred" means the capitals are visually centred (no ascender/descender slop), and a
 * clip-path at 50% cuts through the middle of the letters.
 */
export const displayText: CSSProperties = {
  fontFamily,
  fontWeight: 400,
  lineHeight: 1,
  whiteSpace: "nowrap",
  textBox: "trim-both cap alphabetic",
};

export const centered: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};
