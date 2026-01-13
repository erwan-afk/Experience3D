import { Suspense } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Model3D, Floor, Lights } from '../components/3d'

/**
 * Scène principale avec le modèle 3D, sol et contrôles
 */
export function MainScene() {
  return (
    <>
      <Lights />
      <Floor />

      <Suspense fallback={null}>
        <Model3D url="/blocking.glb" />
      </Suspense>

      <OrbitControls />
    </>
  )
}
