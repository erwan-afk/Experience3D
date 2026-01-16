import { lightConfig } from "../../config/canvas.config";

/**
 * Configuration des lumières de la scène
 */
export function Lights() {
  return (
    <>
      <ambientLight intensity={lightConfig.ambient.intensity} />
    </>
  );
}
