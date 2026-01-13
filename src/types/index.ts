import * as THREE from "three";

// Exporter les types de particules
export * from "./particles";

// Types pour les modèles 3D
export interface Model3DProps {
  url: string;
  scale?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

// Types pour le sol réflectif
export interface FloorProps {
  size?: [number, number];
  position?: [number, number, number];
}

// Types pour les contrôles Leva du sol
export interface FloorControls {
  blur: number;
  resolution: number;
  mirror: number;
  mixBlur: number;
  mixStrength: number;
  color: string;
  metalness: number;
  roughness: number;
}

// Types pour la configuration du Canvas
export interface CanvasConfig {
  camera: {
    position: [number, number, number];
    fov: number;
  };
  gl: {
    antialias: boolean;
    alpha: boolean;
    powerPreference: "high-performance" | "low-power" | "default";
    preserveDrawingBuffer: boolean;
    failIfMajorPerformanceCaveat: boolean;
  };
}

// Types pour les lumières
export interface LightConfig {
  ambient: {
    intensity: number;
  };
  directional: {
    position: [number, number, number];
    intensity: number;
  };
}
