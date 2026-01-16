import { useControls } from "leva";
import type { FloorProps } from "../../types";

/**
 * Sol noir semi-transparent
 */
export function Floor({ size = [5, 5], position = [0, 0, 0] }: FloorProps) {
  const controls = useControls("Sol", {
    opacity: { value: 0.75, min: 0, max: 1, step: 0.05 },
    color: { value: "#000000" },
    metalness: { value: 0.9, min: 0, max: 1, step: 0.1 },
    roughness: { value: 0.1, min: 0, max: 1, step: 0.1 },
  });

  const floorPosition: [number, number, number] = [
    position[0],
    position[1] - 0.01,
    position[2],
  ];

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={floorPosition}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={controls.color}
        metalness={controls.metalness}
        roughness={controls.roughness}
        transparent={true}
        opacity={controls.opacity}
      />
    </mesh>
  );
}
