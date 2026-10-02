/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
// Frames are JPEG intermediates; max quality so the grain and flat lime survive the crf-18 encode.
Config.setJpegQuality(100);
// Standard yuv420p / tv-range / BT.709 tagging; without it the file is tagged
// full-range BT.470BG, which some social platforms render with crushed blacks.
Config.setColorSpace("bt709");
Config.setOverwriteOutput(true);
