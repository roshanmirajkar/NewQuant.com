import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { sfxCues } from "../sfx";

export const SoundDesign: React.FC<{ enabled: boolean; volume: number }> = ({ enabled, volume }) => {
  if (!enabled) return null;
  return (
    <>
      {sfxCues().map((cue) => (
        <Audio
          key={`${cue.frame}-${cue.file}`}
          src={staticFile(`sfx/${cue.file}`)}
          from={cue.frame}
          volume={cue.volume * volume}
        />
      ))}
    </>
  );
};
