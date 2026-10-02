import { loadFont } from "@remotion/google-fonts/Anton";
import { fitText, measureText } from "@remotion/layout-utils";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import type { Copy } from "../props";
import { SAFE_WIDTH, WIDTH } from "../timeline";

const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

/**
 * Anton, measured from a real render at 400px with `line-height: 1`:
 *   cap height = 344px (0.86em), cap top sits 25px (0.0625em) below the top of the line box.
 * Every vertical placement below works on the CAP box, not the line box, so caps are optically
 * centred (Anton's line box alone would leave them ~3px high per 400px of type).
 * To swap fonts: render a `T` at 400px, trim it, and put the two numbers here.
 */
export const FONT = {
  family: fontFamily,
  weight: 400,
  capHeightEm: 0.86,
  capTopEm: 0.0625,
} as const;

/** Distance from the top of the line box to the middle of the caps, in em. */
export const CAP_CENTER_EM = FONT.capTopEm + FONT.capHeightEm / 2;

/** How wide each kind of text may be, and the biggest it may get if the copy is very short. */
const FIT = {
  stop: { width: SAFE_WIDTH, maxFont: 620 },
  reveal: { width: SAFE_WIDTH * 0.95, maxFont: 380 }, // headroom for the slow push-in
  line: { width: SAFE_WIDTH * 0.965, maxFont: 420 }, // headroom for the stack's push-in
  brand: { width: SAFE_WIDTH * 0.92, maxFont: 320 },
} as const;

export type Glyph = { char: string; x: number; w: number };
export type Word = {
  text: string;
  /** Left edge, from the left of the line. */
  x: number;
  w: number;
  /** Glyph x is from the left of the *line*. */
  glyphs: readonly Glyph[];
};
export type FittedLine = {
  text: string;
  /** Even whole pixels, so cap-centre cuts land exactly on a pixel row. */
  fontSize: number;
  /** Kerned width of the whole line. */
  width: number;
  /**
   * How far the ink's horizontal centre sits right of the line box's centre. Glyph side-bearings
   * are not symmetric (a Y and a D don't have the same ones), so we centre the ink, not the box.
   */
  inkShift: number;
  capHeight: number;
  words: readonly Word[];
};
export type TypeLayout = {
  stop: FittedLine;
  reveal: FittedLine;
  lines: readonly FittedLine[];
  brand: FittedLine;
};

/**
 * Horizontal extent of the *painted* glyphs (not the advance box), kerning included, found by
 * drawing the text on an offscreen canvas and scanning for ink. canvas `actualBoundingBox*` is
 * unreliable at big sizes (it rounds, and is several px too wide on some strings).
 */
const measureInk = (text: string, fontSize: number, advanceWidth: number) => {
  const pad = Math.ceil(fontSize * 0.25);
  const w = Math.ceil(advanceWidth) + pad * 2;
  const h = Math.ceil(fontSize * 1.6);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas is not available to measure type");
  ctx.font = `${FONT.weight} ${fontSize}px ${FONT.family}`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, pad, Math.round(fontSize * 1.15));
  const alpha = ctx.getImageData(0, 0, w, h).data;
  const columnHasInk = (x: number) => {
    for (let y = 0; y < h; y++) {
      if (alpha[(y * w + x) * 4 + 3] > 64) return true;
    }
    return false;
  };
  let left = 0;
  while (left < w && !columnHasInk(left)) left++;
  let right = w - 1;
  while (right > left && !columnHasInk(right)) right--;
  return { left: left - pad, right: right + 1 - pad };
};

const layoutLine = (
  rawText: string,
  fit: { width: number; maxFont: number },
): FittedLine => {
  const text = rawText.toUpperCase();
  const fitted = fitText({
    text,
    withinWidth: fit.width,
    fontFamily: FONT.family,
    fontWeight: FONT.weight,
  }).fontSize;
  const fontSize = Math.max(2, Math.floor(Math.min(fitted, fit.maxFont) / 2) * 2);
  const measure = (s: string) =>
    measureText({
      text: s,
      fontFamily: FONT.family,
      fontWeight: FONT.weight,
      fontSize,
    }).width;

  const words: Word[] = [];
  let cursor = 0;
  for (const wordText of text.split(" ")) {
    if (wordText.length > 0) {
      const glyphs: Glyph[] = [];
      for (let k = 0; k < wordText.length; k++) {
        const char = wordText[k];
        const w = measure(char);
        // Position from the *kerned* prefix, so splitting the line into letters doesn't move anything.
        const x = measure(text.slice(0, cursor + k + 1)) - w;
        glyphs.push({ char, x, w });
      }
      const first = glyphs[0];
      const last = glyphs[glyphs.length - 1];
      words.push({
        text: wordText,
        x: first.x,
        w: last.x + last.w - first.x,
        glyphs,
      });
    }
    cursor += wordText.length + 1;
  }

  const width = measure(text);
  const ink = measureInk(text, fontSize, width);

  return {
    text,
    fontSize,
    width,
    inkShift: (ink.left + ink.right) / 2 - width / 2,
    capHeight: FONT.capHeightEm * fontSize,
    words,
  };
};

const computeLayout = (copy: Copy): TypeLayout => ({
  stop: layoutLine(copy.stop, FIT.stop),
  reveal: layoutLine(copy.reveal, FIT.reveal),
  lines: copy.lines.map((l) => layoutLine(l, FIT.line)),
  brand: layoutLine(copy.brand, FIT.brand),
});

/**
 * Loads Anton, then measures/fits all copy. Returns null until the font is ready.
 * Holds the render (delayRender) until the measured layout is actually on screen.
 */
export const useTypeLayout = (copy: Copy): TypeLayout | null => {
  const [handle] = useState(() => delayRender("Loading Anton and fitting type"));
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let alive = true;
    waitUntilDone().then(
      () => {
        if (alive) setFontReady(true);
      },
      (err: unknown) => cancelRender(err),
    );
    return () => {
      alive = false;
    };
  }, []);

  const key = [copy.stop, copy.reveal, copy.brand, ...copy.lines].join("\u0000");
  const layout = useMemo(
    () => (fontReady ? computeLayout(copy) : null),
    // `key` captures every string in `copy`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fontReady, key],
  );

  // Release the render only after the commit that contains the measured layout.
  useEffect(() => {
    if (layout !== null) continueRender(handle);
  }, [layout, handle]);

  return layout;
};

/** Where a line sits when its ink is centred on the canvas and its cap-centre is at `capCenterY`. `top` is whole pixels. */
export const placeLine = (line: FittedLine, capCenterY: number) => {
  const toCapCenter = Math.round(CAP_CENTER_EM * line.fontSize);
  return {
    left: (WIDTH - line.width) / 2 - line.inkShift,
    top: Math.round(capCenterY) - toCapCenter,
    toCapCenter,
  };
};

/** Base CSS for a text node that sits inside a `placeLine` box. */
export const textStyle = (line: FittedLine, color: string): CSSProperties => ({
  position: "absolute",
  margin: 0,
  fontFamily: FONT.family,
  fontWeight: FONT.weight,
  fontSize: line.fontSize,
  lineHeight: 1,
  whiteSpace: "pre",
  color,
});
