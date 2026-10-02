import { loadFont } from "@remotion/google-fonts/Anton";
import { fitText } from "@remotion/layout-utils";
import React, { useEffect, useMemo, useState } from "react";
import { useDelayRender } from "remotion";
import type { KineticPromoProps } from "./props";
import { DRIFT_FIT_WIDTH, FIT_WIDTH } from "./timeline";

// Anton: tall, condensed, heavy. Remotion blocks rendering until it has loaded.
export const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

/**
 * Trims a text box to exactly cap-height -> baseline. The box edges ARE the
 * visible letter edges, so centering, 50% split lines and clip masks are exact
 * instead of depending on the font's ascent/descent padding.
 */
export const CAP_BOX: React.CSSProperties = {
  textBox: "trim-both cap alphabetic",
};

export const baseText: React.CSSProperties = {
  fontFamily,
  fontWeight: 400,
  lineHeight: 1,
  whiteSpace: "pre",
  textTransform: "uppercase",
  ...CAP_BOX,
};

/** Single-line display word (used for STOP, SCROLLING and the brand). */
export const Word: React.FC<{
  text: string;
  fontSize: number;
  color: string;
  style?: React.CSSProperties;
}> = ({ text, fontSize, color, style }) => (
  <div style={{ ...baseText, fontSize, color, ...style }}>{text}</div>
);

export type FittedSizes = {
  hook: number;
  reveal: number;
  stack: number[];
  brand: number;
};

/**
 * Finds the font size that fills each piece of copy to the safe width, so any
 * reskinned copy fits without overflow. Waits for Anton before measuring.
 * Returns null (and holds the frame via delayRender) until ready.
 */
export const useFittedSizes = (
  copy: KineticPromoProps["copy"],
): FittedSizes | null => {
  const { delayRender, continueRender } = useDelayRender();
  const [fontReady, setFontReady] = useState(false);
  const [handle] = useState(() => delayRender("Waiting for Anton to load"));

  useEffect(() => {
    waitUntilDone().then(() => {
      setFontReady(true);
      continueRender(handle);
    });
  }, [continueRender, handle]);

  const copyKey = JSON.stringify(copy);

  return useMemo(() => {
    if (!fontReady) {
      return null;
    }

    const fit = (text: string, withinWidth: number) =>
      fitText({
        text,
        withinWidth,
        fontFamily,
        fontWeight: 400,
        textTransform: "uppercase",
        validateFontIsLoaded: true,
      }).fontSize;

    return {
      hook: fit(copy.hook, FIT_WIDTH),
      reveal: fit(copy.reveal, FIT_WIDTH),
      stack: copy.stack.map((line) => fit(line, DRIFT_FIT_WIDTH)),
      brand: fit(copy.brand, DRIFT_FIT_WIDTH),
    };
    // copyKey covers every field of `copy`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontReady, copyKey]);
};
