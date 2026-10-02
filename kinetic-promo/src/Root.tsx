import React from "react";
import { Composition } from "remotion";
import { KineticPromo } from "./KineticPromo";
import { defaultProps } from "./props";
import { DURATION, FPS, HEIGHT, WIDTH } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="KineticPromo"
      component={KineticPromo}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultProps}
    />
  );
};
