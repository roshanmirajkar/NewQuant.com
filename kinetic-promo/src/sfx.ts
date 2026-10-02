/**
 * Sound-design slots. Every cue is one `<Audio>` placed by frame (30 fps → frame / 30 = seconds).
 *
 * The WAVs in public/sfx/ are synthesised by `npm run sfx` (scripts/generate-sfx.mjs), so the
 * project renders with a punchy track out of the box.
 *
 * TODO(sound): swap in your own licensed / recorded hits and whooshes. Drop files with the SAME
 *   NAMES into public/sfx/ (or change `file` below). Nothing else needs to change; cue timing is
 *   by frame. Turn everything off with `audio.enabled: false` in the props.
 */
export type SfxCue = {
  /** File in public/sfx/. */
  file: string;
  /** Frame the sound starts on. */
  at: number;
  /** 0 – 1, before the master `audio.volume`. */
  volume: number;
  /** What the sound is for. */
  note: string;
};

export const SFX_CUES: readonly SfxCue[] = [
  // TODO(sound): public/sfx/whoosh-in.wav — suck-in that peaks as STOP lands (frame 7)
  { file: "whoosh-in.wav", at: 0, volume: 0.7, note: "STOP flies in" },
  // TODO(sound): public/sfx/hit.wav — deep impact for the slam
  { file: "hit.wav", at: 7, volume: 1, note: "STOP lands (scale 1 = impact, camera shake)" },
  // TODO(sound): public/sfx/whoosh.wav — big whoosh for the split
  { file: "whoosh.wav", at: 45, volume: 0.75, note: "STOP splits" },
  // Lighter reuse of the hit as SCROLLING becomes fully visible.
  { file: "hit.wav", at: 51, volume: 0.38, note: "SCROLLING revealed" },
  // TODO(sound): public/sfx/swish.wav — short swish; used for the shutter + each stacked line
  { file: "swish.wav", at: 82, volume: 0.5, note: "SCROLLING slot shuts" },
  { file: "swish.wav", at: 90, volume: 0.75, note: "line 1 slides in" },
  { file: "swish.wav", at: 98, volume: 0.75, note: "line 2 slides in" },
  { file: "swish.wav", at: 106, volume: 0.75, note: "line 3 slides in" },
  // TODO(sound): public/sfx/explode.wav — blast + falling debris
  { file: "explode.wav", at: 180, volume: 1, note: "words explode into letters" },
  // TODO(sound): public/sfx/riser.wav — rising sweep into the lime flood. It is 27 frames long and
  // is placed so it ends exactly where brand.wav begins (259 + 27 = 286): the two loudest peaks
  // never stack, which would clip.
  { file: "riser.wav", at: 259, volume: 0.8, note: "iris wipe builds" },
  // TODO(sound): public/sfx/brand.wav — thump + chime as the end card lands
  { file: "brand.wav", at: 286, volume: 0.95, note: "end card lands" },
  // TODO(sound): public/sfx/flash.wav — bright zap on the white-flash cut (exactly 6 frames long,
  // so it finishes on the last frame of the video)
  { file: "flash.wav", at: 354, volume: 0.8, note: "6-frame white flash" },
];
