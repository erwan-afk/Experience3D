import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
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
import { particleEffects } from "../../config/particles.config";

interface MorphingParticlesProps {
  models: [string, string, string]; // Chemins vers les 3 modèles GLB
  morphDuration?: number; // Durée d'un cycle complet en secondes
  scale?: number; // Échelle des modèles
}

/**
 * Composant de particules avec morphing GPGPU entre 3 modèles 3D
 */
export function MorphingParticles({
  models,
  morphDuration = 12,
  scale = 1,
}: MorphingParticlesProps) {
  const { gl, camera } = useThree();
  const config = particleEffects.morphing;

  // Charger les 3 modèles GLB
  const gltf1 = useGLTF(models[0]);
  const gltf2 = useGLTF(models[1]);
  const gltf3 = useGLTF(models[2]);

  // Refs pour le système GPGPU
  const fboRef = useRef<FBO | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const simulationMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const renderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // État pour savoir si le système est prêt
  const [isReady, setIsReady] = useState(false);

  // Taille de la texture (carré)
  const textureSize = useMemo(
    () => getOptimalTextureSize(config.particleCount),
    [config.particleCount]
  );

  // Extraire les positions des modèles et créer les textures
  const { textureA, textureB, textureC } = useMemo(() => {
    // Fonction pour extraire les positions d'un GLTF
    const getPositionsFromGLTF = (gltf: any): Float32Array => {
      let allPositions: number[] = [];

      gltf.scene.traverse((child: any) => {
        if (child.isMesh && child.geometry) {
          const positions = extractPositions(child.geometry);
          // Appliquer l'échelle
          for (let i = 0; i < positions.length; i++) {
            allPositions.push(positions[i] * scale);
          }
        }
      });

      return new Float32Array(allPositions);
    };

    const pos1 = getPositionsFromGLTF(gltf1);
    const pos2 = getPositionsFromGLTF(gltf2);
    const pos3 = getPositionsFromGLTF(gltf3);

    return {
      textureA: createPositionTexture(pos1, textureSize),
      textureB: createPositionTexture(pos2, textureSize),
      textureC: createPositionTexture(pos3, textureSize),
    };
  }, [gltf1, gltf2, gltf3, textureSize, scale]);

  // Initialiser le système GPGPU
  useEffect(() => {
    // Matériau de simulation
    const simulationMaterial = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
      uniforms: {
        uTextureA: { value: textureA },
        uTextureB: { value: textureB },
        uTextureC: { value: textureC },
        uProgress: { value: 0 },
        uTime: { value: 0 },
      },
    });
    simulationMaterialRef.current = simulationMaterial;

    // Créer le FBO
    const fbo = new FBO({
      width: textureSize,
      height: textureSize,
      renderer: gl,
      simulationMaterial,
    });
    fboRef.current = fbo;

    // Créer la géométrie des particules
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
      // Position initiale (sera remplacée par le shader)
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Référence UV pour sampler la texture de positions
      const x = (i % textureSize) / textureSize;
      const y = Math.floor(i / textureSize) / textureSize;
      references[i * 2] = x;
      references[i * 2 + 1] = y;

      // Taille variable
      sizes[i] = config.size * 80 * (0.5 + Math.random() * 0.5);

      // Couleur aléatoire parmi les options
      const colorHex = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      const color = new THREE.Color(colorHex);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Alpha
      alphas[i] = 0.8 + Math.random() * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aReference", new THREE.BufferAttribute(references, 2));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

    // Matériau de rendu
    const renderMaterial = new THREE.ShaderMaterial({
      vertexShader: morphingVertexShader,
      fragmentShader: morphingFragmentShader,
      uniforms: {
        uPositions: { value: fbo.texture },
        uSize: { value: config.size },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uProgress: { value: 0 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    renderMaterialRef.current = renderMaterial;

    // Créer les points
    const points = new THREE.Points(geometry, renderMaterial);
    pointsRef.current = points;

    setIsReady(true);

    return () => {
      fbo.dispose();
      geometry.dispose();
      simulationMaterial.dispose();
      renderMaterial.dispose();
      textureA.dispose();
      textureB.dispose();
      textureC.dispose();
    };
  }, [gl, textureA, textureB, textureC, textureSize, config]);

  // Animation loop
  useFrame((state) => {
    if (!fboRef.current || !simulationMaterialRef.current || !renderMaterialRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const progress = (time / morphDuration) % 1;

    // Mettre à jour les uniforms de simulation
    simulationMaterialRef.current.uniforms.uProgress.value = progress;
    simulationMaterialRef.current.uniforms.uTime.value = time;

    // Mettre à jour le FBO (calcul des positions sur GPU)
    fboRef.current.update();

    // Mettre à jour les uniforms de rendu
    renderMaterialRef.current.uniforms.uPositions.value = fboRef.current.texture;
    renderMaterialRef.current.uniforms.uProgress.value = progress;
    renderMaterialRef.current.uniforms.uTime.value = time;
  });

  if (!isReady || !pointsRef.current) {
    return null;
  }

  return <primitive object={pointsRef.current} />;
}

// Précharger les modèles par défaut
useGLTF.preload("/models/morph1.glb");
useGLTF.preload("/models/morph2.glb");
useGLTF.preload("/models/morph3.glb");
