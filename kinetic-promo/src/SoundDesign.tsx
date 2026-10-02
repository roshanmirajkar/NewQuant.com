import { Audio } from "@remotion/media";
import React from "react";
import { Sequence, staticFile } from "remotion";
import type { KineticPromoProps } from "./props";
import { T } from "./timeline";

type Cue = {
  /** Which entry of `audio.files` to play. */
  file: keyof KineticPromoProps["audio"]["files"];
  /** Global start frame. */
  from: number;
  volume: number;
  playbackRate?: number;
};

/**
 * Every sound is pinned to the frame of the visual it belongs to. Filenames
 * come from props (public/sfx/*), so replacing a sound is just a file swap.
 */
const buildCues = (lineCount: number): Cue[] => [
  { file: "whooshIn", from: 0, volume: 0.7 }, // STOP flies in (0-7f)
  { file: "hit", from: T.slamImpact, volume: 1 }, // STOP lands
  { file: "split", from: T.split, volume: 0.9 }, // STOP splits open
  // one swipe per stacked line, pitched up a little each time
  ...Array.from({ length: lineCount }, (_, i): Cue => ({
    file: "line",
    from: T.stack + i * 8,
    volume: 0.7,
    playbackRate: 1 + i * 0.12,
  })),
  { file: "riser", from: T.explode - 30, volume: 0.6 }, // 1s build into the explosion
  { file: "explode", from: T.explode, volume: 1 }, // letters blow apart
  { file: "wipe", from: T.wipe, volume: 0.8 }, // circular wipe
  { file: "brand", from: T.wipe + 14, volume: 0.8 }, // brand lands
  { file: "flash", from: T.flash, volume: 0.9 }, // flash cut
];

export const SoundDesign: React.FC<{
  audio: KineticPromoProps["audio"];
  lineCount: number;
}> = ({ audio, lineCount }) => (
  <>
    {buildCues(lineCount).map((cue, i) => (
      <Sequence key={i} from={cue.from} layout="none">
        <Audio
          src={staticFile(audio.files[cue.file])}
          volume={cue.volume * audio.volume}
          playbackRate={cue.playbackRate}
        />
      </Sequence>
    ))}
  </>
);
