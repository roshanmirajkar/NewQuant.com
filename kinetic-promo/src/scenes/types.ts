import type { TextLayout } from "../layout";
import type { KineticPromoProps } from "../props";

export type SceneProps = {
  copy: KineticPromoProps["copy"];
  colors: KineticPromoProps["colors"];
  layout: TextLayout;
};
