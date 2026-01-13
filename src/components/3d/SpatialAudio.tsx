import { useRef, useEffect, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls, button } from 'leva'

interface SpatialAudioProps {
  /** URL du fichier audio */
  audioUrl?: string
  /** Position de la source audio principale */
  position?: [number, number, number]
  /** Volume global */
  volume?: number
  /** Distance de référence (volume max) */
  refDistance?: number
  /** Distance maximale d'audition */
  maxDistance?: number
}

/**
 * Audio spatialisé avec Web Audio API
 * Le son change en fonction de la position du joueur
 */
export function SpatialAudio({
  audioUrl = '/genesis-audio.mp3',
  position = [0, 1.5, 4],
  volume = 1,
  refDistance = 1,
  maxDistance = 20,
}: SpatialAudioProps) {
  const { camera } = useThree()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const listenerRef = useRef<THREE.AudioListener | null>(null)
  const soundRef = useRef<THREE.PositionalAudio | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)

  const controls = useControls('Audio Spatialisé', {
    volume: { value: volume, min: 0, max: 2, step: 0.1 },
    refDistance: { value: refDistance, min: 0.5, max: 10, step: 0.5 },
    maxDistance: { value: maxDistance, min: 5, max: 50, step: 1 },
    'Play/Pause': button(() => {
      if (isPlaying) {
        stopAudio()
      } else {
        playAudio()
      }
    }),
  })

  // Initialisation de l'audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Créer le listener et l'attacher à la caméra
        const listener = new THREE.AudioListener()
        camera.add(listener)
        listenerRef.current = listener

        // Créer la source audio positionnelle
        const sound = new THREE.PositionalAudio(listener)
        soundRef.current = sound

        // Charger le fichier audio
        const audioLoader = new THREE.AudioLoader()
        const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
          audioLoader.load(
            audioUrl,
            resolve,
            undefined,
            reject
          )
        })

        audioBufferRef.current = buffer
        sound.setBuffer(buffer)
        sound.setRefDistance(controls.refDistance)
        sound.setMaxDistance(controls.maxDistance)
        sound.setDistanceModel('inverse')
        sound.setLoop(true)
        sound.setVolume(controls.volume)

        setIsReady(true)
        console.log('Audio spatialisé prêt')
      } catch (error) {
        console.error('Erreur lors du chargement audio:', error)
      }
    }

    initAudio()

    return () => {
      if (soundRef.current) {
        if (soundRef.current.isPlaying) {
          soundRef.current.stop()
        }
        soundRef.current.disconnect()
      }
      if (listenerRef.current && camera) {
        camera.remove(listenerRef.current)
      }
    }
  }, [audioUrl, camera])

  // Mise à jour des paramètres audio
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.setVolume(controls.volume)
      soundRef.current.setRefDistance(controls.refDistance)
      soundRef.current.setMaxDistance(controls.maxDistance)
    }
  }, [controls.volume, controls.refDistance, controls.maxDistance])

  const playAudio = () => {
    if (soundRef.current && isReady && !soundRef.current.isPlaying) {
      // Reprendre le contexte audio si suspendu
      const context = listenerRef.current?.context
      if (context && context.state === 'suspended') {
        context.resume()
      }
      soundRef.current.play()
      setIsPlaying(true)
    }
  }

  const stopAudio = () => {
    if (soundRef.current && soundRef.current.isPlaying) {
      soundRef.current.pause()
      setIsPlaying(false)
    }
  }

  // Auto-play au premier clic (pour contourner les restrictions du navigateur)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (isReady && !isPlaying) {
        playAudio()
      }
      // Retirer le listener après le premier clic
      document.removeEventListener('click', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
    }
  }, [isReady, isPlaying])

  return (
    <group position={position}>
      {/* Visualisation de la source audio (optionnel, peut être retiré en prod) */}
      {soundRef.current && (
        <primitive object={soundRef.current} />
      )}

      {/* Indicateur visuel de la source (sphère semi-transparente) */}
      <mesh visible={false}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

/**
 * Composant pour plusieurs sources audio spatialisées
 * Permet de créer une ambiance sonore immersive
 */
export function MultiSpatialAudio({
  audioUrl = '/genesis-audio.mp3',
}: {
  audioUrl?: string
}) {
  // Sources audio positionnées autour du U
  // Gauche, Centre-fond, Droite
  const sources: [number, number, number][] = [
    [-4, 1.5, 0],   // Gauche
    [0, 1.5, 4],    // Fond centre
    [4, 1.5, 0],    // Droite
  ]

  return (
    <>
      {sources.map((pos, index) => (
        <SpatialAudio
          key={index}
          audioUrl={audioUrl}
          position={pos}
          volume={0.7}
          refDistance={2}
          maxDistance={15}
        />
      ))}
    </>
  )
}
