import * as THREE from "three";
import type { ParticleData, ParticleEffectConfig } from "../types/particles";

// Vecteur temporaire réutilisable pour éviter les allocations
const tempDirection = new THREE.Vector3();
const tempReturnForce = new THREE.Vector3();

/**
 * Applique un champ de force de répulsion aux particules
 * Les particules sont repoussées quand la caméra s'approche
 * et reviennent élastiquement à leur position originale
 */
export function applyForceField(
  particles: ParticleData[],
  cameraPosition: THREE.Vector3,
  config: ParticleEffectConfig
): void {
  const { forceFieldRadius, forceFieldStrength } = config;
  const radiusSq = forceFieldRadius * forceFieldRadius;

  for (const particle of particles) {
    // Vecteur de la caméra vers la particule
    tempDirection.copy(particle.position).sub(cameraPosition);
    const distanceSq = tempDirection.lengthSq();

    // Si la particule est dans le rayon d'effet
    if (distanceSq < radiusSq && distanceSq > 0.001) {
      const distance = Math.sqrt(distanceSq);

      // Force inversement proportionnelle à la distance
      // Plus on est proche, plus la force est grande
      const force = (1 - distance / forceFieldRadius) * forceFieldStrength;

      // Normaliser la direction et appliquer la force (répulsion)
      tempDirection.normalize().multiplyScalar(force);
      particle.velocity.add(tempDirection);
    }

    // Retour progressif vers la position originale (élasticité)
    tempReturnForce
      .copy(particle.originalPosition)
      .sub(particle.position)
      .multiplyScalar(0.02);
    particle.velocity.add(tempReturnForce);

    // Friction pour stabiliser le mouvement
    particle.velocity.multiplyScalar(0.95);

    // Appliquer la vélocité à la position
    particle.position.add(particle.velocity);
  }
}
