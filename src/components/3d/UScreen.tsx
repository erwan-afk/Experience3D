import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useControls } from "leva";
import type { ParticleEffectType } from "../../types/particles";
import { particleEffects } from "../../config/particles.config";
import {
  particleVertexShader,
  particleFragmentShader,
} from "../../shaders/particles";
import {
  FBO,
  createPositionTexture,
  extractPositions,
  getOptimalTextureSize,
} from "../../utils/FBO";
import {
  simulationVertexShader,
  simulationFragmentShader,
  morphingVertexShader,
  morphingFragmentShader,
} from "../../shaders/morphing";
interface UScreenProps {
  videoUrl?: string;
  particleEffect?: ParticleEffectType;
  showParticles?: boolean;
  width?: number;
  height?: number;
  depth?: number;
  cornerRadius?: number;
  onVideoReady?: (video: HTMLVideoElement) => void;
  onTextureReady?: (texture: THREE.Texture | null) => void;
  transitionOut?: boolean;
  onTransitionComplete?: () => void;
}

// Résolution du canvas de particules (identique aux vidéos)
const PARTICLE_CANVAS_WIDTH = 5760;
const PARTICLE_CANVAS_HEIGHT = 1080;

// Limites de la zone de jeu
const PLAYER_BOUNDS = {
  minX: -4,
  maxX: 4,
  minZ: -4,
  maxZ: 4,
};

const boundsRangeX = PLAYER_BOUNDS.maxX - PLAYER_BOUNDS.minX;
const boundsRangeZ = PLAYER_BOUNDS.maxZ - PLAYER_BOUNDS.minZ;

// Structure pour stocker les données de particules côté CPU
interface ParticleData {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  originX: number; // Position d'origine pour le retour naturel
  originY: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  color: [number, number, number];
  // Pour l'effet de vague sur les veines
  wavePhase: number; // Phase basée sur la position Y normalisée (0 = bas, 1 = haut)
  branchDepth: number; // Profondeur de la branche (0 = tronc principal)
}

/**
 * Convertit la position du joueur en coordonnées sur le canvas
 */
function playerPositionToCanvas(
  playerX: number,
  playerZ: number,
): { x: number; y: number; distance: number } {
  const normX = (playerX - PLAYER_BOUNDS.minX) / boundsRangeX;
  const normZ = (playerZ - PLAYER_BOUNDS.minZ) / boundsRangeZ;

  const distToRightWall = 1 - normX;
  const distToLeftWall = normX;
  const distToBackWall = 1 - normZ;

  let canvasX: number;
  let minDist: number;

  if (distToRightWall <= distToLeftWall && distToRightWall <= distToBackWall) {
    canvasX = normZ * (PARTICLE_CANVAS_WIDTH / 3);
    minDist = distToRightWall;
  } else if (
    distToLeftWall <= distToRightWall &&
    distToLeftWall <= distToBackWall
  ) {
    canvasX =
      (PARTICLE_CANVAS_WIDTH * 2) / 3 +
      (1 - normZ) * (PARTICLE_CANVAS_WIDTH / 3);
    minDist = distToLeftWall;
  } else {
    canvasX =
      PARTICLE_CANVAS_WIDTH / 3 + (1 - normX) * (PARTICLE_CANVAS_WIDTH / 3);
    minDist = distToBackWall;
  }

  return {
    x: canvasX,
    y: PARTICLE_CANVAS_HEIGHT * 0.5,
    distance: minDist,
  };
}

/**
 * Crée une géométrie en U avec coins arrondis
 */
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

/**
 * Génère un réseau de veines 2D pour l'effet veins
 */
