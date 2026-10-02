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
Config.setOverwriteOutput(true);
