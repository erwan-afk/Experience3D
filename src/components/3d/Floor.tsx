import { MeshReflectorMaterial } from "@react-three/drei";
import { useControls } from "leva";
import * as THREE from "three";
import type { FloorProps } from "../../types";

/**
 * Sol réflectif avec contrôles GUI via Leva
 */
export function Floor({ size = [5, 5], position = [0, 0, 0] }: FloorProps) {
  const controls = useControls("Sol Réflectif", {
    blur: { value: 220, min: 0, max: 2000, step: 10 },
    resolution: { value: 1024, min: 256, max: 2048, step: 256 },
    mirror: { value: 1, min: 0, max: 1, step: 0.01 },
    mixBlur: { value: 3.5, min: 0, max: 20, step: 0.5 },
    mixStrength: { value: 2.1, min: 0, max: 5, step: 0.1 },
    color: "#ffffff",
    metalness: { value: 0, min: 0, max: 1, step: 0.01 },
    roughness: { value: 1, min: 0, max: 1, step: 0.01 },
    depthScale: { value: 1.3, min: 0, max: 5, step: 0.1 },
    minDepthThreshold: { value: 0.4, min: 0, max: 1, step: 0.01 },
    maxDepthThreshold: { value: 1.4, min: 0, max: 5, step: 0.1 },
  });

  // Position légèrement en dessous de 0 pour éviter le z-fighting
  const floorPosition: [number, number, number] = [
    position[0],
    position[1] - 0.01,
    position[2],
  ];

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={floorPosition}>
      <planeGeometry args={size} />
      <MeshReflectorMaterial
        blur={[controls.blur, controls.blur]}
        resolution={controls.resolution}
        mirror={controls.mirror}
        mixBlur={controls.mixBlur}
        mixStrength={controls.mixStrength}
        color={controls.color}
        metalness={controls.metalness}
        roughness={controls.roughness}
        depthScale={controls.depthScale}
        minDepthThreshold={controls.minDepthThreshold}
        maxDepthThreshold={controls.maxDepthThreshold}
      />
    </mesh>
  );
}
