import { loadFont } from "@remotion/google-fonts/Anton";

// Anton: tall, condensed, all-caps-friendly display face. Only weight 400 exists.
const anton = loadFont("normal", { weights: ["400"], subsets: ["latin"] });

export const fontFamily = anton.fontFamily;
export const waitForFont = anton.waitUntilDone;
