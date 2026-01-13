import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";

interface UScreenProps {
  videoUrl: string;
  width?: number;
  height?: number;
  depth?: number;
  cornerRadius?: number;
  onVideoReady?: (video: HTMLVideoElement) => void;
}

/**
 * Crée une géométrie en U avec coins arrondis
 * La forme est générée comme un seul mesh continu pour des UV parfaits
 */
function createUShapeGeometry(
  width: number,
  height: number,
  depth: number,
  cornerRadius: number,
  cornerSegments: number = 16,
): THREE.BufferGeometry {
  const r = Math.min(cornerRadius, width / 2, depth);

  // Construire le chemin du U (vue de dessus, de l'intérieur)
  // On part du bas du mur droit, on monte, coin droit, mur du fond, coin gauche, mur gauche
  const points: THREE.Vector2[] = [];

  // Mur droit (de Z=0 à Z=depth-r)
  const rightWallLength = depth - r;
  const numPointsWall = 10;

  for (let i = 0; i <= numPointsWall; i++) {
    const t = i / numPointsWall;
    points.push(new THREE.Vector2(width / 2, t * rightWallLength));
  }

  // Coin droit (arc de 90°)
  for (let i = 1; i <= cornerSegments; i++) {
    const angle = (i / cornerSegments) * (Math.PI / 2);
    const x = width / 2 - r + Math.cos(angle) * r;
    const z = depth - r + Math.sin(angle) * r;
    points.push(new THREE.Vector2(x, z));
  }

  // Mur du fond (de X=width/2-r à X=-width/2+r)
  const backWallLength = width - 2 * r;
  for (let i = 1; i <= numPointsWall; i++) {
    const t = i / numPointsWall;
    const x = width / 2 - r - t * backWallLength;
    points.push(new THREE.Vector2(x, depth));
  }

  // Coin gauche (arc de 90°)
  for (let i = 1; i <= cornerSegments; i++) {
    const angle = Math.PI / 2 + (i / cornerSegments) * (Math.PI / 2);
    const x = -width / 2 + r + Math.cos(angle) * r;
    const z = depth - r + Math.sin(angle) * r;
    points.push(new THREE.Vector2(x, z));
  }

  // Mur gauche (de Z=depth-r à Z=0)
  for (let i = 1; i <= numPointsWall; i++) {
    const t = i / numPointsWall;
    const z = depth - r - t * (depth - r);
    points.push(new THREE.Vector2(-width / 2, z));
  }

  // Calculer la longueur totale du chemin pour les UV
  let totalLength = 0;
  const lengths: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dz = points[i].y - points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dz * dz);
    lengths.push(totalLength);
  }

  // Créer les vertices et UVs
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const u = lengths[i] / totalLength;

    // Vertex bas
    vertices.push(p.x, 0, p.y);
    uvs.push(u, 0);

    // Vertex haut
    vertices.push(p.x, height, p.y);
    uvs.push(u, 1);
  }

  // Créer les faces (triangles)
  for (let i = 0; i < points.length - 1; i++) {
    const bl = i * 2; // bas gauche
    const tl = i * 2 + 1; // haut gauche
    const br = i * 2 + 2; // bas droite
    const tr = i * 2 + 3; // haut droite

    // Triangle 1
    indices.push(bl, br, tl);
    // Triangle 2
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

/**
 * Écran en U avec coins arrondis et support vidéo panoramique
 * La vidéo 5760x1080 est mappée sur toute la surface de manière continue
 */
export function UScreen({
  videoUrl,
  width = 10,
  height = 3,
  depth = 10,
  cornerRadius = 1,
  onVideoReady,
}: UScreenProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const controls = useControls("Écran U", {
    width: { value: width, min: 5, max: 20, step: 0.5 },
    height: { value: height, min: 1, max: 10, step: 0.5 },
    depth: { value: depth, min: 5, max: 20, step: 0.5 },
    cornerRadius: { value: cornerRadius, min: 0.1, max: 3, step: 0.1 },
    emissiveIntensity: { value: 1, min: 0, max: 3, step: 0.1 },
  });

  // Création de la vidéo et texture
  useEffect(() => {
    if (!videoUrl) {
      console.error("videoUrl is undefined");
      return;
    }

    console.log("Loading video:", videoUrl);

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

    video.play().catch((err) => console.error("Video play error:", err));

    if (onVideoReady) {
      onVideoReady(video);
    }

    return () => {
      video.pause();
      video.src = "";
      texture.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  // Mise à jour de la texture vidéo
  useFrame(() => {
    if (videoTexture && videoRef.current && !videoRef.current.paused) {
      videoTexture.needsUpdate = true;
    }
  });

  // Créer la géométrie du U
  const geometry = useMemo(() => {
    return createUShapeGeometry(
      controls.width,
      controls.height,
      controls.depth,
      controls.cornerRadius,
      16,
    );
  }, [controls.width, controls.height, controls.depth, controls.cornerRadius]);

  if (!videoTexture) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, 0, -controls.depth / 2]}
    >
      <meshStandardMaterial
        map={videoTexture}
        emissiveMap={videoTexture}
        emissive={new THREE.Color(1, 1, 1)}
        emissiveIntensity={controls.emissiveIntensity}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
