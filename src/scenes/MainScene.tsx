import { Suspense } from "react";
import { PointerLockControls } from "@react-three/drei";
import { Floor, Lights, UScreen } from "../components/3d";
import { Player } from "../components/3d/Player";
import { AmbientParticles } from "../components/3d/AmbientParticles";
import type { ParticleEffectType } from "../types/particles";

interface MainSceneProps {
  videoUrl?: string;
  onVideoReady?: (video: HTMLVideoElement) => void;
  particleEffect?: ParticleEffectType;
  particlesEnabled?: boolean;
  // Particules ambiantes
  ambientParticleEffect?: ParticleEffectType | null;
  showAmbientParticles?: boolean;
  ambientParticleOpacity?: number;
  activeAmbientEffects?: { effect: ParticleEffectType; opacity: number }[];
}

/**
 * Scène principale - Expérience vidéo et sonore immersive
 * Écran en U avec vidéo panoramique OU animation de particules
 */
export function MainScene({
  videoUrl,
  onVideoReady,
  particleEffect = "fireflies",
  particlesEnabled = false,
  ambientParticleEffect = null,
  showAmbientParticles = false,
  ambientParticleOpacity = 1,
  activeAmbientEffects = [],
}: MainSceneProps) {
  return (
    <>
      <Lights />
      <Floor size={[10, 10]} position={[0, 0, 0]} />

      <Suspense fallback={null}>
        {/* Écran en U - affiche vidéo OU particules */}
        <UScreen
          videoUrl={videoUrl}
          particleEffect={particleEffect}
          showParticles={particlesEnabled}
          width={10}
          height={5}
          depth={10}
          onVideoReady={onVideoReady}
        />
      </Suspense>

      {/* Particules ambiantes dans l'espace 3D - supporte plusieurs effets simultanés */}
      {activeAmbientEffects.length > 0 ? (
        activeAmbientEffects.map((activeEffect, index) => (
          <AmbientParticles
            key={`${activeEffect.effect}-${index}`}
            effect={activeEffect.effect}
            enabled={true}
            opacity={activeEffect.opacity}
          />
        ))
      ) : (
        <AmbientParticles
          effect={ambientParticleEffect || "fireflies"}
          enabled={showAmbientParticles}
          opacity={ambientParticleOpacity}
        />
      )}

      {/* Contrôles FPS: PointerLockControls pour la souris */}
      <PointerLockControls />

      {/* Player: WASD pour le déplacement */}
      <Player speed={5} eyeHeight={1.6} bounds={[-4, 4, -4, 4]} />
    </>
  );
}
