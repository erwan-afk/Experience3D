import { Suspense, useState, useEffect, useMemo } from "react";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import {
  Floor,
  Lights,
  UScreen,
  MorphingParticles3D,
  TextScreen,
} from "../components/3d";
import { ScreenReflection } from "../components/3d/ScreenReflection";
import { Player } from "../components/3d/Player";
import { AmbientParticles } from "../components/3d/AmbientParticles";
import { SpatialAudio } from "../components/3d/SpatialAudio";
import type { ParticleEffectType } from "../types/particles";

// Fonction pour créer la géométrie en U (copiée de UScreen pour partage)
function createUShapeGeometry(
  width: number,
  height: number,
  depth: number,
  cornerRadius: number,
  cornerSegments: number = 16,
): THREE.BufferGeometry {
  const r = Math.min(cornerRadius, width / 2, depth);
  const points: THREE.Vector2[] = [];
  const rightWallLength = depth - r;
  const numPointsWall = 10;

  for (let i = 0; i <= numPointsWall; i++) {
    const t = i / numPointsWall;
    points.push(new THREE.Vector2(width / 2, t * rightWallLength));
  }

  for (let i = 1; i <= cornerSegments; i++) {
    const angle = (i / cornerSegments) * (Math.PI / 2);
    const x = width / 2 - r + Math.cos(angle) * r;
    const z = depth - r + Math.sin(angle) * r;
    points.push(new THREE.Vector2(x, z));
  }

  const backWallLength = width - 2 * r;
  for (let i = 1; i <= numPointsWall; i++) {
    const t = i / numPointsWall;
    const x = width / 2 - r - t * backWallLength;
    points.push(new THREE.Vector2(x, depth));
  }

  for (let i = 1; i <= cornerSegments; i++) {
    const angle = Math.PI / 2 + (i / cornerSegments) * (Math.PI / 2);
    const x = -width / 2 + r + Math.cos(angle) * r;
    const z = depth - r + Math.sin(angle) * r;
    points.push(new THREE.Vector2(x, z));
  }

  for (let i = 1; i <= numPointsWall; i++) {
    const t = i / numPointsWall;
    const z = depth - r - t * (depth - r);
    points.push(new THREE.Vector2(-width / 2, z));
  }

  let totalLength = 0;
  const lengths: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dz = points[i].y - points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dz * dz);
    lengths.push(totalLength);
  }

  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const u = lengths[i] / totalLength;
    vertices.push(p.x, 0, p.y);
    uvs.push(u, 0);
    vertices.push(p.x, height, p.y);
    uvs.push(u, 1);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const bl = i * 2;
    const tl = i * 2 + 1;
    const br = i * 2 + 2;
    const tr = i * 2 + 3;
    indices.push(bl, br, tl);
    indices.push(tl, br, tr);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

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
  // Audio spatial
  audioUrl?: string;
  isPlaying?: boolean;
  audioCurrentTime?: number;
  // Texte
  showText?: boolean;
  currentText?: string | null;
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
  audioUrl,
  isPlaying = false,
  audioCurrentTime = 0,
  showText = false,
  currentText = null,
}: MainSceneProps) {
  // État pour la transition vers le morphing 3D
  const [screenTransitionOut, setScreenTransitionOut] = useState(false);
  const [show3DMorphing, setShow3DMorphing] = useState(false);

  // Texture de l'écran pour la réflexion
  const [screenTexture, setScreenTexture] = useState<THREE.Texture | null>(
    null,
  );

  // Paramètres de l'écran U
  const screenWidth = 10;
  const screenHeight = 5;
  const screenDepth = 10;
  const cornerRadius = 1;

  // Géométrie partagée pour l'écran et sa réflexion
  const screenGeometry = useMemo(() => {
    return createUShapeGeometry(
      screenWidth,
      screenHeight,
      screenDepth,
      cornerRadius,
      16,
    );
  }, []);

  // Déclencher la transition quand on passe à l'effet morphing
  useEffect(() => {
    if (particleEffect === "morphing" && particlesEnabled) {
      setScreenTransitionOut(true);
    } else {
      // Réinitialiser si on revient à un autre effet
      setScreenTransitionOut(false);
      setShow3DMorphing(false);
    }
  }, [particleEffect, particlesEnabled]);

  // Callback quand la transition des écrans est terminée
  const handleScreenTransitionComplete = () => {
    setShow3DMorphing(true);
  };

  // Callback pour recevoir la texture de l'écran
  const handleTextureReady = (texture: THREE.Texture | null) => {
    setScreenTexture(texture);
  };

  return (
    <>
      <Lights />
      <Floor size={[10.1, 10.1]} position={[0, 0, 0]} />

      <Suspense fallback={null}>
        {/* Écran en U - affiche vidéo OU particules (pas quand texte) */}
        {!showText && (
          <UScreen
            videoUrl={videoUrl}
            particleEffect={particleEffect}
            showParticles={particlesEnabled && particleEffect !== "morphing"}
            width={screenWidth}
            height={screenHeight}
            depth={screenDepth}
            cornerRadius={cornerRadius}
            onVideoReady={onVideoReady}
            onTextureReady={handleTextureReady}
            transitionOut={screenTransitionOut}
            onTransitionComplete={handleScreenTransitionComplete}
          />
        )}

        {/* Réflexion de l'écran avec blur progressif */}
        {!showText && !screenTransitionOut && screenTexture && (
          <ScreenReflection
            sourceTexture={screenTexture}
            geometry={screenGeometry}
            position={[0, 0, -screenDepth / 2]}
            depth={screenDepth}
          />
        )}

        {/* Morphing 3D dans l'espace - affiché après la descente des écrans */}
        <MorphingParticles3D visible={show3DMorphing} />

        {/* Texte sur l'écran du milieu */}
        {showText && currentText && <TextScreen text={currentText} />}
      </Suspense>

      {/* Particules ambiantes dans l'espace 3D - supporte plusieurs effets simultanés */}
      {activeAmbientEffects.length > 0 ? (
        activeAmbientEffects.map((activeEffect) => (
          <AmbientParticles
            key={activeEffect.effect}
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
      <Player speed={5} eyeHeight={1.1} bounds={[-4, 4, -4, 4]} />

      {/* Audio spatial - positionné devant l'utilisateur */}
      {audioUrl && (
        <SpatialAudio
          url={audioUrl}
          isPlaying={isPlaying}
          currentTime={audioCurrentTime}
          position={[0, 1.6, -3]} // Devant, au centre de l'écran
          refDistance={50} // Grande distance pour atténuation minimale
          volume={1}
        />
      )}
    </>
  );
}
