import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { SFX_CUES } from "../sfx";

export const SfxTrack: React.FC<{ masterVolume: number }> = ({
  masterVolume,
}) => {
  return (
    <>
      {SFX_CUES.map((cue) => (
        <Sequence key={cue.id} name={`sfx: ${cue.id}`} from={cue.frame} layout="none">
          <Audio src={staticFile(cue.file)} volume={cue.volume * masterVolume} />
        </Sequence>
      ))}
    </>
  );
};
