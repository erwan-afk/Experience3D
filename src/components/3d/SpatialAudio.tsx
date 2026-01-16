import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface SpatialAudioProps {
  url: string;
  isPlaying: boolean;
  currentTime: number; // temps en secondes
  onReady?: () => void;
  /** Position de la source audio dans l'espace 3D */
  position?: [number, number, number];
  /** Distance de référence pour l'atténuation (default: très loin = pas d'atténuation) */
  refDistance?: number;
  /** Volume (0-1) */
  volume?: number;
}

/**
 * Composant d'audio spatial positionné dans l'espace 3D
 * Le son suit l'orientation de la caméra - quand tu tournes la tête,
 * le son semble venir de la direction de la source
 */
export function SpatialAudio({
  url,
  isPlaying,
  currentTime,
  onReady,
  position = [0, 1.6, -5], // Devant l'utilisateur, à hauteur des yeux
  refDistance = 100, // Grande distance = peu d'atténuation avec la distance
  volume = 1,
}: SpatialAudioProps) {
  const { camera } = useThree();

  const listenerRef = useRef<THREE.AudioListener | null>(null);
  const audioRef = useRef<THREE.PositionalAudio | null>(null);
  const audioLoaderRef = useRef<THREE.AudioLoader | null>(null);
  const isLoadedRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  // Initialiser l'AudioListener et l'attacher à la caméra
  useEffect(() => {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    listenerRef.current = listener;

    // Créer l'audio positionnel
    const audio = new THREE.PositionalAudio(listener);
    audioRef.current = audio;

    // Configurer l'atténuation
    audio.setRefDistance(refDistance);
    audio.setRolloffFactor(1);
    audio.setDistanceModel("inverse");
    audio.setVolume(volume);

    // Charger le fichier audio
    const audioLoader = new THREE.AudioLoader();
    audioLoaderRef.current = audioLoader;

    audioLoader.load(
      url,
      (buffer) => {
        if (audioRef.current) {
          audioRef.current.setBuffer(buffer);
          audioRef.current.setLoop(false);
          isLoadedRef.current = true;
          onReady?.();
        }
      },
      undefined,
      (error) => {
        console.error("Erreur chargement audio spatial:", error);
      },
    );

    return () => {
      if (audioRef.current) {
        if (audioRef.current.isPlaying) {
          audioRef.current.stop();
        }
        audioRef.current.disconnect();
      }
      if (listenerRef.current) {
        camera.remove(listenerRef.current);
      }
    };
  }, [camera, url, refDistance, onReady]);

  // Mettre à jour le volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setVolume(volume);
    }
  }, [volume]);

  // Gérer play/pause
  useEffect(() => {
    if (!audioRef.current || !isLoadedRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      if (!audio.isPlaying) {
        // Synchroniser le temps avant de jouer
        const context = audio.context;
        const buffer = audio.buffer;
        if (buffer && context) {
          // Définir le temps de départ
          audio.offset = currentTime;
          audio.play();
        }
      }
    } else {
      if (audio.isPlaying) {
        audio.pause();
      }
    }
  }, [isPlaying, currentTime]);

  // Synchroniser le temps périodiquement pour éviter la dérive
  useEffect(() => {
    if (!audioRef.current || !isLoadedRef.current || !isPlaying) return;

    const audio = audioRef.current;
    const context = audio.context;

    // Vérifier la dérive toutes les secondes
    const syncInterval = setInterval(() => {
      if (!audio.isPlaying || !audio.buffer) return;

      // Calculer le temps actuel de l'audio
      const audioCurrentTime =
        (context.currentTime - audio._startedAt + audio.offset) %
        audio.buffer.duration;
      const drift = Math.abs(audioCurrentTime - currentTime);

      // Si la dérive dépasse 300ms, resynchroniser
      if (drift > 0.3) {
        audio.stop();
        audio.offset = currentTime;
        audio.play();
        lastSyncTimeRef.current = currentTime;
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [isPlaying, currentTime]);

  return (
    <primitive
      object={audioRef.current || new THREE.Object3D()}
      position={position}
    />
  );
}
