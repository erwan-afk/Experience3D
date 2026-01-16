import type { CanvasConfig, LightConfig } from "../types";

export const canvasConfig: CanvasConfig = {
  camera: {
    position: [0, 1.6, 0],
    fov: 75,
  },
  gl: {
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false,
  },
};

export const lightConfig: LightConfig = {
  ambient: {
    intensity: 0.5,
  },
  directional: {
    position: [10, 10, 5],
    intensity: 1,
  },
};
