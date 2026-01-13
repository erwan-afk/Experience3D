import type { Scene } from "../types/timeline";

// Configuration par défaut des scènes
export const defaultScenes: Scene[] = [
  { type: "video", videoNumber: 1, transitionDuration: 500 },
  {
    type: "particles",
    effect: "fireflies",
    duration: 10000,
    transitionDuration: 500,
  },
  { type: "video", videoNumber: 2, transitionDuration: 500 },
  {
    type: "particles",
    effect: "dust",
    duration: 10000,
    transitionDuration: 500,
  },
  { type: "video", videoNumber: 3, transitionDuration: 500 },
  {
    type: "particles",
    effect: "stars",
    duration: 10000,
    transitionDuration: 500,
  },
  { type: "video", videoNumber: 4, transitionDuration: 500 },
  {
    type: "particles",
    effect: "energy",
    duration: 10000,
    transitionDuration: 500,
  },
];

// Durée estimée pour les vidéos (sera remplacée par la vraie durée)
export const DEFAULT_VIDEO_DURATION = 30000; // 30 secondes par défaut
