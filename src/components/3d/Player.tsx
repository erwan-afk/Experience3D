import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerControls } from "../../hooks/usePlayerControls";

interface PlayerProps {
  /** Vitesse de déplacement */
  speed?: number;
  /** Hauteur des yeux du joueur */
  eyeHeight?: number;
  /** Position initiale [x, y, z] */
  position?: [number, number, number];
  /** Limites de la zone de jeu [minX, maxX, minZ, maxZ] */
  bounds?: [number, number, number, number];
}

/**
 * Composant Player - Gère le déplacement du joueur en FPS
 * Utilise PointerLockControls de drei pour la rotation de la caméra
 */
export function Player({
  speed = 5,
  eyeHeight = 1.6,
  position = [0, 1.6, 0],
  bounds = [-4, 4, -4, 4],
}: PlayerProps) {
  const { camera } = useThree();
  const { forward, backward, left, right } = usePlayerControls();

  // Vecteurs réutilisables pour les calculs
  const direction = useRef(new THREE.Vector3());
  const frontVector = useRef(new THREE.Vector3());
  const sideVector = useRef(new THREE.Vector3());

  // Initialisation de la position et orientation de la caméra
  const isInitialized = useRef(false);
  if (!isInitialized.current) {
    camera.position.set(position[0], position[1], position[2]);
    // Orienter la caméra vers l'écran (Z positif)
    camera.lookAt(0, eyeHeight, 10);
    isInitialized.current = true;
  }

  useFrame((_, delta) => {
    // Calculer les vecteurs de direction basés sur les touches pressées
    frontVector.current.set(0, 0, Number(backward) - Number(forward));
    sideVector.current.set(Number(left) - Number(right), 0, 0);

    // Combiner et appliquer la rotation de la caméra
    direction.current
      .subVectors(frontVector.current, sideVector.current)
      .normalize()
      .multiplyScalar(speed * delta)
      .applyEuler(camera.rotation);

    // Appliquer le mouvement (seulement X et Z, pas Y)
    camera.position.x += direction.current.x;
    camera.position.z += direction.current.z;

    // Appliquer les limites de la zone de jeu
    camera.position.x = Math.max(
      bounds[0],
      Math.min(bounds[1], camera.position.x),
    );
    camera.position.z = Math.max(
      bounds[2],
      Math.min(bounds[3], camera.position.z),
    );

    // Maintenir la hauteur des yeux constante
    camera.position.y = eyeHeight;
  });

  return null;
}
