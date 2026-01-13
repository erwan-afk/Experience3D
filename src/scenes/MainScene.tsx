import { Suspense } from "react";
import { PointerLockControls } from "@react-three/drei";
import { Floor, Lights, UScreen, SpatialAudio } from "../components/3d";
import { Player } from "../components/3d/Player";

interface MainSceneProps {
  videoUrl: string;
  onVideoReady?: (video: HTMLVideoElement) => void;
}

/**
 * Scène principale - Expérience vidéo et sonore immersive
 * Écran en U avec vidéo panoramique et audio spatialisé
 */
export function MainScene({ videoUrl, onVideoReady }: MainSceneProps) {
  return (
    <>
      <Lights />
      <Floor size={[20, 20]} position={[0, 0, 0]} />

      <Suspense fallback={null}>
        {/* Écran en U avec vidéo panoramique 5760x1080 */}
        <UScreen
          videoUrl={videoUrl}
          width={10}
          height={5}
          depth={10}
          onVideoReady={onVideoReady}
        />
      </Suspense>

      {/* Audio spatialisé - désactivé temporairement */}
      {/* <SpatialAudio
        audioUrl="/genesis-audio.mp3"
        position={[0, 1.5, 3]}
        volume={1}
        refDistance={2}
        maxDistance={15}
      /> */}

      {/* Contrôles FPS: PointerLockControls pour la souris */}
      <PointerLockControls />

      {/* Player: WASD pour le déplacement */}
      <Player speed={5} eyeHeight={1.6} bounds={[-4, 4, -4, 4]} />
    </>
  );
}
