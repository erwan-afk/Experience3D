import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";
import type { ParticleSystemProps, ParticleData } from "../../types/particles";
import { particleEffects } from "../../config/particles.config";
import {
  particleVertexShader,
  particleFragmentShader,
} from "../../shaders/particles";
import { applyForceField } from "../../utils/forceField";

// Zone de l'écran U (intérieur)
// L'écran fait 10 de large, 5 de haut, 10 de profondeur
// Position centrée, donc X: -4 à 4, Y: 0.1 à 4.5, Z: -4 à 4
const SCREEN_BOUNDS = {
  minX: -4,
  maxX: 4,
  minY: 0.1,
  maxY: 4.5,
  minZ: -4,
  maxZ: 4,
};

/**
 * Système de particules interactif
 * Les particules sont générées à l'intérieur de l'écran U
 * et réagissent à la proximité de la caméra (effet champ de force)
 */
export function ParticleSystem({
  effect,
  enabled = true,
  position = [0, 0, 0],
  opacity = 1,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  const config = particleEffects[effect];

  // Contrôles Leva pour le debug
  const controls = useControls("Particules", {
    forceFieldRadius: {
      value: config.forceFieldRadius,
      min: 0.5,
      max: 5,
      step: 0.1,
    },
    forceFieldStrength: {
      value: config.forceFieldStrength,
      min: 0,
      max: 0.2,
      step: 0.01,
    },
    particleSize: { value: config.size, min: 0.01, max: 0.5, step: 0.01 },
  });

  // Données des particules (persistantes entre les frames)
  const particleData = useRef<ParticleData[]>([]);

  // Initialisation des particules et des buffers
  const { positionsArray, colorsArray, sizesArray } = useMemo(() => {
    const count = config.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    particleData.current = [];

    const colorOptions = Array.isArray(config.color)
      ? config.color
      : [config.color];

    // Dimensions de la zone intérieure de l'écran U
    const width = SCREEN_BOUNDS.maxX - SCREEN_BOUNDS.minX;
    const height = SCREEN_BOUNDS.maxY - SCREEN_BOUNDS.minY;
    const depth = SCREEN_BOUNDS.maxZ - SCREEN_BOUNDS.minZ;

    for (let i = 0; i < count; i++) {
      // Position aléatoire dans la zone de l'écran U
      const x = SCREEN_BOUNDS.minX + Math.random() * width;
      const y = SCREEN_BOUNDS.minY + Math.random() * height;
      const z = SCREEN_BOUNDS.minZ + Math.random() * depth;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Couleur aléatoire parmi les options
      const color = new THREE.Color(
        colorOptions[Math.floor(Math.random() * colorOptions.length)],
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Taille avec légère variation
      sizes[i] = config.size * (0.5 + Math.random() * 0.5);

      // Stocker les données pour l'animation
      particleData.current.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(),
        originalPosition: new THREE.Vector3(x, y, z),
        size: sizes[i],
        opacity: 1,
        phase: Math.random() * Math.PI * 2,
      });
    }

    return {
      positionsArray: positions,
      colorsArray: colors,
      sizesArray: sizes,
    };
  }, [config]);

  // Position mondiale du système de particules
  const worldPosition = useMemo(
    () => new THREE.Vector3(...position),
    [position],
  );

  useFrame((state, delta) => {
    if (!enabled || effect === "none" || !pointsRef.current) return;

    const time = state.clock.elapsedTime;
    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const sizes = pointsRef.current.geometry.attributes.size
      .array as Float32Array;

    // Position de la caméra relative au système de particules
    const relativeCameraPos = camera.position.clone().sub(worldPosition);

    // Configuration ajustée avec les contrôles Leva
    const adjustedConfig = {
      ...config,
      forceFieldRadius: controls.forceFieldRadius,
      forceFieldStrength: controls.forceFieldStrength,
    };

    // Appliquer le champ de force
    applyForceField(particleData.current, relativeCameraPos, adjustedConfig);

    // Animation spécifique à chaque effet + mise à jour des positions
    for (let i = 0; i < particleData.current.length; i++) {
      const particle = particleData.current[i];

      // Animations selon le type d'effet
      switch (effect) {
        case "fireflies":
          // Mouvement flottant + scintillement
          particle.position.y +=
            Math.sin(time * 2 + particle.phase) * 0.002 * config.speed;
          particle.position.x +=
            Math.cos(time * 1.5 + particle.phase) * 0.001 * config.speed;
          sizes[i] =
            controls.particleSize *
            (0.7 + 0.3 * Math.sin(time * 3 + particle.phase));
          break;

        case "snow":
          // Chute + dérive horizontale
          particle.position.y -= config.speed * delta;
          particle.position.x +=
            Math.sin(time + particle.phase) * 0.005 * config.speed;
          // Réinitialiser en haut quand la particule touche le sol
          if (particle.position.y < SCREEN_BOUNDS.minY) {
            particle.position.y = SCREEN_BOUNDS.maxY;
            particle.position.x = particle.originalPosition.x;
            particle.position.z = particle.originalPosition.z;
          }
          break;

        case "stars":
          // Scintillement statique
          sizes[i] =
            controls.particleSize *
            (0.5 + 0.5 * Math.sin(time * 2 + particle.phase));
          break;

        case "dust":
          // Flottement lent
          particle.position.y +=
            Math.sin(time * 0.5 + particle.phase) * 0.003 * config.speed;
          particle.position.x +=
            Math.cos(time * 0.3 + particle.phase) * 0.002 * config.speed;
          break;

        case "energy":
          // Rotation + ondulation
          const angle = time * config.speed + particle.phase;
          const radiusX = 0.5;
          const radiusZ = 0.5;
          particle.position.x =
            particle.originalPosition.x + Math.cos(angle) * radiusX;
          particle.position.z =
            particle.originalPosition.z + Math.sin(angle) * radiusZ;
          particle.position.y +=
            Math.sin(time * 2 + particle.phase) * 0.01 * config.speed;
          break;
      }

      // Garder les particules dans les limites de l'écran U
      particle.position.x = Math.max(
        SCREEN_BOUNDS.minX,
        Math.min(SCREEN_BOUNDS.maxX, particle.position.x),
      );
      particle.position.y = Math.max(
        SCREEN_BOUNDS.minY,
        Math.min(SCREEN_BOUNDS.maxY, particle.position.y),
      );
      particle.position.z = Math.max(
        SCREEN_BOUNDS.minZ,
        Math.min(SCREEN_BOUNDS.maxZ, particle.position.z),
      );

      // Mettre à jour le buffer de positions
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;
    }

    // Signaler que les attributs ont changé
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.size.needsUpdate = true;

    // Mettre à jour le temps dans le shader
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }
  });

  // Ne rien rendre si désactivé ou effet "none"
  if (!enabled || effect === "none") return null;

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={config.particleCount}
          array={positionsArray}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={config.particleCount}
          array={colorsArray}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={config.particleCount}
          array={sizesArray}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        }}
      />
    </points>
  );
}
