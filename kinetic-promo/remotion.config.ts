/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
// Lossless intermediate frames. The default (JPEG) smears the saturated lime/black edges
// with chroma fringing and softens the film grain before h264 ever sees it.
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
// Tag the output as Rec.709 so players show #C6FF00 as lime instead of a shifted green.
Config.setColorSpace("bt709");
