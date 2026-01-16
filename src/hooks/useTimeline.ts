import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type {
  Scene,
  PlaybackMode,
  TransitionState,
  AmbientParticleEvent,
} from "../types/timeline";
import { isVideoScene, isParticleScene, isTextScene } from "../types/timeline";
import type { ParticleEffectType } from "../types/particles";
import {
  defaultScenes,
  DEFAULT_VIDEO_DURATION,
  ambientParticleEvents,
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
  goToTime: (timeMs: number) => void;
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
  // Particules ambiantes
  ambientParticleEffect: ParticleEffectType | null;
  showAmbientParticles: boolean;
  ambientParticleOpacity: number;
  ambientParticleEvents: AmbientParticleEvent[];
  activeAmbientEffects: { effect: ParticleEffectType; opacity: number }[];
  hasStarted: boolean;
  // Pour l'audio spatial
  audioCurrentTime: number; // temps en secondes
  // Tone mapping
  toneMappingExposure: number;
  // Texte
  currentText: string | null;
  showText: boolean;
  // Fin de l'expérience
  isEnding: boolean;
  resetEnding: () => void;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const videoDurationsRef = useRef<Map<number, number>>(new Map());
  const transitioningRef = useRef(false);
  const endingPausedRef = useRef(false);
  const elapsedTimeRef = useRef<number>(0); // Pour tracking précis
  const lastUIUpdateRef = useRef<number>(0); // Pour throttle UI updates
  const [videoDurationsLoaded, setVideoDurationsLoaded] = useState(false);

  const currentScene = scenes[currentIndex];

  // Pré-charger les durées de toutes les vidéos au démarrage
  useEffect(() => {
    const videoNumbers = scenes
      .filter(isVideoScene)
      .map((scene) => scene.videoNumber);

    const uniqueVideoNumbers = [...new Set(videoNumbers)];
    let loadedCount = 0;

    uniqueVideoNumbers.forEach((videoNumber) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = `/scene${videoNumber}.mp4`;

      video.onloadedmetadata = () => {
        videoDurationsRef.current.set(videoNumber, video.duration * 1000);
        loadedCount++;
        if (loadedCount === uniqueVideoNumbers.length) {
          setVideoDurationsLoaded(true);
        }
      };

      video.onerror = () => {
        // En cas d'erreur, utiliser la durée par défaut
        videoDurationsRef.current.set(videoNumber, DEFAULT_VIDEO_DURATION);
        loadedCount++;
        if (loadedCount === uniqueVideoNumbers.length) {
          setVideoDurationsLoaded(true);
        }
      };
    });

    // Si pas de vidéos, marquer comme chargé
    if (uniqueVideoNumbers.length === 0) {
      setVideoDurationsLoaded(true);
    }
  }, [scenes]);

  const getSceneDuration = useCallback((scene: Scene): number => {
    if (isVideoScene(scene)) {
      return (
        videoDurationsRef.current.get(scene.videoNumber) ||
        DEFAULT_VIDEO_DURATION
      );
    }
    return scene.duration;
  }, []);

  // Recalculer quand les durées sont chargées
  const totalDuration = useMemo(() => {
    // Dépend de videoDurationsLoaded pour forcer le recalcul
    if (!videoDurationsLoaded) {
      // Retourner une estimation en attendant
      return scenes.reduce((acc, scene) => {
        if (isVideoScene(scene)) {
          return acc + DEFAULT_VIDEO_DURATION;
        }
        return acc + scene.duration;
      }, 0);
    }
    return scenes.reduce((acc, scene) => acc + getSceneDuration(scene), 0);
  }, [scenes, getSceneDuration, videoDurationsLoaded]);

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
  const doTransition = useCallback(
    (targetIndex: number) => {
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
    },
    [scenes, getSceneDuration],
  );

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

        // Vérifier si c'est la dernière scène
        const isLastScene = currentIndex === scenes.length - 1;
        const timeRemaining = videoElement.duration - videoElement.currentTime;

        if (isLastScene) {
          // Dernière scène: pause à 1 seconde de la fin, puis overlay après 20s
          if (timeRemaining <= 1 && timeRemaining > 0) {
            if (!endingPausedRef.current) {
              endingPausedRef.current = true;
              videoElement.pause();
              // Déclencher l'overlay après 20 secondes
              setTimeout(() => {
                setIsEnding(true);
              }, 20000);
            }
          }
        } else {
          // Autres scènes: déclencher le fondu 2 secondes avant la fin
          if (
            timeRemaining <= 2 &&
            timeRemaining > 0 &&
            playbackMode === "auto" &&
            !transitioningRef.current
          ) {
            nextScene();
          }
        }
      }
    };

    const handleEnded = () => {
      // Fallback si le fondu anticipé n'a pas été déclenché
      // Ne pas passer à la scène suivante si c'est la dernière
      const isLastScene = currentIndex === scenes.length - 1;
      if (
        !isLastScene &&
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

  // Animation des scènes avec durée (particules et texte)
  useEffect(() => {
    // Ne pas animer si pas en lecture ou en transition
    if (!isPlaying || transitionState !== "idle") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Seulement pour les scènes avec durée (particules ou texte)
    if (
      !currentScene ||
      (!isParticleScene(currentScene) && !isTextScene(currentScene))
    ) {
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
    setHasStarted(true);

    if (videoElement && currentScene && isVideoScene(currentScene)) {
      videoElement.play().catch(console.error);
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

  // Naviguer vers un temps global spécifique (en ms)
  const goToTime = useCallback(
    (timeMs: number) => {
      if (transitioningRef.current) return;

      // Trouver la scène correspondante
      let accumulatedTime = 0;
      let targetIndex = 0;
      let timeInScene = 0;

      for (let i = 0; i < scenes.length; i++) {
        const sceneDuration = getSceneDuration(scenes[i]);
        if (accumulatedTime + sceneDuration > timeMs) {
          targetIndex = i;
          timeInScene = timeMs - accumulatedTime;
          break;
        }
        accumulatedTime += sceneDuration;
        targetIndex = i;
        timeInScene = timeMs - accumulatedTime;
      }

      // Si on est déjà sur la bonne scène, juste seek
      if (targetIndex === currentIndex) {
        setElapsedTime(timeInScene);
        if (videoElement && isVideoScene(scenes[targetIndex])) {
          videoElement.currentTime = timeInScene / 1000;
        }
      } else {
        // Sinon, transition vers la scène
        transitioningRef.current = true;
        setTransitionState("fading-out");

        let opacity = 0;
        const maxOpacity = 1;
        const fadeSpeed = 0.03; // Plus rapide pour navigation

        const fadeOutInterval = setInterval(() => {
          opacity += fadeSpeed;
          if (opacity >= maxOpacity) {
            clearInterval(fadeOutInterval);
            setFadeOpacity(maxOpacity);

            setCurrentIndex(targetIndex);
            setElapsedTime(timeInScene);

            // Seek la vidéo si c'est une scène vidéo
            setTimeout(() => {
              if (videoElement && isVideoScene(scenes[targetIndex])) {
                videoElement.currentTime = timeInScene / 1000;
              }

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
            }, 50);
          } else {
            setFadeOpacity(opacity);
          }
        }, 16);
      }
    },
    [scenes, currentIndex, getSceneDuration, videoElement],
  );

  const togglePlaybackMode = useCallback(() => {
    setPlaybackMode((prev) => (prev === "auto" ? "manual" : "auto"));
  }, []);

  const resetEnding = useCallback(() => {
    setIsEnding(false);
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
  const currentText =
    currentScene && isTextScene(currentScene) ? currentScene.text : null;
  const showText = currentScene ? isTextScene(currentScene) : false;

  // Calculer le temps global actuel
  const globalTime = getGlobalElapsedTime();

  // Durée du fondu pour les particules ambiantes (ms)
  const AMBIENT_FADE_DURATION = 2000;

  // Vérifier quels effets ambiants sont actifs (peut y en avoir plusieurs)
  const activeAmbientEvents = ambientParticleEvents.filter(
    (event) =>
      globalTime >= event.startTime &&
      globalTime < event.startTime + event.duration,
  );

  // Calculer l'opacité pour chaque effet actif
  const activeAmbientEffects = activeAmbientEvents.map((event) => {
    const timeInEvent = globalTime - event.startTime;
    const eventDuration = event.duration;

    let opacity = 0;
    // Fade in au début
    if (timeInEvent < AMBIENT_FADE_DURATION) {
      opacity = timeInEvent / AMBIENT_FADE_DURATION;
    }
    // Fade out à la fin
    else if (eventDuration - timeInEvent < AMBIENT_FADE_DURATION) {
      opacity = (eventDuration - timeInEvent) / AMBIENT_FADE_DURATION;
    }
    // Pleine opacité au milieu
    else {
      opacity = 1;
    }

    return { effect: event.effect, opacity };
  });

  // Pour la compatibilité, garder aussi le premier effet (legacy)
  const activeAmbientEvent = activeAmbientEvents[0] || null;
  let ambientParticleOpacity = activeAmbientEffects[0]?.opacity || 0;
  const ambientParticleEffect = activeAmbientEvent?.effect || null;
  const showAmbientParticles = activeAmbientEvents.length > 0;

  // Exposure de la scène courante
  const toneMappingExposure = currentScene?.exposure ?? 3.0;

  return {
    currentVideo,
    particleEffect,
    showParticles,
    play,
    pause,
    goToScene,
    goToTime,
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
    // Particules ambiantes
    ambientParticleEffect,
    showAmbientParticles,
    ambientParticleOpacity,
    ambientParticleEvents,
    activeAmbientEffects,
    hasStarted,
    audioCurrentTime: getGlobalElapsedTime() / 1000, // en secondes pour Three.js
    toneMappingExposure,
    currentText,
    showText,
    isEnding,
    resetEnding,
  };
}
