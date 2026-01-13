import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from 'leva'

interface FPSControlsProps {
  /** Vitesse de déplacement */
  moveSpeed?: number
  /** Sensibilité de la souris */
  mouseSensitivity?: number
  /** Hauteur des yeux du joueur */
  eyeHeight?: number
  /** Limites de la zone de jeu [minX, maxX, minZ, maxZ] */
  bounds?: [number, number, number, number]
}

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
  const { camera, gl } = useThree()

  const controls = useControls('Contrôles FPS', {
    moveSpeed: { value: moveSpeed, min: 1, max: 10, step: 0.5 },
    mouseSensitivity: { value: mouseSensitivity, min: 0.0005, max: 0.005, step: 0.0005 },
    eyeHeight: { value: eyeHeight, min: 0.5, max: 3, step: 0.1 },
  })

  const isLockedRef = useRef(false)
  const moveStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const velocityRef = useRef(new THREE.Vector3())

  // Initialisation de la caméra
  useEffect(() => {
    camera.position.set(0, controls.eyeHeight, 0)
    eulerRef.current.setFromQuaternion(camera.quaternion)
  }, [camera, controls.eyeHeight])

  // Gestion du Pointer Lock
  useEffect(() => {
    const canvas = gl.domElement

    const onClick = () => {
      canvas.requestPointerLock()
    }

    const onPointerLockChange = () => {
      isLockedRef.current = document.pointerLockElement === canvas
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!isLockedRef.current) return

      const movementX = event.movementX || 0
      const movementY = event.movementY || 0

      eulerRef.current.y -= movementX * controls.mouseSensitivity
      eulerRef.current.x -= movementY * controls.mouseSensitivity

      // Limiter le regard vertical
      eulerRef.current.x = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, eulerRef.current.x)
      )

      camera.quaternion.setFromEuler(eulerRef.current)
    }

    canvas.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousemove', onMouseMove)

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [camera, gl, controls.mouseSensitivity])

  // Gestion du clavier
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveStateRef.current.forward = true
          break
        case 'KeyS':
        case 'ArrowDown':
          moveStateRef.current.backward = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveStateRef.current.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          moveStateRef.current.right = true
          break
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveStateRef.current.forward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          moveStateRef.current.backward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveStateRef.current.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          moveStateRef.current.right = false
          break
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Mise à jour de la position à chaque frame
  useFrame((_, delta) => {
    if (!isLockedRef.current) return

    const speed = controls.moveSpeed
    const moveState = moveStateRef.current
    const velocity = velocityRef.current

    // Direction de la caméra (sans l'inclinaison verticale)
    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction)
    direction.y = 0
    direction.normalize()

    // Vecteur latéral
    const right = new THREE.Vector3()
    right.crossVectors(direction, camera.up).normalize()

    // Calcul de la vélocité
    velocity.set(0, 0, 0)

    if (moveState.forward) velocity.add(direction)
    if (moveState.backward) velocity.sub(direction)
    if (moveState.left) velocity.sub(right)
    if (moveState.right) velocity.add(right)

    if (velocity.length() > 0) {
      velocity.normalize()
      velocity.multiplyScalar(speed * delta)

      // Nouvelle position
      const newPos = camera.position.clone().add(velocity)

      // Appliquer les limites
      newPos.x = Math.max(bounds[0], Math.min(bounds[1], newPos.x))
      newPos.z = Math.max(bounds[2], Math.min(bounds[3], newPos.z))
      newPos.y = controls.eyeHeight

      camera.position.copy(newPos)
    }
  })

  return null
}
