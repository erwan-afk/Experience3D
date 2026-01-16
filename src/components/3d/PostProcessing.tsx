import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

interface PostProcessingProps {
  toneMappingExposure?: number;
}

export function PostProcessing({
  toneMappingExposure = 3.0,
}: PostProcessingProps) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  const controls = useControls("Bloom", {
    enabled: true,
    strength: { value: 0.4, min: 0, max: 3, step: 0.1 },
    radius: { value: 1.2, min: 0, max: 2, step: 0.1 },
    threshold: { value: 0.1, min: 0, max: 1, step: 0.05 },
  });

  // Initialiser le composer
  useEffect(() => {
    if (!controls.enabled) {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1;
      composerRef.current = null;
      bloomPassRef.current = null;
      return;
    }

    const pixelRatio = gl.getPixelRatio();
    const width = size.width * pixelRatio;
    const height = size.height * pixelRatio;

    const composer = new EffectComposer(gl);
    composer.setSize(size.width, size.height);
    composer.setPixelRatio(pixelRatio);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      controls.strength,
      controls.radius,
      controls.threshold,
    );
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    composerRef.current = composer;

    gl.toneMapping = THREE.LinearToneMapping;
    gl.toneMappingExposure = toneMappingExposure;

    return () => {
      composerRef.current = null;
      bloomPassRef.current = null;
    };
  }, [controls.enabled, gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    if (bloomPassRef.current && controls.enabled) {
      bloomPassRef.current.strength = controls.strength;
      bloomPassRef.current.radius = controls.radius;
      bloomPassRef.current.threshold = controls.threshold;
    }
  }, [
    controls.strength,
    controls.radius,
    controls.threshold,
    controls.enabled,
  ]);

  // Mettre à jour l'exposure depuis la timeline
  useEffect(() => {
    if (controls.enabled) {
      gl.toneMappingExposure = toneMappingExposure;
    }
  }, [toneMappingExposure, controls.enabled, gl]);

  useEffect(() => {
    if (composerRef.current && bloomPassRef.current) {
      const pixelRatio = gl.getPixelRatio();
      composerRef.current.setSize(size.width, size.height);
      composerRef.current.setPixelRatio(pixelRatio);
      bloomPassRef.current.resolution.set(
        size.width * pixelRatio,
        size.height * pixelRatio,
      );
    }
  }, [size.width, size.height, gl]);

  useFrame(({ gl: renderer }) => {
    if (composerRef.current && controls.enabled) {
      renderer.autoClear = false;
      renderer.clear();
      composerRef.current.render();
      renderer.autoClear = true;
    }
  }, 100);

  return null;
}
