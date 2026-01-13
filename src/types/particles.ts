import * as THREE from "three";

// Types d'effets de particules disponibles
export type ParticleEffectType =
  | "fireflies" // Lucioles flottantes
  | "snow" // Chute de neige
  | "stars" // Étoiles scintillantes
  | "dust" // Poussières dans la lumière
  | "energy" // Flux d'énergie
  | "none"; // Désactivé

// Configuration d'un effet de particules
export interface ParticleEffectConfig {
  id: ParticleEffectType;
  name: string; // Nom affiché dans l'UI
  particleCount: number; // Nombre de particules
  color: string | string[]; // Couleur(s)
  size: number; // Taille de base
  speed: number; // Vitesse d'animation
  spread: [number, number, number]; // Zone de distribution [x, y, z]
  forceFieldStrength: number; // Intensité de répulsion
  forceFieldRadius: number; // Rayon d'effet du champ de force
}

// Props du composant ParticleSystem
export interface ParticleSystemProps {
  effect: ParticleEffectType;
  enabled?: boolean;
  position?: [number, number, number];
  opacity?: number;
}

// Données d'une particule individuelle
export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
  size: number;
  opacity: number;
  phase: number; // Pour les animations cycliques
}
