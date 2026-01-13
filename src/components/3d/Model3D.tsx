import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import type { Model3DProps } from '../../types'

/**
 * Composant pour charger et afficher un modèle 3D GLTF
 */
export function Model3D({
  url,
  scale = [0.5, 0.5, 0.5],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: Model3DProps) {
  const { scene } = useGLTF(url)

  // Clone la scène pour éviter les modifications sur l'original
  const clonedScene = useMemo(() => {
    const clone = scene.clone()

    // Parcourir tous les objets pour ajuster les matériaux
    clone.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as any
        if (mesh.material?.color) {
          mesh.material = mesh.material.clone()
          mesh.material.emissive = mesh.material.color.clone()
          mesh.material.emissiveIntensity = 1
          mesh.material.needsUpdate = true
        }
      }
    })

    return clone
  }, [scene])

  return (
    <primitive
      object={clonedScene}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  )
}
