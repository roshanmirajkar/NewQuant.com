import { fitText, measureText } from "@remotion/layout-utils";
import { useEffect, useRef, useState } from "react";
import { useDelayRender } from "remotion";
import { fontFamily, waitForFont } from "./font";
import type { KineticPromoProps } from "./props";

/** Widest a text block may be. Leaves >=75px side margins even after the 4-5% push-ins and the slam overshoot. */
export const SAFE_WIDTH = {
  hook: 880,
  reveal: 880,
  lines: 880,
  brand: 880,
} as const;

/** Caps so a very short reskinned word does not become absurdly large. */
export const MAX_FONT_SIZE = {
  hook: 640,
  reveal: 420,
  lines: 400,
  brand: 380,
} as const;

/** Space between words in a line, in em. Letters are laid out one by one, so this is explicit. */
export const WORD_GAP_EM = 0.2;
/** Visible gap between stacked lines, in px (boxes are trimmed to cap height). */
export const LINE_GAP_PX = 72;

export type TextLayout = {
  hookSize: number;
  revealSize: number;
  brandSize: number;
  lineSizes: number[];
  /** Cap height of the face as a fraction of font size (measured, not guessed). */
  capRatio: number;
};

const advanceWidth = (text: string, fontSize: number) =>
  measureText({ text, fontFamily, fontSize, validateFontIsLoaded: true }).width;

/** Width of a line, in em, when laid out letter by letter with WORD_GAP_EM between words. */
const letterByLetterWidthEm = (text: string) => {
  const words = text.split(" ").filter((w) => w.length > 0);
  let em = (words.length - 1) * WORD_GAP_EM;
  for (const word of words) {
    for (const ch of word) em += advanceWidth(ch, 100) / 100;
  }
  return em;
};

const capHeightRatio = () => {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return 0.73;
  ctx.font = `1000px ${fontFamily}`;
  const m = ctx.measureText("H");
  return (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 1000;
};

export const measureLayout = (copy: KineticPromoProps["copy"]): TextLayout => {
  const fitWhole = (text: string, width: number, max: number) =>
    Math.min(max, fitText({ text, withinWidth: width, fontFamily, validateFontIsLoaded: true }).fontSize);

  return {
    hookSize: fitWhole(copy.hook, SAFE_WIDTH.hook, MAX_FONT_SIZE.hook),
    revealSize: fitWhole(copy.reveal, SAFE_WIDTH.reveal, MAX_FONT_SIZE.reveal),
    brandSize: fitWhole(copy.brand, SAFE_WIDTH.brand, MAX_FONT_SIZE.brand),
    lineSizes: copy.lines.map((line) =>
      Math.min(MAX_FONT_SIZE.lines, SAFE_WIDTH.lines / letterByLetterWidthEm(line)),
    ),
    capRatio: capHeightRatio(),
  };
};

/**
 * Measures every piece of copy once the font has loaded and holds the render until then.
 * Returns null until ready, so scenes never paint with a fallback font.
 */
export const useTextLayout = (copy: KineticPromoProps["copy"]): TextLayout | null => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Measuring text with Anton"));
  const [layout, setLayout] = useState<TextLayout | null>(null);
  const released = useRef(false);
  const key = JSON.stringify(copy);

  useEffect(() => {
    let cancelled = false;
    waitForFont()
      .then(() => {
        if (cancelled) return;
        setLayout(measureLayout(JSON.parse(key) as KineticPromoProps["copy"]));
        if (!released.current) {
          released.current = true;
          continueRender(handle);
        }
      })
      .catch((err) => cancelRender(err));
    return () => {
      cancelled = true;
    };
  }, [key, handle, continueRender, cancelRender]);

  return layout;
};
