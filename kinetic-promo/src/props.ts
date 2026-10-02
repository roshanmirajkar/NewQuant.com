import { zColor } from "@remotion/zod-types";
import { z } from "zod";

/**
 * Everything you need to reskin the video lives in this one typed object:
 * all copy, all colours, plus the two global intensity knobs.
 *
 * It is registered on the composition with a zod schema, so Remotion Studio
 * shows it as an editable form (with colour pickers), and you can override it
 * from the CLI:  npx remotion render ... --props='{"copy":{"brand":"ACME"}}'
 *
 * Copy is upper-cased and auto-fitted to the safe area, so longer or shorter
 * text keeps working without touching any layout code.
 */
export const kineticPromoSchema = z.object({
  copy: z.object({
    /** Scene 1: the word that slams in, then splits in two. */
    stop: z.string(),
    /** Scene 2: the word revealed in the gap (accent colour). */
    scrolling: z.string(),
    /** Scene 3: lines that stack one at a time (1-5 lines; 3 is the design). */
    lines: z.array(z.string()).min(1).max(5),
    /** Scene 5: the closing end card. */
    brand: z.string(),
  }),
  colors: z.object({
    /** Canvas colour for scenes 1-4. */
    background: zColor(),
    /** STOP and the odd lines. */
    text: zColor(),
    /** SCROLLING, the even lines (2nd, 4th) and the circular wipe. */
    accent: zColor(),
    /** Text colour on top of the accent wipe (the brand line). */
    onAccent: zColor(),
    /** The closing flash. */
    flash: zColor(),
  }),
  /**
   * Grain strength; 0 disables it. The grain is nearly all of the file size
   * (~38 MB at 0.055, ~128 MB at 0.12, 1.4 MB with none), so keep it subtle.
   */
  grainOpacity: z.number().min(0).max(1),
  /** Grain coarseness: 1 = pixel-fine, 2.5 = soft 2-3 px specks (more visible per byte). */
  grainSize: z.number().min(0.5).max(6),
  /** Master volume for the whole sound-design track (0 mutes it). */
  sfxVolume: z.number().min(0).max(1),
});

export type KineticPromoProps = z.infer<typeof kineticPromoSchema>;
export type Colors = KineticPromoProps["colors"];
export type Copy = KineticPromoProps["copy"];

export const defaultProps: KineticPromoProps = {
  copy: {
    stop: "STOP",
    scrolling: "SCROLLING",
    lines: ["THIS IS", "WHAT MOTION", "LOOKS LIKE"],
    brand: "YOUR BRAND",
  },
  colors: {
    background: "#000000",
    text: "#FFFFFF",
    accent: "#C6FF00",
    onAccent: "#000000",
    flash: "#FFFFFF",
  },
  grainOpacity: 0.055,
  grainSize: 2.5,
  sfxVolume: 1,
};
