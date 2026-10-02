import { useEffect, useState, type ReactNode } from "react";
import { useDelayRender } from "remotion";
import { waitUntilDone } from "../fonts";

/**
 * Renders nothing until the Google Font has loaded. Text is measured to fit
 * the safe area, and measuring before the real font exists would use the
 * fallback font's metrics, so children mount only once the glyphs are ready.
 * delayRender keeps Remotion from capturing a frame in the meantime.
 */
export const FontGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Waiting for the Anton font"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    waitUntilDone()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);

  return ready ? <>{children}</> : null;
};
