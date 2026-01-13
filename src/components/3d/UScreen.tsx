import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";

interface UScreenProps {
  videoUrl: string;
  width?: number;
  height?: number;
  depth?: number;
}

/**
 * Écran en U avec support vidéo panoramique
 * La vidéo 5760x1080 est mappée sur les 3 faces (gauche, fond, droite)
 *
 * Structure du U (vue de dessus):
 *       ┌─────────────┐  <- Mur du fond (Z+)
 *       │             │
 *  Mur  │             │  Mur
 * Gauche│             │ Droite
 *  (X-) │             │  (X+)
 *       │             │
 *       └      ○      ┘  <- Ouverture (Z-), joueur au centre
 */
export function UScreen({
  videoUrl,
  width = 10,
  height = 3,
  depth = 10,
}: UScreenProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const controls = useControls("Écran U", {
    width: { value: width, min: 5, max: 20, step: 0.5 },
    height: { value: height, min: 1, max: 10, step: 0.5 },
    depth: { value: depth, min: 5, max: 20, step: 0.5 },
    emissiveIntensity: { value: 1, min: 0, max: 3, step: 0.1 },
  });

  // Création de la vidéo et texture
  useEffect(() => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    videoRef.current = video;

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    setVideoTexture(texture);

    video.play().catch(console.error);

    return () => {
      video.pause();
      video.src = "";
      texture.dispose();
    };
  }, [videoUrl]);

  // Mise à jour de la texture vidéo
  useFrame(() => {
    if (videoTexture && videoRef.current && !videoRef.current.paused) {
      videoTexture.needsUpdate = true;
    }
  });

  const w = controls.width;
  const h = controls.height;
  const d = controls.depth;

  // Vidéo 5760x1080 = 3 sections de 1920px chacune
  // Gauche: 0 à 1/3, Fond: 1/3 à 2/3, Droite: 2/3 à 1

  return (
    <group ref={groupRef}>
      {/* Mur gauche */}
      <WallPanel
        position={[-w / 2, h / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={d}
        height={h}
        uvStart={1 / 3}
        uvEnd={0}
        texture={videoTexture}
        emissiveIntensity={controls.emissiveIntensity}
      />

      {/* Mur du fond */}
      <WallPanel
        position={[0, h / 2, d / 2]}
        rotation={[0, Math.PI, 0]}
        width={w}
        height={h}
        uvStart={2 / 3}
        uvEnd={1 / 3}
        texture={videoTexture}
        emissiveIntensity={controls.emissiveIntensity}
      />

      {/* Mur droit */}
      <WallPanel
        position={[w / 2, h / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={d}
        height={h}
        uvStart={1}
        uvEnd={2 / 3}
        texture={videoTexture}
        emissiveIntensity={controls.emissiveIntensity}
      />
    </group>
  );
}

/**
 * Panneau mural plat
 */
function WallPanel({
  position,
  rotation,
  width,
  height,
  uvStart,
  uvEnd,
  texture,
  emissiveIntensity,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  uvStart: number;
  uvEnd: number;
  texture: THREE.VideoTexture | null;
  emissiveIntensity: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height);

    // Modifier les UVs pour mapper la bonne portion de la vidéo
    const uvAttribute = geo.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;

    // PlaneGeometry UVs par défaut: [0,1], [1,1], [0,0], [1,0]
    // On veut mapper uvStart->uvEnd sur l'axe X
    for (let i = 0; i < uvAttribute.count; i++) {
      const u = uvArray[i * 2];
      uvArray[i * 2] = uvStart + u * (uvEnd - uvStart);
    }

    uvAttribute.needsUpdate = true;
    return geo;
  }, [width, height, uvStart, uvEnd]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive={new THREE.Color(1, 1, 1)}
        emissiveIntensity={emissiveIntensity}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
