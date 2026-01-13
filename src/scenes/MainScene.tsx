import { Suspense } from "react";
import {
  Floor,
  Lights,
  UScreen,
  FPSControls,
  SpatialAudio,
} from "../components/3d";

interface MainSceneProps {
  videoUrl: string;
}

/**
 * Scène principale - Expérience vidéo et sonore immersive
 * Écran en U avec vidéo panoramique et audio spatialisé
 */
export function MainScene({ videoUrl }: MainSceneProps) {
  return (
    <>
      <Lights />
      <Floor size={[12, 12]} position={[0, 0, 0]} />

      <Suspense fallback={null}>
        {/* Écran en U avec vidéo panoramique 5760x1080 */}
        <UScreen videoUrl={videoUrl} width={10} height={4} depth={10} />
      </Suspense>

      {/* Audio spatialisé - se lance au premier clic */}
      <SpatialAudio
        audioUrl="/genesis-audio.mp3"
        position={[0, 1.5, 3]}
        volume={1}
        refDistance={2}
        maxDistance={15}
      />

      {/* Contrôles FPS: WASD + souris */}
      <FPSControls
        moveSpeed={3}
        mouseSensitivity={0.002}
        eyeHeight={1.6}
        bounds={[-4, 4, -4, 4]}
      />
    </>
  );
}
