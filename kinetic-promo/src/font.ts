import { loadFont } from "@remotion/google-fonts/Anton";

// Anton: a tall, condensed display face. Only the Latin 400 file is fetched.
export const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

/**
 * Anton vertical metrics, in em (unitsPerEm 2048; cap-height 1760, hhea
 * ascent 2409 / descent 674). With `line-height: 1` the cap tops sit 0.0642em
 * below the top of the line box and the baseline 0.9236em below it, so the
 * caps are optically centred in a 1em box (within 0.6% of the font size).
 *
 * If you swap fonts, re-derive these three numbers from the new font.
 */
export const CAP_HEIGHT = 1760 / 2048;
export const CAP_TOP = (1 - (2409 + 674) / 2048) / 2 + 2409 / 2048 - CAP_HEIGHT;

/** Kerning off everywhere, so measured width == rendered width even when a
 *  line is split into per-letter boxes for the explosion. */
export const TEXT_BASE_STYLE = {
  fontFamily,
  fontWeight: 400,
  fontKerning: "none",
  lineHeight: 1,
  whiteSpace: "pre",
  letterSpacing: 0,
} as const;
