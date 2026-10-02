import { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { FontGate } from "./lib/FontGate";
import { computeLayout } from "./lib/layout";
import { cameraShake } from "./lib/shake";
import { Flash } from "./overlays/Flash";
import { Grain } from "./overlays/Grain";
import type { KineticPromoProps } from "./props";
import { LimeWipe } from "./scenes/LimeWipe";
import { StackedLines } from "./scenes/StackedLines";
import { StopSplit } from "./scenes/StopSplit";
import { SoundDesign } from "./SoundDesign";
import { DURATION_IN_FRAMES, SCENES } from "./timeline";

/**
 * Layer order, bottom to top:
 *   canvas colour -> camera (shaken) { scenes } -> grain -> flash, plus the audio slots.
 * The grain and flash sit outside the camera: they belong to the lens/film, so
 * they must not shake with the scene.
 */
const Promo: React.FC<KineticPromoProps> = ({
  copy,
  colors,
  grainOpacity,
  grainSize,
  sfxVolume,
}) => {
  const frame = useCurrentFrame();
  const layout = useMemo(() => computeLayout(copy), [copy]);
  const shake = cameraShake(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <AbsoluteFill style={{ translate: `${shake.x}px ${shake.y}px` }}>
        <Sequence
          name="Scenes 1-2 / STOP slam + split"
          durationInFrames={SCENES.split.to}
        >
          <StopSplit
            stop={copy.stop.toUpperCase()}
            scrolling={copy.scrolling.toUpperCase()}
            stopFontSize={layout.stopFontSize}
            scrollingFontSize={layout.scrollingFontSize}
            colors={colors}
          />
        </Sequence>

        <Sequence
          name="Scenes 3-4 / lines + explosion"
          from={SCENES.lines.from}
          durationInFrames={SCENES.explode.to - SCENES.lines.from}
        >
          <StackedLines layout={layout} colors={colors} />
        </Sequence>

        <Sequence
          name="Scenes 5-6 / lime wipe + hold"
          from={SCENES.wipe.from}
          durationInFrames={DURATION_IN_FRAMES - SCENES.wipe.from}
        >
          <LimeWipe
            brand={copy.brand.toUpperCase()}
            brandFontSize={layout.brandFontSize}
            colors={colors}
          />
        </Sequence>
      </AbsoluteFill>

      <Grain opacity={grainOpacity} size={grainSize} />
      <Flash color={colors.flash} />
      <SoundDesign volume={sfxVolume} lineCount={copy.lines.length} />
    </AbsoluteFill>
  );
};

export const KineticPromo: React.FC<KineticPromoProps> = (props) => (
  <FontGate>
    <Promo {...props} />
  </FontGate>
);
