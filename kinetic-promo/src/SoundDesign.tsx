import { Audio } from "@remotion/media";
import { staticFile } from "remotion";
import { IMPACT_FRAME } from "./lib/slam";
import {
  DURATION_IN_FRAMES,
  FLASH_FRAMES,
  LINE_STAGGER,
  SCENES,
} from "./timeline";

/**
 * Sound-design track: one <Audio> slot per beat of the storyboard.
 *
 * TODO(sound): the .wav files in public/sfx/ are placeholders synthesised by
 * `npm run sfx` (scripts/generate-sfx.mjs). To use premium or stock SFX, drop a
 * file with the SAME FILENAME into public/sfx/ (any length, wav or mp3 renamed
 * accordingly in this map) and the cue keeps its timing. Quick free sources:
 * https://remotion.media/whoosh.wav, whip.wav, vine-boom.wav (see @remotion/sfx).
 */
export const SFX = {
  /** TODO: rising zoom-in whoosh (STOP flying at the camera, and the lime wipe). */
  whooshIn: "sfx/whoosh-in.wav",
  /** TODO: big low impact (STOP landing, the lime wipe landing). */
  hitHeavy: "sfx/hit-heavy.wav",
  /** TODO: crack + two opposing sweeps (STOP splitting open). */
  split: "sfx/split.wav",
  /** TODO: whoosh panned left -> right (line slides in from the left). */
  whooshLeft: "sfx/whoosh-left.wav",
  /** TODO: whoosh panned right -> left (line slides in from the right). */
  whooshRight: "sfx/whoosh-right.wav",
  /** TODO: short light snap (a line locking into place, the brand landing). */
  tick: "sfx/tick.wav",
  /** TODO: explosion burst + rumble (words exploding into letters). */
  explosion: "sfx/explosion.wav",
  /** TODO: ~0.9 s rising swell that ends exactly at the beat (explosion, wipe, closing flash). */
  riser: "sfx/riser.wav",
  /** TODO: bright crack + shimmer (the closing white flash). */
  flash: "sfx/flash.wav",
} as const;

/** The riser is 0.9 s long; it is started this many frames before its beat. */
const RISER_FRAMES = 27;

/**
 * Master trim on every cue (-6 dB). The cues overlap (whoosh + hit on the slam,
 * hit + riser tail on the wipe), and at full scale their sum clips by +3.5 dB.
 * At 0.5 the mix peaks near -2.5 dBFS and lands around -15 LUFS integrated,
 * a normal level for social video. `sfxVolume` in the props sits on top of this.
 */
const MIX_TRIM = 0.5;

type Cue = { at: number; file: (typeof SFX)[keyof typeof SFX]; volume: number };

const buildCues = (lineCount: number): Cue[] => {
  const cues: Cue[] = [
    // Scene 1: zoom whoosh, then the hit on the exact frame of impact (= shake).
    { at: 0, file: SFX.whooshIn, volume: 0.7 },
    { at: IMPACT_FRAME, file: SFX.hitHeavy, volume: 1 },
    // Scene 2: split.
    { at: SCENES.split.from, file: SFX.split, volume: 0.85 },
  ];

  // Scene 3: a whoosh as each line starts (panned with its direction),
  // and a snap as it locks into place.
  for (let i = 0; i < lineCount; i++) {
    const at = SCENES.lines.from + i * LINE_STAGGER;
    cues.push({
      at,
      file: i % 2 === 0 ? SFX.whooshLeft : SFX.whooshRight,
      volume: 0.7,
    });
    cues.push({ at: at + 8, file: SFX.tick, volume: 0.55 });
  }

  cues.push(
    // Scene 4: a riser that ends on the beat, then the explosion itself.
    { at: SCENES.explode.from - RISER_FRAMES, file: SFX.riser, volume: 0.55 },
    { at: SCENES.explode.from, file: SFX.explosion, volume: 1 },
    // Scene 5: riser into the wipe, impact + expanding sweep on it, soft tick on the brand.
    { at: SCENES.wipe.from - RISER_FRAMES, file: SFX.riser, volume: 0.75 },
    { at: SCENES.wipe.from, file: SFX.hitHeavy, volume: 0.9 },
    { at: SCENES.wipe.from, file: SFX.whooshIn, volume: 0.5 },
    { at: SCENES.wipe.from + 16, file: SFX.tick, volume: 0.4 },
    // Scene 6: riser into the flash, crack on the flash.
    {
      at: DURATION_IN_FRAMES - FLASH_FRAMES - RISER_FRAMES,
      file: SFX.riser,
      volume: 0.55,
    },
    { at: DURATION_IN_FRAMES - FLASH_FRAMES, file: SFX.flash, volume: 0.85 },
  );

  return cues;
};

export const SoundDesign: React.FC<{ volume: number; lineCount: number }> = ({
  volume,
  lineCount,
}) => {
  if (volume <= 0) return null;

  return (
    <>
      {buildCues(lineCount).map((cue, i) => (
        <Audio
          key={i}
          src={staticFile(cue.file)}
          from={cue.at}
          volume={cue.volume * MIX_TRIM * volume}
        />
      ))}
    </>
  );
};
