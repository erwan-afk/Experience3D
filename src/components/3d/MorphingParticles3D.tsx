import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";
import { particleEffects } from "../../config/particles.config";
import {
  FBO,
  createPositionTexture,
  createColorTexture,
  getOptimalTextureSize,
} from "../../utils/FBO";
import { simulationVertexShader } from "../../shaders/morphing";

interface MorphingParticles3DProps {
  visible: boolean;
  buildDuration?: number;
  morphDuration?: number;
}

// Images PNG à charger
const IMAGE_URLS = [
  "/models/house.png",
  "/models/iegao.png",
  "/models/Foliage.png",
];

// Taille max pour les images (performance)
const MAX_IMAGE_SIZE = 256;

interface PixelData {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

// Cache global pour les données préchargées
let preloadedData: {
  positions: Float32Array[];
  colors: Float32Array[];
} | null = null;
let preloadPromise: Promise<void> | null = null;

/**
 * Extrait les positions ET couleurs des particules à partir d'une image PNG
 */
function extractPositionsAndColorsFromImage(
  imageData: ImageData,
  width: number,
  height: number,
  maxParticles: number,
): { positions: Float32Array; colors: Float32Array } {
  const pixels: PixelData[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      if (a > 50 && (r > 30 || g > 30 || b > 30)) {
        const px = (x / width - 0.5) * 2;
        const py = (0.5 - y / height) * 2;
        pixels.push({ x: px, y: py, r: r / 255, g: g / 255, b: b / 255 });
      }
    }
  }

  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 4);
  const numPixels = pixels.length;

  for (let i = 0; i < maxParticles; i++) {
    if (numPixels > 0) {
      const srcIdx = Math.floor((i / maxParticles) * numPixels);
      const pixel = pixels[srcIdx];
      positions[i * 3] = pixel.x;
      positions[i * 3 + 1] = pixel.y;
      positions[i * 3 + 2] = 0;
      colors[i * 4] = pixel.r;
      colors[i * 4 + 1] = pixel.g;
      colors[i * 4 + 2] = pixel.b;
      colors[i * 4 + 3] = 1;
    }
  }

  return { positions, colors };
}

/**
 * Charge une image et retourne ses données de pixels (redimensionnée si nécessaire)
 */
function loadImage(
  url: string,
): Promise<{ imageData: ImageData; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let targetWidth = img.width;
      let targetHeight = img.height;

      if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
        const scale = Math.min(
          MAX_IMAGE_SIZE / img.width,
          MAX_IMAGE_SIZE / img.height,
        );
        targetWidth = Math.floor(img.width * scale);
        targetHeight = Math.floor(img.height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      resolve({ imageData, width: targetWidth, height: targetHeight });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Précharge toutes les images et extrait les données (appelé une seule fois)
 */
async function preloadAllImages(maxParticles: number): Promise<void> {
  if (preloadedData) return;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const images = await Promise.all(IMAGE_URLS.map((url) => loadImage(url)));

    const extractedData = images.map((img) =>
      extractPositionsAndColorsFromImage(
        img.imageData,
        img.width,
        img.height,
        maxParticles,
      ),
    );

    preloadedData = {
      positions: extractedData.map((d) => d.positions),
      colors: extractedData.map((d) => d.colors),
    };
  })();

  return preloadPromise;
}

// Vertex shader
const vertexShaderWithColors = `
  uniform sampler2D uPositions;
  uniform sampler2D uColorA;
  uniform sampler2D uColorB;
  uniform sampler2D uColorC;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uMorphT;
  uniform float uFormIndex;

  attribute float aSize;
  attribute float aAlpha;
  attribute vec2 aReference;

  varying vec3 vColor;
  varying float vAlpha;

  vec3 smoothMix(vec3 a, vec3 b, float t) {
    float ease = t * t * (3.0 - 2.0 * t);
    return mix(a, b, ease);
  }

  void main() {
    vec3 pos = texture2D(uPositions, aReference).xyz;
    vec3 colorA = texture2D(uColorA, aReference).rgb;
    vec3 colorB = texture2D(uColorB, aReference).rgb;
    vec3 colorC = texture2D(uColorC, aReference).rgb;

    vec3 color;
    if (uFormIndex < 0.5) {
      color = smoothMix(colorA, colorB, uMorphT);
    } else if (uFormIndex < 1.5) {
      color = smoothMix(colorB, colorC, uMorphT);
    } else {
      color = smoothMix(colorC, colorA, uMorphT);
    }

    vColor = color;
    vAlpha = aAlpha;

    vec4 viewPosition = viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    gl_PointSize = aSize * uSize * uPixelRatio * 500.0;
    gl_PointSize *= (1.0 / -viewPosition.z);
    gl_PointSize = clamp(gl_PointSize, 4.0, 300.0);
  }
`;

