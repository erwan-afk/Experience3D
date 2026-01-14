import type { Scene, AmbientParticleEvent } from "../types/timeline";

// Configuration par défaut des scènes
export const defaultScenes: Scene[] = [
  { type: "video", videoNumber: 1, transitionDuration: 500 },
  {
    type: "particles",
    effect: "fireflies",
    duration: 90000,
    transitionDuration: 500,
  },
  { type: "video", videoNumber: 2, transitionDuration: 500 },
  {
    type: "particles",
    effect: "dust",
    duration: 90000,
    transitionDuration: 500,
  },
  { type: "video", videoNumber: 3, transitionDuration: 500 },
  {
    type: "particles",
    effect: "stars",
    duration: 90000,
    transitionDuration: 500,
  },
  { type: "video", videoNumber: 4, transitionDuration: 500 },
  {
    type: "particles",
    effect: "energy",
    duration: 90000,
    transitionDuration: 500,
  },
];

// Durée estimée pour les vidéos (sera remplacée par la vraie durée)
export const DEFAULT_VIDEO_DURATION = 30000; // 30 secondes par défaut

// Particules ambiantes dans l'espace 3D (deuxième ligne de la timeline)
// Ces particules flottent dans la scène et peuvent être actives pendant les vidéos
export const ambientParticleEvents: AmbientParticleEvent[] = [
  {
    effect: "stars", // Petits points blancs étoilés
    startTime: 0, // Dès le début
    duration: 141000, // Jusqu'au feu (02:21)
  },
  {
    effect: "fireflies", // Particules de feu (braises)
    startTime: 141000, // 02:21 = 2*60*1000 + 21*1000 = 141000ms
    duration: 43000, // 43 secondes
  },
  {
    effect: "rocks", // Éboulement - cailloux qui tombent
    startTime: 750000, // 12:30
    duration: 190000, // Jusqu'à 15:40
  },
  {
    effect: "grass", // Herbe qui pousse
    startTime: 940000, // 15:40
    duration: 180000, // 3 minutes
  },
];
