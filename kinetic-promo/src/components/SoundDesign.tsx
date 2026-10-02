import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { SFX_CUES } from "../sfx";

/** One <Audio> slot per cue in src/sfx.ts, each starting on its frame. */
export const SoundDesign: React.FC<{ enabled: boolean; volume: number }> = ({
  enabled,
  volume,
}) => {
  if (!enabled) return null;

  return (
    <>
      {SFX_CUES.map((cue) => (
        <Audio
          key={`${cue.file}@${cue.at}`}
          src={staticFile(`sfx/${cue.file}`)}
          from={cue.at}
          volume={Math.min(1, cue.volume * volume)}
        />
      ))}
    </>
  );
};
