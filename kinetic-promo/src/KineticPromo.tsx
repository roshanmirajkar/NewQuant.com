import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Flash } from "./Flash";
import { Grain } from "./Grain";
import { shake } from "./motion";
import type { KineticPromoProps } from "./props";
import { BrandScene } from "./scenes/BrandScene";
import { HookScene } from "./scenes/HookScene";
import { StackScene } from "./scenes/StackScene";
import { SoundDesign } from "./SoundDesign";
import { SHAKE, T } from "./timeline";
import { useFittedSizes } from "./typography";

export const KineticPromo: React.FC<KineticPromoProps> = ({
  copy,
  colors,
  grain,
  audio,
}) => {
  const frame = useCurrentFrame();
  const sizes = useFittedSizes(copy);

  // Camera shake when STOP lands.
  const camera = shake(
    frame,
    T.slamImpact,
    SHAKE.amplitude,
    SHAKE.durationInFrames,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {sizes && (
        <AbsoluteFill style={{ translate: `${camera.x}px ${camera.y}px` }}>
          <Sequence durationInFrames={T.stack}>
            <HookScene copy={copy} colors={colors} sizes={sizes} />
          </Sequence>
          <Sequence from={T.stack} durationInFrames={T.wipe - T.stack}>
            <StackScene copy={copy} colors={colors} sizes={sizes} />
          </Sequence>
          <Sequence from={T.wipe} durationInFrames={T.end - T.wipe}>
            <BrandScene copy={copy} colors={colors} sizes={sizes} />
          </Sequence>
        </AbsoluteFill>
      )}

      <Grain opacity={grain.opacity} size={grain.size} />
      <Flash color={colors.flash} />

      {audio.enabled && (
        <SoundDesign audio={audio} lineCount={copy.stack.length} />
      )}
    </AbsoluteFill>
  );
};
