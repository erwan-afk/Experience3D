import type {
  ParticleEffectConfig,
  ParticleEffectType,
} from "../types/particles";

export const particleEffects: Record<ParticleEffectType, ParticleEffectConfig> =
  {
    fireflies: {
      id: "fireflies",
      name: "Braises",
      particleCount: 6000,
      color: ["#ff4500", "#ff6b35", "#ff8c00", "#ffa500", "#ffcc00", "#ff2200"],
      size: 0.15,
      speed: 0.3,
      spread: [8, 4, 6],
      forceFieldStrength: 0.05,
      forceFieldRadius: 2.5,
    },

    snow: {
      id: "snow",
      name: "Neige",
      particleCount: 3000,
      color: "#ffffff",
      size: 0.08,
      speed: 0.5,
      spread: [10, 6, 8],
      forceFieldStrength: 0.02,
      forceFieldRadius: 1.5,
    },

    stars: {
      id: "stars",
      name: "Etoiles",
      particleCount: 1500,
      color: ["#ffffff", "#aaaaff", "#ffaaaa"],
      size: 0.1,
      speed: 0.1,
      spread: [12, 5, 10],
      forceFieldStrength: 0.08,
      forceFieldRadius: 3,
    },

    dust: {
      id: "dust",
      name: "Sable",
      particleCount: 10000,
      color: ["#d4a574", "#c9956c", "#e6c9a8", "#b8860b", "#deb887", "#f5deb3"],
      size: 0.05,
      speed: 0.2,
      spread: [8, 4, 6],
      forceFieldStrength: 0.03,
      forceFieldRadius: 2,
    },

    energy: {
      id: "energy",
      name: "Energie",
      particleCount: 2000,
      color: ["#00ffff", "#ff00ff", "#ffff00"],
      size: 0.12,
      speed: 0.8,
      spread: [6, 4, 5],
      forceFieldStrength: 0.1,
      forceFieldRadius: 3,
    },

    none: {
      id: "none",
      name: "Aucun",
      particleCount: 0,
      color: "#000000",
      size: 0,
      speed: 0,
      spread: [0, 0, 0],
      forceFieldStrength: 0,
      forceFieldRadius: 0,
    },
  };

// Liste des effets pour l'UI (sans "none")
export const availableEffects = Object.values(particleEffects).filter(
  (e) => e.id !== "none",
);
