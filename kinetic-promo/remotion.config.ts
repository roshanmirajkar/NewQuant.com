/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
// Lossless intermediate frames: fine film grain and hard lime/black edges would
// be smeared by JPEG (and its chroma subsampling) before x264 even sees them.
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
