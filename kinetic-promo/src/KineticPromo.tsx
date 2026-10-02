import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Grain } from "./components/Grain";
import { SoundDesign } from "./components/SoundDesign";
import { useTextLayout } from "./layout";
import type { KineticPromoProps } from "./props";
import { seededRandom, mixSeed } from "./random";
import { BrandScene } from "./scenes/BrandScene";
import { LineStackScene } from "./scenes/LineStackScene";
import { StopScene } from "./scenes/StopScene";
import { FLASH_START, T } from "./timing";

export const KineticPromo: React.FC<KineticPromoProps> = ({ copy, colors, effects, sound }) => {
  const frame = useCurrentFrame();
  const layout = useTextLayout(copy);

  // Camera shake: random +-6px translate that decays linearly over 10 frames from the slam impact.
  const sinceImpact = frame - T.slamImpact;
  const shakeAmp =
    sinceImpact < 0
      ? 0
      : interpolate(sinceImpact, [0, T.shakeFrames], [T.shakeAmplitude, 0], { extrapolateRight: "clamp" });
  const rnd = seededRandom(mixSeed(effects.seed, frame));
  const shakeX = (rnd() * 2 - 1) * shakeAmp;
  const shakeY = (rnd() * 2 - 1) * shakeAmp;

  // 6-frame white flash on the last six frames (354..359), ramping to full white on the cut.
  const flash = interpolate(frame, [FLASH_START - 1, T.end - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  if (!layout) return null;
  const sceneProps = { copy, colors, layout };

  return (
    <AbsoluteFill style={{ background: colors.background }}>
      <AbsoluteFill style={{ translate: `${shakeX}px ${shakeY}px` }}>
        <StopScene {...sceneProps} />
        <LineStackScene {...sceneProps} seed={effects.seed} />
        <BrandScene {...sceneProps} />
      </AbsoluteFill>

      <Grain opacity={effects.grainOpacity} />
      <AbsoluteFill style={{ background: colors.flash, opacity: flash }} />
      <SoundDesign enabled={sound.enabled} volume={sound.volume} />
    </AbsoluteFill>
  );
};
