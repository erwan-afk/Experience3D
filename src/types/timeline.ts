import type { ParticleEffectType } from "./particles";

export interface VideoScene {
  type: "video";
  videoNumber: number;
  transitionDuration: number; // ms
}

export interface ParticleScene {
  type: "particles";
  effect: ParticleEffectType;
  duration: number; // ms
  transitionDuration: number; // ms
}

export type Scene = VideoScene | ParticleScene;

export type PlaybackMode = "auto" | "manual";

export type TransitionState = "idle" | "fading-out" | "fading-in";

export interface TimelineState {
  scenes: Scene[];
  currentIndex: number;
  playbackMode: PlaybackMode;
  transitionState: TransitionState;
  fadeOpacity: number;
  elapsedTime: number; // ms dans la scène actuelle
  isPlaying: boolean;
}

// Helpers pour type guards
export function isVideoScene(scene: Scene): scene is VideoScene {
  return scene.type === "video";
}

export function isParticleScene(scene: Scene): scene is ParticleScene {
  return scene.type === "particles";
}
