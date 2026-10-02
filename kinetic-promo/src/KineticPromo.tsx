import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Flash } from "./components/Flash";
import { Grain } from "./components/Grain";
import { SoundDesign } from "./components/SoundDesign";
import { cameraShake, findImpactFrame } from "./lib/anim";
import { useTypeLayout } from "./lib/typography";
import type { KineticPromoProps } from "./props";
import { LimeWipe } from "./scenes/LimeWipe";
import { OpeningScenes } from "./scenes/OpeningScenes";
import { PhraseStack } from "./scenes/PhraseStack";

/**
 * 12-second kinetic-type promo. Layer order (back → front):
 *   canvas colour · camera (STOP/SCROLLING, phrase stack + letters, lime iris + end card)
 *   · film grain · white flash · sound design (no pixels)
 * Only the camera layer shakes, so the grain stays glued to the "film".
 */
export const KineticPromo: React.FC<KineticPromoProps> = ({
  copy,
  colors,
  grain,
  audio,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useTypeLayout(copy);

  const impactFrame = useMemo(() => findImpactFrame(fps), [fps]);
  const shake = cameraShake(frame, impactFrame);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, overflow: "hidden" }}>
      {layout ? (
        <AbsoluteFill style={{ translate: `${shake.x}px ${shake.y}px` }}>
          <OpeningScenes layout={layout} colors={colors} />
          <PhraseStack layout={layout} colors={colors} />
          <LimeWipe layout={layout} colors={colors} />
        </AbsoluteFill>
      ) : null}
      <Grain opacity={grain.opacity} size={grain.size} loop={grain.loop} />
      <Flash color={colors.flash} />
      <SoundDesign enabled={audio.enabled} volume={audio.volume} />
    </AbsoluteFill>
  );
};
