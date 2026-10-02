import { IMPACT_FRAME, T } from "./timeline";

/**
 * Sound-design cue sheet. Each cue is an <Audio> slot on the timeline.
 *
 * The files in public/sfx/ are synthesised placeholders produced by
 * `npm run sfx` (scripts/generate-sfx.mjs), so the video has a real mix out of
 * the box. To use licensed samples instead, drop a file with the SAME NAME into
 * public/sfx/ (or change `file` here). Re-running `npm run sfx` will overwrite
 * the placeholders, so remove a cue's entry from the script once you've swapped it.
 */
export type SfxCue = {
  id: string;
  /** Path inside public/. */
  file: string;
  /** Global frame the file starts playing on. */
  frame: number;
  /** 0..1, multiplied by `audio.masterVolume`. */
  volume: number;
  /** What the sound should do, for whoever replaces it. */
  todo: string;
};

export const SFX_CUES: readonly SfxCue[] = [
  {
    id: "slam-whoosh",
    file: "sfx/01_slam-whoosh.wav",
    // The placeholder crests 6 frames (0.2s) into the file; starting it 7 frames
    // before impact makes it crest one frame ahead of the hit, not on top of it.
    frame: Math.max(0, IMPACT_FRAME - 7),
    volume: 0.5,
    todo: "TODO swap: fast rising whoosh that crests ~1 frame BEFORE IMPACT_FRAME and is gone by it.",
  },
  {
    id: "slam-hit",
    file: "sfx/02_slam-hit.wav",
    frame: IMPACT_FRAME,
    volume: 0.85,
    todo: "TODO swap: heavy sub-boom impact. Transient on its first sample.",
  },
  {
    id: "split",
    file: "sfx/03_split-zip.wav",
    frame: T.split,
    volume: 0.7,
    todo: "TODO swap: crack + zip as STOP tears open (45f).",
  },
  {
    id: "line-1",
    file: "sfx/04_line-whoosh-thud.wav",
    frame: T.stack,
    volume: 0.6,
    todo: "TODO swap: short side whoosh ending in a soft thud (line 1, 90f).",
  },
  {
    id: "line-2",
    file: "sfx/04_line-whoosh-thud.wav",
    frame: T.stack + 8,
    volume: 0.6,
    todo: "Same file as line-1, 8f later.",
  },
  {
    id: "line-3",
    file: "sfx/04_line-whoosh-thud.wav",
    frame: T.stack + 16,
    volume: 0.6,
    todo: "Same file as line-1, 16f later.",
  },
  {
    id: "explode",
    file: "sfx/05_explode-debris.wav",
    frame: T.explode,
    volume: 0.85,
    todo: "TODO swap: burst + debris + falling tail, ~1.8s (180f).",
  },
  {
    id: "wipe-riser",
    file: "sfx/06_wipe-riser.wav",
    frame: T.wipe + 18 - 27,
    volume: 0.6,
    todo: "TODO swap: ~0.9s riser that peaks exactly on the brand-hit cue (288f).",
  },
  {
    id: "brand-hit",
    file: "sfx/07_brand-hit.wav",
    frame: T.wipe + 18,
    volume: 0.8,
    todo: "TODO swap: soft boom + bright chime as the sign-off lands (288f).",
  },
  {
    id: "flash",
    file: "sfx/08_flash-cut.wav",
    frame: T.flash,
    volume: 0.7,
    todo: "TODO swap: shutter / white-noise burst under the 6-frame flash (354f).",
  },
];
