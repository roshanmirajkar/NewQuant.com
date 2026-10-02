import { Composition } from "remotion";
import { KineticPromo } from "./KineticPromo";
import { defaultProps, kineticPromoSchema } from "./props";
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="KineticPromo"
      component={KineticPromo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      schema={kineticPromoSchema}
      defaultProps={defaultProps}
    />
  );
};
