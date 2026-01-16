import type { ParticleEffectType } from "./particles";

export interface VideoScene {
  type: "video";
  videoNumber: number;
  transitionDuration: number; // ms
  exposure?: number; // tone mapping exposure
}

export interface ParticleScene {
  type: "particles";
  effect: ParticleEffectType;
  duration: number; // ms
  transitionDuration: number; // ms
  exposure?: number; // tone mapping exposure
}

export interface TextScene {
  type: "text";
  text: string;
  duration: number; // ms
  transitionDuration: number; // ms
  exposure?: number; // tone mapping exposure
}

export type Scene = VideoScene | ParticleScene | TextScene;

// Particules ambiantes dans l'espace 3D (superposées aux vidéos/particules écran)
export interface AmbientParticleEvent {
  effect: ParticleEffectType;
  startTime: number; // ms depuis le début de la timeline
  duration: number; // ms
}

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

export function isTextScene(scene: Scene): scene is TextScene {
  return scene.type === "text";
}
