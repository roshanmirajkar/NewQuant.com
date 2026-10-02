import { loadFont } from "@remotion/google-fonts/Anton";

/**
 * Anton: a tall, condensed display face that fills a 1080 px wide portrait
 * canvas with huge caps. (Archivo Black is the wider alternative:
 * swap the import to "@remotion/google-fonts/ArchivoBlack".)
 *
 * loadFont() blocks frame rendering until the font file has arrived;
 * waitUntilDone() lets us measure text only once the real glyphs exist.
 */
export const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const fontWeight = 400;
