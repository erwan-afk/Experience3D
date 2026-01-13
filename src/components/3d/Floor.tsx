import { MeshReflectorMaterial } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'
import type { FloorProps } from '../../types'

/**
 * Sol réflectif avec contrôles GUI via Leva
 */
export function Floor({ size = [5, 5], position = [0, 0, 0] }: FloorProps) {
  const controls = useControls('Sol Réflectif', {
    blur: { value: 570, min: 0, max: 2000, step: 10 },
    resolution: { value: 1024, min: 256, max: 2048, step: 256 },
    mirror: { value: 1, min: 0, max: 1, step: 0.01 },
    mixBlur: { value: 1, min: 0, max: 1, step: 0.01 },
    mixStrength: { value: 1, min: 0, max: 5, step: 0.1 },
    color: '#ffffff',
    metalness: { value: 1, min: 0, max: 1, step: 0.01 },
    roughness: { value: 1, min: 0, max: 1, step: 0.01 },
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <planeGeometry args={size} />
      <MeshReflectorMaterial
        blur={[controls.blur, controls.blur]}
        resolution={controls.resolution}
        mirror={controls.mirror}
        mixBlur={controls.mixBlur}
        mixStrength={controls.mixStrength}
        color={controls.color as unknown as THREE.Color}
        metalness={controls.metalness}
        roughness={controls.roughness}
      />
    </mesh>
  )
}
