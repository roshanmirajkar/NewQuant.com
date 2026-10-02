import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Grain } from "./components/Grain";
import { SfxTrack } from "./components/SfxTrack";
import { ramp, randSigned } from "./lib/motion";
import { useFittedSizes } from "./lib/useFittedSizes";
import type { KineticPromoProps } from "./props";
import { BrandScene } from "./scenes/BrandScene";
import { HookScene } from "./scenes/HookScene";
import { StackScene } from "./scenes/StackScene";
import {
  IMPACT_FRAME,
  SHAKE_AMPLITUDE_PX,
  SHAKE_FRAMES,
  T,
} from "./timeline";

export const KineticPromo: React.FC<KineticPromoProps> = ({
  copy,
  colors,
  layout,
  grain,
  audio,
}) => {
  const frame = useCurrentFrame();
  const sizes = useFittedSizes(copy, layout);

  // Camera shake: random +/-6px each frame from the moment STOP lands,
  // decaying linearly to zero over 10 frames.
  const sinceImpact = frame - IMPACT_FRAME;
  const shaking = sinceImpact >= 0 && sinceImpact < SHAKE_FRAMES;
  const decay = ramp(sinceImpact, [0, SHAKE_FRAMES], [1, 0]);
  const shakeX = shaking ? randSigned(frame * 7 + 1) * SHAKE_AMPLITUDE_PX * decay : 0;
  const shakeY = shaking ? randSigned(frame * 7 + 4) * SHAKE_AMPLITUDE_PX * decay : 0;

  // 6-frame white flash into the cut: frames 354..359, fully white on 358-359.
  const flash = ramp(frame, [T.flash - 1, T.flash + 4], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <AbsoluteFill style={{ translate: `${shakeX}px ${shakeY}px` }}>
        <Sequence name="STOP -> SCROLLING" from={T.slam} durationInFrames={T.stack - T.slam}>
          <HookScene
            hook={copy.hook.toUpperCase()}
            reveal={copy.reveal.toUpperCase()}
            hookSize={sizes.hook}
            revealSize={sizes.reveal}
            hookColor={colors.hook}
            revealColor={colors.reveal}
          />
        </Sequence>

        <Sequence name="Stack -> explode" from={T.stack} durationInFrames={T.wipe - T.stack}>
          <StackScene lines={copy.stack} sizes={sizes.stack} colors={colors.stack} />
        </Sequence>

        <Sequence name="Wipe -> brand" from={T.wipe}>
          <BrandScene
            brand={copy.brand.toUpperCase()}
            brandSize={sizes.brand}
            wipeColor={colors.wipe}
            brandColor={colors.brand}
          />
        </Sequence>
      </AbsoluteFill>

      <Grain opacity={grain.opacity} baseFrequency={grain.baseFrequency} />

      <AbsoluteFill style={{ backgroundColor: colors.flash, opacity: flash }} />

      {audio.enabled ? <SfxTrack masterVolume={audio.masterVolume} /> : null}
    </AbsoluteFill>
  );
};
