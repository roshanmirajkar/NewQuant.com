import { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { fontFamily, waitUntilDone } from "../font";
import type { KineticPromoProps } from "../props";

export type FittedSizes = {
  hook: number;
  reveal: number;
  stack: readonly [number, number, number];
  brand: number;
};

const FALLBACK: FittedSizes = {
  hook: 100,
  reveal: 100,
  stack: [100, 100, 100],
  brand: 100,
};

const fit = (text: string, withinWidth: number, max = Infinity): number =>
  Math.floor(
    Math.min(
      max,
      fitText({
        text,
        withinWidth,
        fontFamily,
        fontWeight: 400,
        additionalStyles: { fontKerning: "none" },
        validateFontIsLoaded: true,
      }).fontSize,
    ),
  );

/**
 * Font size (px) at which each piece of copy exactly fills `maxTextWidth`.
 *
 * The frame is held (delayRender) until Anton has loaded and the measurement
 * has been committed, so no frame is ever captured with fallback-font sizes.
 */
export const useFittedSizes = (
  copy: KineticPromoProps["copy"],
  layout: KineticPromoProps["layout"],
): FittedSizes => {
  const [handle] = useState(() => delayRender("Loading Anton + fitting text"));
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    waitUntilDone().then(() => setFontReady(true));
  }, []);

  const { hook, reveal, brand } = copy;
  const [s0, s1, s2] = copy.stack;
  const { maxTextWidth, maxStackFontSize } = layout;

  const sizes = useMemo<FittedSizes>(() => {
    if (!fontReady) {
      return FALLBACK;
    }
    return {
      hook: fit(hook.toUpperCase(), maxTextWidth),
      reveal: fit(reveal.toUpperCase(), maxTextWidth),
      stack: [
        fit(s0.toUpperCase(), maxTextWidth, maxStackFontSize),
        fit(s1.toUpperCase(), maxTextWidth, maxStackFontSize),
        fit(s2.toUpperCase(), maxTextWidth, maxStackFontSize),
      ],
      brand: fit(brand.toUpperCase(), maxTextWidth),
    };
  }, [fontReady, hook, reveal, brand, s0, s1, s2, maxTextWidth, maxStackFontSize]);

  // Release the render hold only after the measured sizes have been committed.
  useEffect(() => {
    if (fontReady) {
      continueRender(handle);
    }
  }, [fontReady, sizes, handle]);

  return sizes;
};
