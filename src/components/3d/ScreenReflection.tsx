import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";
import {
  blurVertexShader,
  blurHorizontalShader,
  blurVerticalShader,
  compositeVertexShader,
  compositeFragmentShader,
} from "../../shaders/reflection";

interface ScreenReflectionProps {
  sourceTexture: THREE.Texture | null;
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  depth: number;
}

/**
 * Composant de réflexion avec blur 2-pass sur RenderTarget basse résolution
 * Pipeline: Source → RT1 (downscale) → Blur H → RT2 → Blur V → RT1 → Composite
 */
export function ScreenReflection({
  sourceTexture,
  geometry,
  position,
  depth,
}: ScreenReflectionProps) {
  const { gl } = useThree();

  // Refs pour les RenderTargets et matériaux
  const rt1Ref = useRef<THREE.WebGLRenderTarget | null>(null);
  const rt2Ref = useRef<THREE.WebGLRenderTarget | null>(null);
  const blurSceneRef = useRef<THREE.Scene | null>(null);
  const blurCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const blurQuadRef = useRef<THREE.Mesh | null>(null);
  const blurMaterialHRef = useRef<THREE.ShaderMaterial | null>(null);
  const blurMaterialVRef = useRef<THREE.ShaderMaterial | null>(null);
  const compositeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Contrôles Leva
  const controls = useControls("Réflexion Écran", {
    enabled: { value: true },
    blurStrength: { value: 1.7, min: 0.5, max: 6, step: 0.1 },
    blurPasses: { value: 4, min: 1, max: 4, step: 1 },
    opacity: { value: 0.5, min: 0, max: 1, step: 0.05 },
    brightness: { value: 1.2, min: 0.5, max: 3, step: 0.1 },
    fadeStart: { value: 0.0, min: 0, max: 1, step: 0.05 },
    fadeEnd: { value: 0.7, min: 0, max: 1, step: 0.05 },
  });

  // Initialisation du système de blur
  useEffect(() => {
    // Résolution basse pour performance + blur naturel
    const width = 512;
    const height = 96;

    // RenderTargets pour le ping-pong blur
    const rt1 = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    const rt2 = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    rt1Ref.current = rt1;
    rt2Ref.current = rt2;

    // Scène et caméra pour le blur (quad plein écran)
    const blurScene = new THREE.Scene();
    const blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    blurSceneRef.current = blurScene;
    blurCameraRef.current = blurCamera;

    // Matériaux de blur
    const blurMatH = new THREE.ShaderMaterial({
      vertexShader: blurVertexShader,
      fragmentShader: blurHorizontalShader,
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(width, height) },
        uStrength: { value: 2.0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const blurMatV = new THREE.ShaderMaterial({
      vertexShader: blurVertexShader,
      fragmentShader: blurVerticalShader,
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(width, height) },
        uStrength: { value: 2.0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    blurMaterialHRef.current = blurMatH;
    blurMaterialVRef.current = blurMatV;

    // Quad plein écran pour le blur
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeo, blurMatH);
    blurQuadRef.current = quad;
    blurScene.add(quad);

    // Matériau de composition finale avec fade vers noir transparent
    const compositeMat = new THREE.ShaderMaterial({
      vertexShader: compositeVertexShader,
      fragmentShader: compositeFragmentShader,
      uniforms: {
        uTexture: { value: rt1.texture },
        uOpacity: { value: 0.7 },
        uBrightness: { value: 1.3 },
        uFadeStart: { value: 0.0 },
        uFadeEnd: { value: 0.7 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    compositeMaterialRef.current = compositeMat;

    return () => {
      rt1.dispose();
      rt2.dispose();
      blurMatH.dispose();
      blurMatV.dispose();
      compositeMat.dispose();
      quadGeo.dispose();
    };
  }, []);

  // Rendu du blur à chaque frame
  useFrame(() => {
    if (
      !controls.enabled ||
      !sourceTexture ||
      !rt1Ref.current ||
      !rt2Ref.current ||
      !blurSceneRef.current ||
      !blurCameraRef.current ||
      !blurQuadRef.current ||
      !blurMaterialHRef.current ||
      !blurMaterialVRef.current ||
      !compositeMaterialRef.current
    ) {
      return;
    }

    const currentRT = gl.getRenderTarget();
    const rt1 = rt1Ref.current;
    const rt2 = rt2Ref.current;
    const blurScene = blurSceneRef.current;
    const blurCamera = blurCameraRef.current;
    const quad = blurQuadRef.current;
    const blurMatH = blurMaterialHRef.current;
    const blurMatV = blurMaterialVRef.current;

    // Mettre à jour la force du blur
    blurMatH.uniforms.uStrength.value = controls.blurStrength;
    blurMatV.uniforms.uStrength.value = controls.blurStrength;

    // Pass 1: Copie avec downscale (source → RT1)
    // On utilise le blur horizontal comme première passe
    blurMatH.uniforms.uTexture.value = sourceTexture;
    quad.material = blurMatH;
    gl.setRenderTarget(rt1);
    gl.clear();
    gl.render(blurScene, blurCamera);

    // Pass 2: Blur vertical (RT1 → RT2)
    blurMatV.uniforms.uTexture.value = rt1.texture;
    quad.material = blurMatV;
    gl.setRenderTarget(rt2);
    gl.clear();
    gl.render(blurScene, blurCamera);

    // Passes supplémentaires si demandé
    for (let i = 1; i < controls.blurPasses; i++) {
      // Blur horizontal (RT2 → RT1)
      blurMatH.uniforms.uTexture.value = rt2.texture;
      quad.material = blurMatH;
      gl.setRenderTarget(rt1);
      gl.clear();
      gl.render(blurScene, blurCamera);

      // Blur vertical (RT1 → RT2)
      blurMatV.uniforms.uTexture.value = rt1.texture;
      quad.material = blurMatV;
      gl.setRenderTarget(rt2);
      gl.clear();
      gl.render(blurScene, blurCamera);
    }

    // Mettre à jour le matériau de composition
    compositeMaterialRef.current.uniforms.uTexture.value = rt2.texture;
    compositeMaterialRef.current.uniforms.uOpacity.value = controls.opacity;
    compositeMaterialRef.current.uniforms.uBrightness.value =
      controls.brightness;
    compositeMaterialRef.current.uniforms.uFadeStart.value = controls.fadeStart;
    compositeMaterialRef.current.uniforms.uFadeEnd.value = controls.fadeEnd;

    // Restaurer le render target
    gl.setRenderTarget(currentRT);
  });

  // Ref pour le mesh
  const meshRef = useRef<THREE.Mesh>(null);

  // Forcer une bounding sphere infinie pour éviter le culling
  useEffect(() => {
    if (meshRef.current && meshRef.current.geometry) {
      meshRef.current.geometry.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(0, 0, 0),
        Infinity,
      );
    }
  }, [geometry]);

  // Ne rien rendre si désactivé ou pas de texture/matériau
  if (!controls.enabled || !sourceTexture || !compositeMaterialRef.current) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[position[0], -position[1], position[2]]}
      scale={[1, -1, 1]}
      material={compositeMaterialRef.current}
      frustumCulled={false}
      renderOrder={-1}
    />
  );
}