function generateVeinNetwork2D(
  particleCount: number,
  numRoots: number,
  maxDepth: number,
  branchProbability: number,
): { x: number; y: number; depth: number }[] {
  const segments: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    depth: number;
  }[] = [];
  const segmentLength = 60;
  const maxSegments = 2000;

  for (let root = 0; root < numRoots; root++) {
    if (segments.length >= maxSegments) break;

    // Point de départ en bas du canvas
    const startX = Math.random() * PARTICLE_CANVAS_WIDTH;
    const startY =
      PARTICLE_CANVAS_HEIGHT * 0.95 +
      Math.random() * (PARTICLE_CANVAS_HEIGHT * 0.05);

    // Direction initiale vers le haut
    let dirX = (Math.random() - 0.5) * 0.4;
    let dirY = -0.8 - Math.random() * 0.2;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    dirX /= len;
    dirY /= len;

    // Queue de branches à traiter
    const queue: {
      x: number;
      y: number;
      dirX: number;
      dirY: number;
      depth: number;
      remaining: number;
    }[] = [
      {
        x: startX,
        y: startY,
        dirX,
        dirY,
        depth: 0,
        remaining: 20,
      },
    ];

    while (queue.length > 0 && segments.length < maxSegments) {
      const branch = queue.shift()!;

      if (branch.remaining <= 0) continue;
      if (branch.y < 20) continue;
      if (branch.x < 20 || branch.x > PARTICLE_CANVAS_WIDTH - 20) continue;

      // Calculer le point suivant
      const actualLength = segmentLength * (1 - branch.depth * 0.1);
      const nextX = branch.x + branch.dirX * actualLength;
      const nextY = branch.y + branch.dirY * actualLength;

      // Ajouter le segment
      segments.push({
        x1: branch.x,
        y1: branch.y,
        x2: nextX,
        y2: nextY,
        depth: branch.depth,
      });

      // Continuer la branche avec déviation
      let newDirX = branch.dirX + (Math.random() - 0.5) * 0.4;
      let newDirY = branch.dirY + (Math.random() - 0.5) * 0.2;
      const newLen = Math.sqrt(newDirX * newDirX + newDirY * newDirY);
      newDirX /= newLen;
      newDirY /= newLen;

      queue.push({
        x: nextX,
        y: nextY,
        dirX: newDirX,
        dirY: newDirY,
        depth: branch.depth,
        remaining: branch.remaining - 1,
      });

      // Créer des branches latérales
      if (
        Math.random() < branchProbability &&
        branch.depth < maxDepth &&
        branch.remaining > 4
      ) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const angle = side * (0.5 + Math.random() * 0.4);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const branchDirX = branch.dirX * cos - branch.dirY * sin;
        const branchDirY = branch.dirX * sin + branch.dirY * cos;

        queue.push({
          x: nextX,
          y: nextY,
          dirX: branchDirX,
          dirY: branchDirY,
          depth: branch.depth + 1,
          remaining: Math.floor(branch.remaining * 0.5),
        });
      }
    }
  }

  // Distribuer les particules sur les segments
  const positions: { x: number; y: number; depth: number }[] = [];

  if (segments.length === 0) {
    // Fallback: positions aléatoires
    for (let i = 0; i < particleCount; i++) {
      positions.push({
        x: Math.random() * PARTICLE_CANVAS_WIDTH,
        y: Math.random() * PARTICLE_CANVAS_HEIGHT,
        depth: 0,
      });
    }
    return positions;
  }

  // Calculer la longueur totale
  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (const seg of segments) {
    const len = Math.sqrt((seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2);
    segmentLengths.push(len);
    totalLength += len;
  }

  // Distribuer les particules
  for (let i = 0; i < particleCount; i++) {
    const targetLen = Math.random() * totalLength;
    let accLen = 0;
    let selectedSeg = segments[0];
    let t = 0;

    for (let j = 0; j < segments.length; j++) {
      if (accLen + segmentLengths[j] >= targetLen) {
        selectedSeg = segments[j];
        t = (targetLen - accLen) / segmentLengths[j];
        break;
      }
      accLen += segmentLengths[j];
    }

    // Interpoler + jitter
    const jitter = 15 * (1 - selectedSeg.depth * 0.15);
    positions.push({
      x:
        selectedSeg.x1 +
        (selectedSeg.x2 - selectedSeg.x1) * t +
        (Math.random() - 0.5) * jitter,
      y:
        selectedSeg.y1 +
        (selectedSeg.y2 - selectedSeg.y1) * t +
        (Math.random() - 0.5) * jitter,
      depth: selectedSeg.depth,
    });
  }

  return positions;
}

/**
 * Parse une couleur hex en RGB normalisé
 */
