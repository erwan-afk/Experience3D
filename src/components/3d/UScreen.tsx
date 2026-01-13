import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";
import type { ParticleEffectType } from "../../types/particles";
import { particleEffects } from "../../config/particles.config";
import {
  particleVertexShader,
  particleFragmentShader,
} from "../../shaders/particles";

interface UScreenProps {
  videoUrl?: string;
  particleEffect?: ParticleEffectType;
  showParticles?: boolean;
  width?: number;
  height?: number;
  depth?: number;
  cornerRadius?: number;
  onVideoReady?: (video: HTMLVideoElement) => void;
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
}: UScreenProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();

  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Système de particules GPU avec physique CPU
  const particleSceneRef = useRef<THREE.Scene | null>(null);
  const particleCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const particleMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const particlePointsRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<ParticleData[]>([]);
  const [particleTexture, setParticleTexture] = useState<THREE.Texture | null>(
    null,
  );

  const controls = useControls("Écran U", {
    width: { value: width, min: 5, max: 20, step: 0.5 },
    height: { value: height, min: 1, max: 10, step: 0.5 },
    depth: { value: depth, min: 5, max: 20, step: 0.5 },
    cornerRadius: { value: cornerRadius, min: 0.1, max: 3, step: 0.1 },
    emissiveIntensity: { value: 1, min: 0, max: 3, step: 0.1 },
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
      particleSceneRef.current = null;
      particleCameraRef.current = null;
      particlePointsRef.current = null;
      particleDataRef.current = [];
      setParticleTexture(null);
      return;
    }

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

    for (let i = 0; i < count; i++) {
      const x = Math.random() * PARTICLE_CANVAS_WIDTH;
      const y = Math.random() * PARTICLE_CANVAS_HEIGHT;
      const colorHex =
        colorOptions[Math.floor(Math.random() * colorOptions.length)];

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
  }, [showParticles, particleEffect]);

  // Animation loop - physique sur CPU, rendu sur GPU
  useFrame((state, delta) => {
    // Mise à jour vidéo
    if (
      !showParticles &&
      videoTexture &&
      videoRef.current &&
      !videoRef.current.paused
    ) {
      videoTexture.needsUpdate = true;
      return;
    }

    // Mise à jour particules
    if (
      showParticles &&
      particleEffect !== "none" &&
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

          if (particleEffect === "dust") {
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

  if (!currentTexture) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, 0, -controls.depth / 2]}
    >
      <meshStandardMaterial
        map={currentTexture}
        emissiveMap={currentTexture}
        emissive={new THREE.Color(1, 1, 1)}
        emissiveIntensity={controls.emissiveIntensity}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