// Fragment shader
const fragmentShaderSimple = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    if (dist > 0.5) discard;

    float circle = 1.0 - smoothstep(0.4, 0.5, dist);
    vec3 finalColor = vColor * 1.5;
    float lum = dot(finalColor, vec3(0.299, 0.587, 0.114));
    finalColor = mix(vec3(lum), finalColor, 1.3);

    gl_FragColor = vec4(finalColor, circle * vAlpha);
  }
`;

export function MorphingParticles3D({
  visible,
  buildDuration = 8,
  morphDuration = 3,
}: MorphingParticles3DProps) {
  const { gl } = useThree();

  const fboRef = useRef<FBO | null>(null);
  const simMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const renderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const texturesRef = useRef<THREE.DataTexture[]>([]);
  const colorTexturesRef = useRef<THREE.DataTexture[]>([]);
  const initializedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const controls = useControls("Morphing 3D", {
    buildDuration: { value: buildDuration, min: 1, max: 30, step: 1 },
    morphDuration: { value: morphDuration, min: 0.5, max: 10, step: 0.5 },
    scale: { value: 4, min: 1, max: 10, step: 0.5 },
    positionY: { value: 3, min: 0, max: 10, step: 0.5 },
    positionZ: { value: -8, min: -20, max: 0, step: 1 },
  });

  const config = useMemo(() => particleEffects.morphing, []);
  const textureSize = useMemo(
    () => getOptimalTextureSize(config.particleCount),
    [config.particleCount],
  );
  const maxParticles = textureSize * textureSize;

  // Précharger les images au mount (une seule fois, indépendamment de visible)
  useEffect(() => {
    preloadAllImages(maxParticles).then(() => {
      setDataLoaded(true);
    });
  }, [maxParticles]);

  // Initialiser le système GPU quand visible ET données chargées
  useEffect(() => {
    if (!visible || !dataLoaded || !preloadedData || initializedRef.current)
      return;

    const initGPU = () => {
      const { positions, colors } = preloadedData!;

      // Créer les textures
      const textures = positions.map((pos) =>
        createPositionTexture(pos, textureSize),
      );
      texturesRef.current = textures;

      const colorTextures = colors.map((col) =>
        createColorTexture(col, textureSize),
      );
      colorTexturesRef.current = colorTextures;

      // Shader de simulation
      const simMaterial = new THREE.ShaderMaterial({
        vertexShader: simulationVertexShader,
        fragmentShader: `
          uniform sampler2D uTextureA;
          uniform sampler2D uTextureB;
          uniform sampler2D uTextureC;
          uniform float uMorphT;
          uniform float uFormIndex;
          uniform vec3 uPosition;
          uniform float uScale;
          varying vec2 vUv;

          vec3 smoothMix(vec3 a, vec3 b, float t) {
            float ease = t * t * (3.0 - 2.0 * t);
            return mix(a, b, ease);
          }

          void main() {
            vec3 posA = texture2D(uTextureA, vUv).xyz;
            vec3 posB = texture2D(uTextureB, vUv).xyz;
            vec3 posC = texture2D(uTextureC, vUv).xyz;
            vec3 localPos;

            if (uFormIndex < 0.5) {
              localPos = smoothMix(posA, posB, uMorphT);
            } else if (uFormIndex < 1.5) {
              localPos = smoothMix(posB, posC, uMorphT);
            } else {
              localPos = smoothMix(posC, posA, uMorphT);
            }

            gl_FragColor = vec4(localPos * uScale + uPosition, 1.0);
          }
        `,
        uniforms: {
          uTextureA: { value: textures[0] },
          uTextureB: { value: textures[1] },
          uTextureC: { value: textures[2] || textures[0] },
          uMorphT: { value: 0 },
          uFormIndex: { value: 0 },
          uPosition: {
            value: new THREE.Vector3(0, controls.positionY, controls.positionZ),
          },
          uScale: { value: controls.scale },
        },
      });
      simMaterialRef.current = simMaterial;

      // FBO
      const fbo = new FBO({
        width: textureSize,
        height: textureSize,
        renderer: gl,
        simulationMaterial: simMaterial,
      });
      fboRef.current = fbo;

      // Geometry
      const count = textureSize * textureSize;
      const positionsAttr = new Float32Array(count * 3);
      const references = new Float32Array(count * 2);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        references[i * 2] = (i % textureSize) / textureSize;
        references[i * 2 + 1] = Math.floor(i / textureSize) / textureSize;
        sizes[i] = config.size;
        alphas[i] = 0.8 + Math.random() * 0.2;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positionsAttr, 3),
      );
      geometry.setAttribute(
        "aReference",
        new THREE.BufferAttribute(references, 2),
      );
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

      // Render material
      const renderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderWithColors,
        fragmentShader: fragmentShaderSimple,
        uniforms: {
          uPositions: { value: fbo.texture },
          uColorA: { value: colorTextures[0] },
          uColorB: { value: colorTextures[1] },
          uColorC: { value: colorTextures[2] || colorTextures[0] },
          uSize: { value: config.size * 2 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uMorphT: { value: 0 },
          uFormIndex: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      renderMaterialRef.current = renderMaterial;

      const points = new THREE.Points(geometry, renderMaterial);
      points.frustumCulled = false;
      pointsRef.current = points;
      initializedRef.current = true;
      setIsReady(true);
    };

    initGPU();

    return () => {
      // Ne pas cleanup si juste hidden - garde les ressources
    };
  }, [
    visible,
    dataLoaded,
    gl,
    textureSize,
    config.size,
    controls.positionY,
    controls.positionZ,
    controls.scale,
  ]);

  // Cleanup seulement au unmount
  useEffect(() => {
    return () => {
      if (fboRef.current) fboRef.current.dispose();
      if (pointsRef.current) pointsRef.current.geometry.dispose();
      if (simMaterialRef.current) simMaterialRef.current.dispose();
      if (renderMaterialRef.current) renderMaterialRef.current.dispose();
      texturesRef.current.forEach((t) => t.dispose());
      colorTexturesRef.current.forEach((t) => t.dispose());
      initializedRef.current = false;
    };
  }, []);

  // Animation
  useFrame((state) => {
    if (
      !visible ||
      !fboRef.current ||
      !simMaterialRef.current ||
      !renderMaterialRef.current
    )
      return;

    const time = state.clock.elapsedTime;
    const buildDur = controls.buildDuration;
    const morphDur = controls.morphDuration;
    const cycleDuration = buildDur + morphDur;
    const totalCycle = cycleDuration * IMAGE_URLS.length;

    const cycleTime = time % totalCycle;
    const formIndex = Math.floor(cycleTime / cycleDuration);
    const timeInCycle = cycleTime % cycleDuration;
    const morphT =
      timeInCycle > buildDur ? (timeInCycle - buildDur) / morphDur : 0;

    // Update simulation uniforms
    simMaterialRef.current.uniforms.uMorphT.value = morphT;
    simMaterialRef.current.uniforms.uFormIndex.value = formIndex;
    simMaterialRef.current.uniforms.uPosition.value.set(
      0,
      controls.positionY,
      controls.positionZ,
    );
    simMaterialRef.current.uniforms.uScale.value = controls.scale;

    fboRef.current.update();

    // Update render uniforms
    renderMaterialRef.current.uniforms.uPositions.value =
      fboRef.current.texture;
    renderMaterialRef.current.uniforms.uMorphT.value = morphT;
    renderMaterialRef.current.uniforms.uFormIndex.value = formIndex;
  });

  if (!visible) return null;

  if (!isReady || !pointsRef.current) {
    return null; // Pas de sphère rouge - juste attendre
  }

  return (
    <>
      <primitive object={pointsRef.current} />
      <ambientLight intensity={0.15} color="#111122" />
      <pointLight
        position={[-5, 4, controls.positionZ]}
        intensity={15}
        color="#4466ff"
        distance={20}
      />
      <pointLight
        position={[5, 4, controls.positionZ]}
        intensity={15}
        color="#ff4466"
        distance={20}
      />
      <pointLight
        position={[0, 6, controls.positionZ - 5]}
        intensity={20}
        color="#ffffff"
        distance={25}
      />
    </>
  );
}
