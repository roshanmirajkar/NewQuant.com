import React from "react";
import { CAP_HEIGHT, CAP_TOP, TEXT_BASE_STYLE } from "../font";

/**
 * Single line of caps in a box that is exactly one cap-height tall, so the
 * visible glyphs fill the box edge to edge. Centring the box centres the
 * letters (not the font's line box), and a 50% clip lands on the middle of
 * the letters.
 */
export const CapText: React.FC<{
  text: string;
  fontSize: number;
  color: string;
}> = ({ text, fontSize, color }) => {
  return (
    <div style={{ height: CAP_HEIGHT * fontSize }}>
      <div
        style={{
          ...TEXT_BASE_STYLE,
          fontSize,
          height: fontSize,
          // position, not margin: a negative margin-top would collapse through
          // the parent and shift the whole cap-box instead of the text in it.
          position: "relative",
          top: -CAP_TOP * fontSize,
          color,
        }}
      >
        {text}
      </div>
    </div>
  );
};
