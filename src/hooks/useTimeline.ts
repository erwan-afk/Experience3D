import { useState, useEffect, useCallback, useRef } from "react";
import type { Scene, PlaybackMode, TransitionState } from "../types/timeline";
import { isVideoScene, isParticleScene } from "../types/timeline";
import type { ParticleEffectType } from "../types/particles";
import {
  defaultScenes,
  DEFAULT_VIDEO_DURATION,
} from "../config/timeline.config";

interface UseTimelineOptions {
  scenes?: Scene[];
  videoElement: HTMLVideoElement | null;
}

interface UseTimelineReturn {
  currentVideo: number | null;
  particleEffect: ParticleEffectType;
  showParticles: boolean;
  play: () => void;
  pause: () => void;
  goToScene: (index: number) => void;
  togglePlaybackMode: () => void;
  scenes: Scene[];
  currentIndex: number;
  progress: number;
  sceneProgress: number;
  elapsedTime: number;
  totalDuration: number;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  fadeOpacity: number;
  // Nouvelles valeurs pour les contrôles de scène
  sceneDuration: number;
  sceneElapsedTime: number;
}

export function useTimeline({
  scenes = defaultScenes,
  videoElement,
}: UseTimelineOptions): UseTimelineReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("auto");
  const [transitionState, setTransitionState] =
    useState<TransitionState>("idle");
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const videoDurationsRef = useRef<Map<number, number>>(new Map());
  const transitioningRef = useRef(false);
  const elapsedTimeRef = useRef<number>(0); // Pour tracking précis
  const lastUIUpdateRef = useRef<number>(0); // Pour throttle UI updates

  const currentScene = scenes[currentIndex];

  const getSceneDuration = useCallback((scene: Scene): number => {
    if (isVideoScene(scene)) {
      return (
        videoDurationsRef.current.get(scene.videoNumber) ||
        DEFAULT_VIDEO_DURATION
      );
    }
    return scene.duration;
  }, []);

  const totalDuration = scenes.reduce(
    (acc, scene) => acc + getSceneDuration(scene),
    0,
  );

  const getGlobalElapsedTime = useCallback(() => {
    let elapsed = 0;
    for (let i = 0; i < currentIndex; i++) {
      elapsed += getSceneDuration(scenes[i]);
    }
    elapsed += elapsedTime;
    return elapsed;
  }, [currentIndex, elapsedTime, scenes, getSceneDuration]);

  const progress =
    totalDuration > 0 ? getGlobalElapsedTime() / totalDuration : 0;
  const currentSceneDuration = currentScene
    ? getSceneDuration(currentScene)
    : 0;
  const sceneProgress =
    currentSceneDuration > 0 ? elapsedTime / currentSceneDuration : 0;

  // Fonction de transition avec fondu doux (cross-fade simulé)
  const doTransition = useCallback((targetIndex: number) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;

    setTransitionState("fading-out");

    // Fade out doux et lent
    let opacity = 0;
    const maxOpacity = 1;
    const fadeSpeed = 0.015; // Très lent

    const fadeOutInterval = setInterval(() => {
      opacity += fadeSpeed;
      if (opacity >= maxOpacity) {
        clearInterval(fadeOutInterval);
        setFadeOpacity(maxOpacity);

        // Changer de scène au milieu du fondu
        setCurrentIndex(targetIndex);
        setElapsedTime(0);

        // Fade in immédiat (cross-fade effect)
        setTimeout(() => {
          setTransitionState("fading-in");
          let fadeInOpacity = maxOpacity;
          const fadeInInterval = setInterval(() => {
            fadeInOpacity -= fadeSpeed;
            if (fadeInOpacity <= 0) {
              clearInterval(fadeInInterval);
              setFadeOpacity(0);
              setTransitionState("idle");
              transitioningRef.current = false;
            } else {
              setFadeOpacity(fadeInOpacity);
            }
          }, 16);
        }, 50); // Délai très court pour effet cross-fade
      } else {
        setFadeOpacity(opacity);
      }
    }, 16); // 60fps
  }, []);

  // Passer à la scène suivante
  const nextScene = useCallback(() => {
    if (transitioningRef.current || transitionState !== "idle") return;
    const nextIndex = (currentIndex + 1) % scenes.length;
    doTransition(nextIndex);
  }, [currentIndex, scenes.length, transitionState, doTransition]);

  // Gestion des vidéos
  useEffect(() => {
    if (!videoElement) return;
    if (!currentScene || !isVideoScene(currentScene)) return;

    const handleLoadedMetadata = () => {
      videoDurationsRef.current.set(
        currentScene.videoNumber,
        videoElement.duration * 1000,
      );
    };

    const handleTimeUpdate = () => {
      if (isPlaying && transitionState === "idle") {
        setElapsedTime(videoElement.currentTime * 1000);
      }
    };

    const handleEnded = () => {
      if (
        playbackMode === "auto" &&
        transitionState === "idle" &&
        !transitioningRef.current
      ) {
        nextScene();
      }
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("ended", handleEnded);

    // Lancer la vidéo si on est en lecture
    if (isPlaying && transitionState === "idle") {
      videoElement.currentTime = 0;
      videoElement.play().catch(() => {});
    }

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("ended", handleEnded);
    };
  }, [
    videoElement,
    currentScene,
    isPlaying,
    playbackMode,
    transitionState,
    nextScene,
  ]);

  // Animation des particules
  useEffect(() => {
    // Ne pas animer si pas en lecture ou en transition
    if (!isPlaying || transitionState !== "idle") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Seulement pour les scènes de particules
    if (!currentScene || !isParticleScene(currentScene)) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Initialiser le timer
    const startTime = performance.now();
    elapsedTimeRef.current = 0;
    lastUIUpdateRef.current = 0;
    const sceneDuration = currentScene.duration;

    const animate = (currentTime: number) => {
      const totalElapsed = currentTime - startTime;
      elapsedTimeRef.current = Math.min(totalElapsed, sceneDuration);

      // Mettre à jour l'UI toutes les 50ms pour fluidité
      if (totalElapsed - lastUIUpdateRef.current >= 50) {
        lastUIUpdateRef.current = totalElapsed;
        setElapsedTime(elapsedTimeRef.current);
      }

      if (totalElapsed >= sceneDuration) {
        setElapsedTime(sceneDuration);
        if (playbackMode === "auto" && !transitioningRef.current) {
          setTimeout(() => nextScene(), 0);
        }
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isPlaying,
    transitionState,
    currentScene,
    currentIndex,
    playbackMode,
    nextScene,
  ]);

  // Contrôles
  const play = useCallback(() => {
    setIsPlaying(true);
    if (videoElement && currentScene && isVideoScene(currentScene)) {
      videoElement.play().catch(() => {});
    }
  }, [videoElement, currentScene]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (videoElement) {
      videoElement.pause();
    }
  }, [videoElement]);

  const goToScene = useCallback(
    (index: number) => {
      if (index < 0 || index >= scenes.length) return;
      if (transitioningRef.current) return;
      doTransition(index);
    },
    [scenes.length, doTransition],
  );

  const togglePlaybackMode = useCallback(() => {
    setPlaybackMode((prev) => (prev === "auto" ? "manual" : "auto"));
  }, []);

  // Valeurs dérivées
  const currentVideo =
    currentScene && isVideoScene(currentScene)
      ? currentScene.videoNumber
      : null;
  const particleEffect: ParticleEffectType =
    currentScene && isParticleScene(currentScene)
      ? currentScene.effect
      : "fireflies";
  const showParticles = currentScene ? isParticleScene(currentScene) : false;

  return {
    currentVideo,
    particleEffect,
    showParticles,
    play,
    pause,
    goToScene,
    togglePlaybackMode,
    scenes,
    currentIndex,
    progress,
    sceneProgress,
    elapsedTime: getGlobalElapsedTime(),
    totalDuration,
    isPlaying,
    playbackMode,
    fadeOpacity,
    sceneDuration: currentSceneDuration,
    sceneElapsedTime: elapsedTime,
  };
}
