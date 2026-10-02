import { fitText, measureText } from "@remotion/layout-utils";
import { fontFamily, fontWeight } from "../fonts";
import type { Copy } from "../props";
import { HEIGHT, MAX_TEXT_WIDTH, SAFE_Y } from "../timeline";

/**
 * Typesetting. Every piece of copy is measured with the real, loaded font and
 * scaled so it fills the safe width, so reskinning the copy never overflows.
 *
 * Lines are split into per-letter boxes (needed for the explosion in scene 4),
 * so their width is the sum of the letter advances. That is exactly what the
 * DOM lays out, because each letter is its own box (no kerning across boxes).
 */

/** Measure at a huge size so sub-pixel rounding of glyph advances is irrelevant. */
const REF_SIZE = 1000;

const MAX_STOP_FONT = 560;
const MAX_SCROLLING_FONT = 300;
const MAX_LINE_FONT = 360;
const MAX_BRAND_FONT = 240;
/** Gap between stacked lines, as a fraction of the smaller neighbouring cap height. */
const LINE_GAP = 0.22;

const font = { fontFamily, fontWeight, validateFontIsLoaded: true } as const;

const advanceEm = (char: string) =>
  measureText({ ...font, text: char, fontSize: REF_SIZE }).width / REF_SIZE;

/** Cap height in em, read from the loaded font (falls back to a typical value). */
const capHeightEm = (): number => {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return 0.72;
  ctx.font = `${fontWeight} ${REF_SIZE}px ${fontFamily}`;
  const ascent = ctx.measureText("H").actualBoundingBoxAscent;
  return ascent > 0 ? ascent / REF_SIZE : 0.72;
};

const fitWidth = (text: string, maxFontSize: number) =>
  Math.min(
    maxFontSize,
    fitText({ ...font, text, withinWidth: MAX_TEXT_WIDTH }).fontSize,
  );

export type LetterLayout = {
  char: string;
  /** Horizontal centre of the letter, in px from the centre of the frame. */
  centerX: number;
};

export type LineLayout = {
  fontSize: number;
  /** Height of the capital letters in px (the box each line occupies). */
  capHeight: number;
  /** Vertical centre of the line's caps, in px from the centre of the frame. */
  centerY: number;
  /** Width of a word space in px. */
  spaceWidth: number;
  words: { letters: LetterLayout[] }[];
};

export type Layout = {
  stopFontSize: number;
  scrollingFontSize: number;
  brandFontSize: number;
  lines: LineLayout[];
};

export const computeLayout = (copy: Copy): Layout => {
  const capEm = capHeightEm();
  const spaceEm = advanceEm(" ") || 0.22;

  const rows = copy.lines.map((raw) => {
    const words = raw.toUpperCase().trim().split(/\s+/).filter(Boolean);
    const wordEm = words.map((word) =>
      [...word].reduce((sum, char) => sum + advanceEm(char), 0),
    );
    const lineEm =
      wordEm.reduce((sum, em) => sum + em, 0) + spaceEm * (words.length - 1);
    return { words, lineEm };
  });

  // Each line is justified to the safe width; if the stack gets too tall
  // (many lines), every line is scaled down together to fit.
  let sizes = rows.map(({ lineEm }) =>
    Math.min(MAX_LINE_FONT, MAX_TEXT_WIDTH / lineEm),
  );
  const gapBetween = (a: number, b: number) => LINE_GAP * capEm * Math.min(a, b);
  const stackHeight = (s: number[]) =>
    s.reduce(
      (sum, fs, i) =>
        sum + capEm * fs + (i < s.length - 1 ? gapBetween(fs, s[i + 1]) : 0),
      0,
    );
  const squeeze = Math.min(1, (HEIGHT - 2 * SAFE_Y) / stackHeight(sizes));
  sizes = sizes.map((fs) => fs * squeeze);

  const total = stackHeight(sizes);
  let cursorY = -total / 2;

  const lines: LineLayout[] = rows.map(({ words }, i) => {
    const fontSize = sizes[i];
    const capHeight = capEm * fontSize;
    const centerY = cursorY + capHeight / 2;
    cursorY += capHeight + (i < sizes.length - 1 ? gapBetween(sizes[i], sizes[i + 1]) : 0);

    const spaceWidth = spaceEm * fontSize;
    const lineWidth = rows[i].lineEm * fontSize;
    let cursorX = -lineWidth / 2;

    return {
      fontSize,
      capHeight,
      centerY,
      spaceWidth,
      words: words.map((word) => {
        const letters = [...word].map((char) => {
          const width = advanceEm(char) * fontSize;
          const centerX = cursorX + width / 2;
          cursorX += width;
          return { char, centerX };
        });
        cursorX += spaceWidth;
        return { letters };
      }),
    };
  });

  return {
    stopFontSize: fitWidth(copy.stop.toUpperCase(), MAX_STOP_FONT),
    scrollingFontSize: fitWidth(copy.scrolling.toUpperCase(), MAX_SCROLLING_FONT),
    brandFontSize: fitWidth(copy.brand.toUpperCase(), MAX_BRAND_FONT),
    lines,
  };
};
