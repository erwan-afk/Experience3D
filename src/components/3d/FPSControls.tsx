import { useRef, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";

interface FPSControlsProps {
  /** Vitesse de déplacement */
  moveSpeed?: number;
  /** Sensibilité de la souris */
  mouseSensitivity?: number;
  /** Hauteur des yeux du joueur */
  eyeHeight?: number;
  /** Limites de la zone de jeu [minX, maxX, minZ, maxZ] */
  bounds?: [number, number, number, number];
}

// ID unique pour détecter les instances multiples
let instanceCount = 0;

/**
 * Contrôles FPS avec WASD + souris
 * Clic pour capturer la souris, Echap pour libérer
 */
export function FPSControls({
  moveSpeed = 3,
  mouseSensitivity = 0.002,
  eyeHeight = 1.6,
  bounds = [-4, 4, -4, 4],
}: FPSControlsProps) {
  const { camera, gl } = useThree();
  const instanceIdRef = useRef<number | null>(null);

  const controls = useControls("Contrôles FPS", {
    moveSpeed: { value: moveSpeed, min: 1, max: 10, step: 0.5 },
    mouseSensitivity: {
      value: mouseSensitivity,
      min: 0.0005,
      max: 0.005,
      step: 0.0005,
    },
    eyeHeight: { value: eyeHeight, min: 0.5, max: 3, step: 0.1 },
  });

  // Utiliser des refs pour les valeurs qui changent souvent
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  const isLockedRef = useRef(false);
  const isInitializedRef = useRef(false);
  const moveStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  // Ref pour stocker les handlers pour un cleanup propre
  const handlersRef = useRef<{
    onClick: () => void;
    onPointerLockChange: () => void;
    onMouseMove: (e: MouseEvent) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    onKeyUp: (e: KeyboardEvent) => void;
  } | null>(null);

  // Détection des instances multiples
  useEffect(() => {
    instanceCount++;
    instanceIdRef.current = instanceCount;
    console.log(
      `[FPSControls] Instance ${instanceIdRef.current} montée. Total: ${instanceCount}`,
    );

    return () => {
      console.log(`[FPSControls] Instance ${instanceIdRef.current} démontée.`);
      instanceCount--;
    };
  }, []);

  // Initialisation de la caméra (une seule fois)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    camera.position.set(0, eyeHeight, 0);
    eulerRef.current.set(0, 0, 0, "YXZ");
    camera.quaternion.setFromEuler(eulerRef.current);
    console.log(`[FPSControls] Caméra initialisée`);
  }, [camera, eyeHeight]);

  // Gestion du Pointer Lock, souris et clavier (une seule fois)
  useEffect(() => {
    const canvas = gl.domElement;

    // Si des handlers existent déjà, les supprimer d'abord
    if (handlersRef.current) {
      console.log(`[FPSControls] Cleanup des anciens handlers`);
      canvas.removeEventListener("click", handlersRef.current.onClick);
      document.removeEventListener(
        "pointerlockchange",
        handlersRef.current.onPointerLockChange,
      );
      document.removeEventListener(
        "mousemove",
        handlersRef.current.onMouseMove,
      );
      document.removeEventListener("keydown", handlersRef.current.onKeyDown);
      document.removeEventListener("keyup", handlersRef.current.onKeyUp);
    }

    const onClick = () => {
      if (!isLockedRef.current) {
        canvas.requestPointerLock();
      }
    };

    const onPointerLockChange = () => {
      isLockedRef.current = document.pointerLockElement === canvas;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isLockedRef.current) return;

      let movementX = event.movementX || 0;
      let movementY = event.movementY || 0;

      // Protection contre les valeurs aberrantes (bug navigateur lors du pointer lock)
      // Une valeur > 100 pixels en un frame est impossible en usage normal
      const MAX_MOVEMENT = 100;
      if (
        Math.abs(movementX) > MAX_MOVEMENT ||
        Math.abs(movementY) > MAX_MOVEMENT
      ) {
        console.log(
          `[FPSControls] Mouvement ignoré (trop grand): ${movementX}, ${movementY}`,
        );
        return;
      }

      eulerRef.current.y -= movementX * controlsRef.current.mouseSensitivity;
      eulerRef.current.x -= movementY * controlsRef.current.mouseSensitivity;

      // Normaliser Y entre -π et π pour éviter l'accumulation
      const TWO_PI = Math.PI * 2;
      eulerRef.current.y = ((eulerRef.current.y % TWO_PI) + TWO_PI) % TWO_PI;
      if (eulerRef.current.y > Math.PI) {
        eulerRef.current.y -= TWO_PI;
      }

      // Limiter le regard vertical
      eulerRef.current.x = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, eulerRef.current.x),
      );

      camera.quaternion.setFromEuler(eulerRef.current);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          moveStateRef.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          moveStateRef.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveStateRef.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          moveStateRef.current.right = true;
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          moveStateRef.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          moveStateRef.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveStateRef.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          moveStateRef.current.right = false;
          break;
      }
    };

    // Stocker les handlers
    handlersRef.current = {
      onClick,
      onPointerLockChange,
      onMouseMove,
      onKeyDown,
      onKeyUp,
    };

    // Ajouter les event listeners
    canvas.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    console.log(`[FPSControls] Event listeners ajoutés`);

    return () => {
      console.log(`[FPSControls] Cleanup des event listeners`);
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      handlersRef.current = null;
    };
  }, [camera, gl]);

  // Mise à jour de la position à chaque frame
  useFrame((_, delta) => {
    if (!isLockedRef.current) return;

    const speed = controlsRef.current.moveSpeed;
    const currentEyeHeight = controlsRef.current.eyeHeight;
    const moveState = moveStateRef.current;

    // Direction de la caméra (sans l'inclinaison verticale)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    // Vecteur latéral
    const right = new THREE.Vector3();
    right.crossVectors(direction, camera.up).normalize();

    // Calcul de la vélocité
    const velocity = new THREE.Vector3(0, 0, 0);

    if (moveState.forward) velocity.add(direction);
    if (moveState.backward) velocity.sub(direction);
    if (moveState.left) velocity.sub(right);
    if (moveState.right) velocity.add(right);

    if (velocity.length() > 0) {
      velocity.normalize();
      velocity.multiplyScalar(speed * delta);

      // Nouvelle position
      camera.position.x += velocity.x;
      camera.position.z += velocity.z;

      // Appliquer les limites
      camera.position.x = Math.max(
        bounds[0],
        Math.min(bounds[1], camera.position.x),
      );
      camera.position.z = Math.max(
        bounds[2],
        Math.min(bounds[3], camera.position.z),
      );
      camera.position.y = currentEyeHeight;
    }
  });

  return null;
}