function hexToRgbNormalized(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

/**
 * Écran en U avec support vidéo OU animation de particules GPU
 */
export function UScreen({
  videoUrl,
  particleEffect = "none",
  showParticles = false,
  width = 10,
  height = 3,
  depth = 10,
  cornerRadius = 1,
  onVideoReady,
  onTextureReady,
  transitionOut = false,
  onTransitionComplete,
}: UScreenProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();

  // État pour la transition de descente
  const [yOffset, setYOffset] = useState(0);
  const transitionCompleteRef = useRef(false);

  // Réinitialiser la position quand transitionOut redevient false
  useEffect(() => {
    if (!transitionOut) {
      setYOffset(0);
      transitionCompleteRef.current = false;
    }
  }, [transitionOut]);

  // Charger les modèles GLB pour le morphing (seulement si effet morphing)
  const isMorphing = particleEffect === "morphing" && showParticles;
  const gltf1 = useGLTF(
    isMorphing ? "/models/morph1.glb" : "/models/morph1.glb",
  );
  const gltf2 = useGLTF(
    isMorphing ? "/models/morph2.glb" : "/models/morph2.glb",
  );
  const gltf3 = useGLTF(
    isMorphing ? "/models/morph3.glb" : "/models/morph3.glb",
  );

  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Système de particules GPU avec physique CPU
  const particleSceneRef = useRef<THREE.Scene | null>(null);
  const particleCameraRef = useRef<
    THREE.OrthographicCamera | THREE.PerspectiveCamera | null
  >(null);
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const particleMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const particlePointsRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<ParticleData[]>([]);
  const [particleTexture, setParticleTexture] = useState<THREE.Texture | null>(
    null,
  );

  // Système de morphing 3D GPGPU
  const morphingFBORef = useRef<FBO | null>(null);
  const morphingSimMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const morphingRenderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const morphingTexturesRef = useRef<{
    textureA: THREE.DataTexture | null;
    textureB: THREE.DataTexture | null;
    textureC: THREE.DataTexture | null;
  }>({ textureA: null, textureB: null, textureC: null });

  const controls = useControls("Écran U", {
    width: { value: width, min: 5, max: 20, step: 0.5 },
    height: { value: height, min: 1, max: 10, step: 0.5 },
    depth: { value: depth, min: 5, max: 20, step: 0.5 },
    cornerRadius: { value: cornerRadius, min: 0.1, max: 3, step: 0.1 },
    emissiveIntensity: { value: 1, min: 0, max: 3, step: 0.1 },
  });

  // Contrôles pour la caméra du morphing
  const morphingControls = useControls("Morphing Camera", {
    zoom: { value: 1, min: 0.2, max: 3, step: 0.1 },
    offsetY: { value: 90, min: -200, max: 200, step: 10 },
    buildDuration: { value: 8, min: 1, max: 30, step: 1 }, // Durée état "build" (forme stable) en secondes
    morphDuration: { value: 3, min: 0.5, max: 10, step: 0.5 }, // Durée état "morphing" (transition) en secondes
  });

  // Création de la vidéo
  useEffect(() => {
    if (!videoUrl || showParticles) return;

    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.loop = false; // Pas de loop pour permettre l'événement 'ended'
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
      setVideoTexture(null);
    };
  }, [videoUrl, showParticles, onVideoReady]);

  // Création du système de particules GPU
  useEffect(() => {
    if (!showParticles || particleEffect === "none") {
      if (renderTargetRef.current) {
        renderTargetRef.current.dispose();
        renderTargetRef.current = null;
      }
      if (particleMaterialRef.current) {
        particleMaterialRef.current.dispose();
        particleMaterialRef.current = null;
      }
      if (morphingFBORef.current) {
        morphingFBORef.current.dispose();
        morphingFBORef.current = null;
      }
      particleSceneRef.current = null;
      particleCameraRef.current = null;
      particlePointsRef.current = null;
      particleDataRef.current = [];
      setParticleTexture(null);
      return;
    }

    // === CAS MORPHING 3D ===
    if (particleEffect === "morphing") {
      const config = particleEffects.morphing;
      const textureSize = getOptimalTextureSize(config.particleCount);

      // Extraire les positions des modèles GLB
      const getPositionsFromGLTF = (
        gltf: any,
        scale: number = 1,
      ): Float32Array => {
        let allPositions: number[] = [];
        gltf.scene.traverse((child: any) => {
          if (child.isMesh && child.geometry) {
            const pos = extractPositions(child.geometry);
            // Appliquer aussi les transformations du mesh (position, rotation, scale)
            const matrix = child.matrixWorld;
            for (let i = 0; i < pos.length; i += 3) {
              const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]);
              v.applyMatrix4(matrix);
              allPositions.push(v.x * scale, v.y * scale, v.z * scale);
            }
          }
        });
        return new Float32Array(allPositions);
      };

      // Calculer la bounding box pour normaliser l'échelle
      const getBoundingBox = (
        positions: Float32Array,
      ): { min: THREE.Vector3; max: THREE.Vector3; size: number } => {
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < positions.length; i += 3) {
          min.x = Math.min(min.x, positions[i]);
          min.y = Math.min(min.y, positions[i + 1]);
          min.z = Math.min(min.z, positions[i + 2]);
          max.x = Math.max(max.x, positions[i]);
          max.y = Math.max(max.y, positions[i + 1]);
          max.z = Math.max(max.z, positions[i + 2]);
        }
        const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
        return { min, max, size };
      };

      // Extraire et normaliser les positions
      const rawPos1 = getPositionsFromGLTF(gltf1);
      const rawPos2 = getPositionsFromGLTF(gltf2);
      const rawPos3 = getPositionsFromGLTF(gltf3);

      // Normaliser chaque modèle individuellement à la même taille cible
      const bb1 = getBoundingBox(rawPos1);
      const bb2 = getBoundingBox(rawPos2);
      const bb3 = getBoundingBox(rawPos3);

      // Échelle cible (chaque modèle fera environ 420 unités pour remplir l'écran)
      const targetSize = 300;
      const scale1 = bb1.size > 0 ? targetSize / bb1.size : 1;
      const scale2 = bb2.size > 0 ? targetSize / bb2.size : 1;
      const scale3 = bb3.size > 0 ? targetSize / bb3.size : 1;

      console.log("Morphing GLB info:", {
        model1: {
          vertexCount: rawPos1.length / 3,
          size: bb1.size,
          scale: scale1,
        },
        model2: {
          vertexCount: rawPos2.length / 3,
          size: bb2.size,
          scale: scale2,
        },
        model3: {
          vertexCount: rawPos3.length / 3,
          size: bb3.size,
          scale: scale3,
        },
      });

      // Appliquer la normalisation individuelle + centrer chaque modèle
      const pos1 = new Float32Array(rawPos1.length);
      const pos2 = new Float32Array(rawPos2.length);
      const pos3 = new Float32Array(rawPos3.length);

      // Centrer et normaliser modèle 1
      const center1 = new THREE.Vector3()
        .addVectors(bb1.min, bb1.max)
        .multiplyScalar(0.5);
      for (let i = 0; i < rawPos1.length; i += 3) {
        pos1[i] = (rawPos1[i] - center1.x) * scale1;
        pos1[i + 1] = (rawPos1[i + 1] - center1.y) * scale1;
        pos1[i + 2] = (rawPos1[i + 2] - center1.z) * scale1;
      }

      // Centrer et normaliser modèle 2
      const center2 = new THREE.Vector3()
        .addVectors(bb2.min, bb2.max)
        .multiplyScalar(0.5);
      for (let i = 0; i < rawPos2.length; i += 3) {
        pos2[i] = (rawPos2[i] - center2.x) * scale2;
        pos2[i + 1] = (rawPos2[i + 1] - center2.y) * scale2;
        pos2[i + 2] = (rawPos2[i + 2] - center2.z) * scale2;
      }

      // Centrer et normaliser modèle 3
      const center3 = new THREE.Vector3()
        .addVectors(bb3.min, bb3.max)
        .multiplyScalar(0.5);
      for (let i = 0; i < rawPos3.length; i += 3) {
        pos3[i] = (rawPos3[i] - center3.x) * scale3;
        pos3[i + 1] = (rawPos3[i + 1] - center3.y) * scale3;
        pos3[i + 2] = (rawPos3[i + 2] - center3.z) * scale3;
      }

      const textureA = createPositionTexture(pos1, textureSize);
      const textureB = createPositionTexture(pos2, textureSize);
      const textureC = createPositionTexture(pos3, textureSize);
      morphingTexturesRef.current = { textureA, textureB, textureC };

      // Créer le matériau de simulation
      const simMaterial = new THREE.ShaderMaterial({
        vertexShader: simulationVertexShader,
        fragmentShader: simulationFragmentShader,
        uniforms: {
          uTextureA: { value: textureA },
          uTextureB: { value: textureB },
          uTextureC: { value: textureC },
          uMorphT: { value: 0 }, // 0 = forme actuelle, 1 = forme suivante
          uFormIndex: { value: 0 }, // 0, 1 ou 2
          uScreenOffset: { value: 1 }, // Position X: 1 = droite, 0 = centre, -1 = gauche
          uTime: { value: 0 },
        },
      });
      morphingSimMaterialRef.current = simMaterial;

      // Créer le FBO
      const fbo = new FBO({
        width: textureSize,
        height: textureSize,
        renderer: gl,
        simulationMaterial: simMaterial,
      });
      morphingFBORef.current = fbo;

      // Créer la scène de rendu des particules
      const particleScene = new THREE.Scene();
      particleScene.background = new THREE.Color(0x000000);
      particleSceneRef.current = particleScene;

      // Caméra orthographique pour voir les 3 écrans (résolution réduite pour performance)
      const morphRenderWidth = 1920;
      const morphRenderHeight = 360;
      // L'écran en U fait 5760x1080, ratio = 5.33
      // viewWidth définit l'espace 3D visible, chaque écran = viewWidth/3
      const viewWidth = 3000;
      const viewHeight = viewWidth / (5760 / 1080); // Garder le ratio de l'écran final
      const particleCamera = new THREE.OrthographicCamera(
        -viewWidth / 2,
        viewWidth / 2,
        viewHeight / 2,
        -viewHeight / 2,
        0.1,
        2000,
      );
      particleCamera.position.set(0, 0, 500);
      particleCamera.lookAt(0, 0, 0);
      particleCameraRef.current = particleCamera;

      // RenderTarget pour le rendu final
      const renderTarget = new THREE.WebGLRenderTarget(
        morphRenderWidth,
        morphRenderHeight,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        },
      );
      renderTargetRef.current = renderTarget;

      // Créer les particules
      const count = textureSize * textureSize;
      const positions = new Float32Array(count * 3);
      const references = new Float32Array(count * 2);
      const sizes = new Float32Array(count);
      const colors = new Float32Array(count * 3);
      const alphas = new Float32Array(count);

      const colorOptions = Array.isArray(config.color)
        ? config.color
        : [config.color];

      for (let i = 0; i < count; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        references[i * 2] = (i % textureSize) / textureSize;
        references[i * 2 + 1] = Math.floor(i / textureSize) / textureSize;

        sizes[i] = config.size * 120 * (0.5 + Math.random() * 0.5);

        const colorHex =
          colorOptions[Math.floor(Math.random() * colorOptions.length)];
        const color = new THREE.Color(colorHex);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = 0.8 + Math.random() * 0.2;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute(
        "aReference",
        new THREE.BufferAttribute(references, 2),
      );
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

      // Matériau de rendu des particules
      const renderMaterial = new THREE.ShaderMaterial({
        vertexShader: morphingVertexShader,
        fragmentShader: morphingFragmentShader,
        uniforms: {
          uPositions: { value: fbo.texture },
          uSize: { value: config.size },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uResolution: {
            value: new THREE.Vector2(morphRenderWidth, morphRenderHeight),
          },
          uProgress: { value: 0 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      morphingRenderMaterialRef.current = renderMaterial;

      const points = new THREE.Points(geometry, renderMaterial);
      particlePointsRef.current = points;
      particleScene.add(points);

      setParticleTexture(renderTarget.texture);

      return () => {
        fbo.dispose();
        geometry.dispose();
        simMaterial.dispose();
        renderMaterial.dispose();
        textureA.dispose();
        textureB.dispose();
        textureC.dispose();
        renderTarget.dispose();
      };
    }

    // === CAS PARTICULES 2D STANDARD ===
    const config = particleEffects[particleEffect];
    const count = config.particleCount;

    // Créer la scène de particules
    const particleScene = new THREE.Scene();
    particleScene.background = new THREE.Color(0x000000);
    particleSceneRef.current = particleScene;

    // Caméra orthographique
    const particleCamera = new THREE.OrthographicCamera(
      0,
      PARTICLE_CANVAS_WIDTH,
      PARTICLE_CANVAS_HEIGHT,
      0,
      0.1,
      10,
    );
    particleCamera.position.z = 1;
    particleCameraRef.current = particleCamera;

    // RenderTarget
    const renderTarget = new THREE.WebGLRenderTarget(
      PARTICLE_CANVAS_WIDTH,
      PARTICLE_CANVAS_HEIGHT,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      },
    );
    renderTargetRef.current = renderTarget;

    // Créer les données de particules côté CPU
    const colorOptions = Array.isArray(config.color)
      ? config.color
      : [config.color];
    const particles: ParticleData[] = [];

    // Générer les positions selon l'effet
    let veinPositions: { x: number; y: number; depth: number }[] | null = null;
    const veinRatio = 0.7; // 70% sur les veines, 30% aléatoires

    if (particleEffect === "veins") {
      // Générer un réseau de veines 2D (seulement pour la portion veine)
      const veinCount = Math.floor(count * veinRatio);
      veinPositions = generateVeinNetwork2D(veinCount, 35, 5, 0.45);
    }

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let colorIndex = Math.floor(Math.random() * colorOptions.length);
      let wavePhase = 0;
      let branchDepth = -1; // -1 = particule aléatoire (pas sur une veine)

      if (veinPositions && i < veinPositions.length) {
        // Utiliser les positions des veines
        x = veinPositions[i].x;
        y = veinPositions[i].y;
        branchDepth = veinPositions[i].depth;
        // Couleur basée sur la profondeur (rouge foncé pour les branches, jaune pour les troncs)
        const depthRatio = branchDepth / 5;
        colorIndex = Math.floor(depthRatio * (colorOptions.length - 1));
        // Phase de vague basée sur la position Y (inversée car Y=0 est en haut)
        // Plus la particule est haute (Y petit), plus la phase est avancée
        wavePhase = 1 - y / PARTICLE_CANVAS_HEIGHT;
      } else {
        // Particules aléatoires flottantes
        x = Math.random() * PARTICLE_CANVAS_WIDTH;
        y = Math.random() * PARTICLE_CANVAS_HEIGHT;
      }

      const colorHex = colorOptions[colorIndex];

      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        size: config.size * 80 * (0.5 + Math.random() * 0.5),
        color: hexToRgbNormalized(colorHex),
        wavePhase,
        branchDepth,
      });
    }
    particleDataRef.current = particles;

    // Créer les buffers GPU
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = 0;
      sizes[i] = p.size;
      colors[i * 3] = p.color[0];
      colors[i * 3 + 1] = p.color[1];
      colors[i * 3 + 2] = p.color[2];
      alphas[i] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    particleMaterialRef.current = material;

    const points = new THREE.Points(geometry, material);
    particlePointsRef.current = points;
    particleScene.add(points);

    setParticleTexture(renderTarget.texture);

    return () => {
      geometry.dispose();
      material.dispose();
      renderTarget.dispose();
    };
  }, [showParticles, particleEffect, gl, gltf1, gltf2, gltf3]);

  // Animation loop - physique sur CPU, rendu sur GPU
  useFrame((state, delta) => {
    // Transition de descente des écrans
    if (transitionOut && yOffset > -5) {
      const speed = 5 / 2; // -5 unités en 2 secondes
      setYOffset((prev) => Math.max(-5, prev - delta * speed));
    }

    // Appeler le callback quand la transition est terminée
    if (transitionOut && yOffset <= -5 && !transitionCompleteRef.current) {
      transitionCompleteRef.current = true;
      if (onTransitionComplete) {
        onTransitionComplete();
      }
    }

    // Mise à jour vidéo
    if (
      !showParticles &&
      videoTexture &&
      videoRef.current &&
      !videoRef.current.paused
    ) {
      videoTexture.needsUpdate = true;
    }

    // Sortir tôt si vidéo (pas de particules à mettre à jour)
    if (!showParticles) {
      return;
    }

    // Mise à jour morphing 3D
    if (
      showParticles &&
      particleEffect === "morphing" &&
      morphingFBORef.current &&
      morphingSimMaterialRef.current &&
      morphingRenderMaterialRef.current &&
      particleSceneRef.current &&
      particleCameraRef.current &&
      renderTargetRef.current
    ) {
      const time = state.clock.elapsedTime;

      // Calculer l'état build/morphing
      const buildDur = morphingControls.buildDuration;
      const morphDur = morphingControls.morphDuration;
      const cycleDuration = buildDur + morphDur; // Durée d'un cycle par forme
      const totalCycle = cycleDuration * 3; // Cycle complet (3 formes)

      const cycleTime = time % totalCycle;
      const formIndex = Math.floor(cycleTime / cycleDuration); // 0, 1 ou 2
      const timeInCycle = cycleTime % cycleDuration;

      // État: build (forme stable) ou morphing (transition)
      let morphT = 0;
      if (timeInCycle > buildDur) {
        // État morphing: interpoler de 0 à 1
        morphT = (timeInCycle - buildDur) / morphDur;
      }
      // Sinon état build: morphT reste à 0

      // Calculer le screenOffset pour le déplacement entre écrans
      // Position des écrans: droite = 1, centre = 0, gauche = -1
      // Forme 0 sur écran droite (1), forme 1 sur écran centre (0), forme 2 sur écran gauche (-1)
      const screenPositions = [1, 0, -1]; // droite, centre, gauche
      const currentScreenPos = screenPositions[formIndex];
      const nextScreenPos = screenPositions[(formIndex + 1) % 3];

      // Interpoler entre la position actuelle et la suivante pendant le morphing
      const screenOffset =
        currentScreenPos + (nextScreenPos - currentScreenPos) * morphT;

      // Mettre à jour les uniforms de simulation
      morphingSimMaterialRef.current.uniforms.uMorphT.value = morphT;
      morphingSimMaterialRef.current.uniforms.uFormIndex.value = formIndex;
      morphingSimMaterialRef.current.uniforms.uScreenOffset.value =
        screenOffset;
      morphingSimMaterialRef.current.uniforms.uTime.value = time;

      // Mettre à jour le FBO (calcul des positions sur GPU)
      morphingFBORef.current.update();

      // Mettre à jour les uniforms de rendu
      morphingRenderMaterialRef.current.uniforms.uPositions.value =
        morphingFBORef.current.texture;
      morphingRenderMaterialRef.current.uniforms.uProgress.value = morphT;
      morphingRenderMaterialRef.current.uniforms.uTime.value = time;

      // Rendre sur le RenderTarget
      const currentRenderTarget = gl.getRenderTarget();
      gl.setRenderTarget(renderTargetRef.current);
      gl.clear();
      gl.render(particleSceneRef.current, particleCameraRef.current);
      gl.setRenderTarget(currentRenderTarget);
      return;
    }

    // Mise à jour particules 2D
    if (
      showParticles &&
      particleEffect !== "none" &&
      particleEffect !== "morphing" &&
      particleSceneRef.current &&
      particleCameraRef.current &&
      renderTargetRef.current &&
      particlePointsRef.current &&
      particleDataRef.current.length > 0
    ) {
      const time = state.clock.elapsedTime;
      const config = particleEffects[particleEffect];
      const particles = particleDataRef.current;
      const points = particlePointsRef.current;
      const positionAttr = points.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const alphaAttr = points.geometry.getAttribute(
        "aAlpha",
      ) as THREE.BufferAttribute;

      // Position du joueur sur le canvas
      const playerPos = playerPositionToCanvas(
        camera.position.x,
        camera.position.z,
      );
      const proximityFactor = 1 - Math.min(playerPos.distance, 0.5) * 2;

      // Paramètres du champ de force
      const forceRadius =
        config.forceFieldRadius * 400 * (0.5 + proximityFactor);
      const forceStrength =
        config.forceFieldStrength * 15 * (0.5 + proximityFactor * 2);

      // Mettre à jour chaque particule sur le CPU
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Champ de force - répulsion ou vortex selon l'effet
        const dx = p.baseX - playerPos.x;
        const dy = p.baseY - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < forceRadius && dist > 1) {
          const force = (1 - dist / forceRadius) * forceStrength;
          const dirX = dx / dist;
          const dirY = dy / dist;

          if (particleEffect === "veins") {
            // Pour les veines: répulsion légère qui revient vite à la position d'origine
            p.vx += dirX * force * 0.8;
            p.vy += dirY * force * 0.8;
          } else if (particleEffect === "dust") {
            // Vortex pour la poussière - rotation autour du joueur
            // Perpendiculaire + légère répulsion
            const vortexStrength = force * 1.5;
            const repelStrength = force * 0.3;
            p.vx += -dirY * vortexStrength + dirX * repelStrength;
            p.vy += dirX * vortexStrength + dirY * repelStrength;
          } else {
            // Répulsion normale pour les autres effets
            p.vx += dirX * force;
            p.vy += dirY * force;
          }
        }

        // Friction
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Retour très lent vers la position d'origine (flottement naturel)
        const driftX = (p.originX - p.baseX) * 0.002;
        const driftY = (p.originY - p.baseY) * 0.002;
        p.vx += driftX;
        p.vy += driftY;

        // Appliquer la vélocité à la position de base
        p.baseX += p.vx;
        p.baseY += p.vy;

        // Rebondir sur les bords
        if (p.baseX < 0) {
          p.baseX = 0;
          p.vx *= -0.5;
        }
        if (p.baseX > PARTICLE_CANVAS_WIDTH) {
          p.baseX = PARTICLE_CANVAS_WIDTH;
          p.vx *= -0.5;
        }
        if (p.baseY < 0) {
          p.baseY = 0;
          p.vy *= -0.5;
        }
        if (p.baseY > PARTICLE_CANVAS_HEIGHT) {
          p.baseY = PARTICLE_CANVAS_HEIGHT;
          p.vy *= -0.5;
        }

        // Animation selon le type d'effet (offset par rapport à baseX/baseY)
        let animX = 0;
        let animY = 0;
        let alpha = 1;

        if (particleEffect === "fireflies") {
          animX =
            Math.sin(time * 0.7 + p.phase) * 30 +
            Math.sin(time * 1.3 + p.phase * 2) * 15;
          animY =
            Math.cos(time * 0.5 + p.phase * 1.3) * 20 +
            Math.cos(time * 0.9 + p.phase) * 10;
          alpha = 0.5 + 0.5 * Math.sin(time * 2 + p.phase * 3);
        } else if (particleEffect === "veins") {
          if (p.branchDepth >= 0) {
            // Particules sur les veines - effet de vague doux
            const waveSpeed = 0.3;
            const waveFrequency = 1.2;
            const waveAmplitude = 6;

            const waveTime = time * waveSpeed - p.wavePhase * waveFrequency;
            const waveValue = Math.sin(waveTime * Math.PI * 2);
            const depthFactor = 1 - p.branchDepth * 0.1;

            animX = waveValue * waveAmplitude * depthFactor;
            animY = Math.cos(waveTime * Math.PI * 2) * 2 * depthFactor;
            alpha = 0.65 + 0.25 * Math.abs(waveValue);

            animX += Math.sin(time * 1.2 + p.phase) * 1;
            animY += Math.cos(time * 1 + p.phase) * 0.8;
          } else {
            // Particules aléatoires - feuilles emportées par le vent latéral
            const windDirection = p.phase > Math.PI ? 1 : -1;
            const gust = Math.sin(time * 0.3 + p.phase * 0.5) * 0.5 + 0.5;

            // Dérive horizontale continue
            const driftSpeed = 35;
            const driftOffset =
              (time * driftSpeed + p.phase * 300) %
              (PARTICLE_CANVAS_WIDTH * 0.4);
            animX = driftOffset * windDirection;

            // Oscillations verticales légères (flottement)
            animY =
              Math.sin(time * 1.5 + p.phase * 3) * 12 +
              Math.cos(time * 0.8 + p.phase * 2) * 8;

            // Petites oscillations horizontales supplémentaires
            animX += Math.sin(time * 2 + p.phase * 4) * 10 * gust;

            alpha = 0.35 + 0.25 * Math.sin(time * 1.2 + p.phase);
          }
        } else if (particleEffect === "snow") {
          const fallOffset =
            (time * 50 * config.speed + p.phase * 1000) %
            PARTICLE_CANVAS_HEIGHT;
          animY = -fallOffset;
          animX = Math.sin(time * 0.5 + p.phase * 2) * 20;
          alpha = 0.8;
        } else if (particleEffect === "stars") {
          alpha =
            0.3 +
            0.7 * Math.pow((Math.sin(time * 1.5 + p.phase * 5) + 1) / 2, 2);
        } else if (particleEffect === "dust") {
          animX = Math.sin(time * 0.3 * config.speed + p.phase) * 20;
          animY = Math.cos(time * 0.2 * config.speed + p.phase * 1.5) * 15;
          alpha = 0.6;
        } else if (particleEffect === "energy") {
          const radius = 30 + Math.sin(p.phase * 3) * 15;
          animX = Math.cos(time * config.speed + p.phase) * radius;
          animY = Math.sin(time * config.speed * 1.5 + p.phase) * radius * 0.6;
          alpha = 0.8 + 0.2 * Math.sin(time * 3 + p.phase);
        }

        // Position finale = base permanente + animation
        p.x = p.baseX + animX;
        p.y = p.baseY + animY;

        // Mettre à jour le buffer GPU
        positionAttr.array[i * 3] = p.x;
        positionAttr.array[i * 3 + 1] = p.y;
        alphaAttr.array[i] = alpha;
      }

      positionAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;

      // Rendre sur le RenderTarget
      const currentRenderTarget = gl.getRenderTarget();
      gl.setRenderTarget(renderTargetRef.current);
      gl.clear();
      gl.render(particleSceneRef.current, particleCameraRef.current);
      gl.setRenderTarget(currentRenderTarget);
    }
  });

  // Géométrie du U
  const geometry = useMemo(() => {
    return createUShapeGeometry(
      controls.width,
      controls.height,
      controls.depth,
      controls.cornerRadius,
      16,
    );
  }, [controls.width, controls.height, controls.depth, controls.cornerRadius]);

  const currentTexture = showParticles ? particleTexture : videoTexture;

  // Exposer la texture et la géométrie au parent pour la réflexion
  useEffect(() => {
    if (onTextureReady) {
      onTextureReady(currentTexture);
    }
  }, [currentTexture, onTextureReady]);

  // Ne pas rendre si la transition est terminée
  if (transitionOut && yOffset <= -5) {
    return null;
  }

  // Pendant la transition, on peut ne pas avoir de texture (morphing)
  // On rend quand même avec un écran noir pour la descente
  if (!currentTexture && !transitionOut) {
    return null;
  }

  return (
    <group>
      {/* Écran principal */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, yOffset, -controls.depth / 2]}
      >
        {currentTexture ? (
          <meshStandardMaterial
            map={currentTexture}
            emissiveMap={currentTexture}
            emissive={new THREE.Color(1, 1, 1)}
            emissiveIntensity={controls.emissiveIntensity}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        ) : (
          <meshBasicMaterial color="black" side={THREE.DoubleSide} />
        )}
      </mesh>
    </group>
  );
}
