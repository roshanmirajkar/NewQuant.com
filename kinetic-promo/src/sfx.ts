import { T } from "./timing";

/**
 * Sound design cue sheet. Frame numbers are composition frames at 30fps.
 *
 * The files in public/sfx/ are synthesised placeholders (scripts/generate-sfx.mjs).
 * TODO(sound): replace any of them with a production asset by dropping a file with the
 * same name into public/sfx/. Nothing else needs to change.
 */
export type SfxCue = {
  /** File inside public/sfx/. */
  file: string;
  frame: number;
  volume: number;
  label: string;
};

export const sfxCues = (): SfxCue[] => {
  const lineCues = [0, 1, 2].flatMap((i): SfxCue[] => {
    const start = T.linesStart + i * T.lineStagger;
    return [
      { file: "whoosh-line.wav", frame: start - 1, volume: 0.55, label: `line ${i + 1} whoosh` },
      { file: "tick.wav", frame: start + 9, volume: 0.5, label: `line ${i + 1} lands` },
    ];
  });

  return [
    // TODO(sound): riser-in.wav -> short rushing riser that peaks on the slam
    { file: "riser-in.wav", frame: 0, volume: 0.6, label: "slam riser" },
    // TODO(sound): hit-slam.wav -> big low impact, lands on frame 7
    { file: "hit-slam.wav", frame: T.slamImpact, volume: 1, label: "STOP slam" },
    // TODO(sound): whoosh-split.wav -> whoosh + crack as STOP splits
    { file: "whoosh-split.wav", frame: T.splitStart - 2, volume: 0.8, label: "split" },
    // TODO(sound): whoosh-line.wav + tick.wav -> one pair per stacked line
    ...lineCues,
    // TODO(sound): explosion.wav -> debris burst when the letters let go
    { file: "explosion.wav", frame: T.explodeStart, volume: 0.95, label: "letters explode" },
    // TODO(sound): whoosh-wipe.wav -> swelling sweep under the lime circle
    { file: "whoosh-wipe.wav", frame: T.wipeStart, volume: 0.8, label: "circle wipe" },
    // TODO(sound): hit-brand.wav -> warm thump + chime as the brand fades up
    { file: "hit-brand.wav", frame: T.brandIn, volume: 0.75, label: "brand lands" },
    // TODO(sound): flash-zap.wav -> bright zap on the white flash
    { file: "flash-zap.wav", frame: T.end - T.flashFrames, volume: 0.7, label: "flash cut" },
  ];
};
