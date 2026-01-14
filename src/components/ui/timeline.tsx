import { useRef } from "react";
import { Play, Pause, RefreshCw, Hand, Volume2, VolumeX } from "lucide-react";
import { Button } from "./button";
import type {
  Scene,
  PlaybackMode,
  AmbientParticleEvent,
} from "../../types/timeline";
import { isVideoScene } from "../../types/timeline";

interface TimelineProps {
  scenes: Scene[];
  currentIndex: number;
  progress: number;
  sceneProgress: number;
  elapsedTime: number;
  totalDuration: number;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  play: () => void;
  pause: () => void;
  goToScene: (index: number) => void;
  togglePlaybackMode: () => void;
  // Pour les contrôles vidéo
  videoElement: HTMLVideoElement | null;
  showParticles: boolean;
  sceneDuration: number; // Durée de la scène actuelle en ms
  sceneElapsedTime: number; // Temps écoulé dans la scène actuelle en ms
  // Particules ambiantes
  ambientParticleEvents: AmbientParticleEvent[];
  showAmbientParticles: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getSceneLabel(scene: Scene): string {
  if (isVideoScene(scene)) {
    return `Video ${scene.videoNumber}`;
  }
  const effectNames: Record<string, string> = {
    fireflies: "Braises",
    snow: "Neige",
    stars: "Etoiles",
    dust: "Sable",
    energy: "Energie",
  };
  return effectNames[scene.effect] || scene.effect;
}

function getAmbientEffectLabel(effect: string): string {
  const effectNames: Record<string, string> = {
    fireflies: "Feu",
    snow: "Neige",
    stars: "Etoiles",
    dust: "Sable",
    energy: "Energie",
    rocks: "Eboulement",
    grass: "Herbe",
    butterfly: "Papillon",
  };
  return effectNames[effect] || effect;
}

export function Timeline({
  scenes,
  currentIndex,
  progress,
  sceneProgress,
  elapsedTime,
  totalDuration,
  isPlaying,
  playbackMode,
  play,
  pause,
  goToScene,
  togglePlaybackMode,
  videoElement,
  showParticles,
  sceneDuration,
  sceneElapsedTime,
  ambientParticleEvents,
  showAmbientParticles,
}: TimelineProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Segments de largeur égale
  const segmentWidth = 100 / scenes.length;

  // Progression globale
  const progressWidth =
    currentIndex * segmentWidth + sceneProgress * segmentWidth;

  // Gestion du seek dans la scène actuelle
  const handleSceneSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );

    if (showParticles) {
      // Pour les particules, on ne peut pas seek (pas de contrôle du temps)
      return;
    } else if (videoElement) {
      // Pour les vidéos, seek à la position
      const newTime = percent * videoElement.duration;
      videoElement.currentTime = newTime;
    }
  };

  // Toggle mute pour la vidéo
  const toggleMute = () => {
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
    }
  };

  const isMuted = videoElement?.muted ?? true;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minWidth: "650px",
        zIndex: 100,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Contrôles principaux */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Play/Pause */}
        <Button variant="ghost" size="icon" onClick={isPlaying ? pause : play}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </Button>

        {/* Mode Auto/Manuel */}
        <Button
          variant={playbackMode === "auto" ? "secondary" : "ghost"}
          size="icon"
          onClick={togglePlaybackMode}
          title={playbackMode === "auto" ? "Mode Auto" : "Mode Manuel"}
        >
          {playbackMode === "auto" ? (
            <RefreshCw size={18} />
          ) : (
            <Hand size={18} />
          )}
        </Button>

        {/* Volume (seulement pour vidéo) */}
        {!showParticles && (
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
        )}

        {/* Barre de progression de la scène actuelle */}
        <div
          ref={progressBarRef}
          onClick={handleSceneSeek}
          style={{
            flex: 1,
            height: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: "3px",
            cursor: showParticles ? "default" : "pointer",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${sceneProgress * 100}%`,
              height: "100%",
              backgroundColor: showParticles ? "#a855f7" : "#3b82f6",
              borderRadius: "3px",
              transition: "width 100ms linear",
            }}
          />
        </div>

        {/* Temps de la scène actuelle */}
        <span
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "monospace",
            minWidth: "90px",
            textAlign: "right",
          }}
        >
          {formatTime(sceneElapsedTime)} / {formatTime(sceneDuration)}
        </span>
      </div>

      {/* Timeline des segments - Ligne 1: Scènes principales */}
      <div
        style={{
          display: "flex",
          height: "32px",
          borderRadius: "6px 6px 0 0",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Barre de progression globale */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${progressWidth}%`,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            transition: "width 100ms linear",
            pointerEvents: "none",
          }}
        />

        {/* Segments cliquables */}
        {scenes.map((scene, index) => {
          const isVideo = isVideoScene(scene);
          const isCurrent = index === currentIndex;

          return (
            <div
              key={index}
              onClick={() => goToScene(index)}
              style={{
                flex: `0 0 ${segmentWidth}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRight:
                  index < scenes.length - 1
                    ? "1px solid rgba(255, 255, 255, 0.2)"
                    : "none",
                backgroundColor: isCurrent
                  ? isVideo
                    ? "rgba(59, 130, 246, 0.5)"
                    : "rgba(168, 85, 247, 0.5)"
                  : "transparent",
                transition: "background-color 200ms",
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.backgroundColor = isVideo
                    ? "rgba(59, 130, 246, 0.3)"
                    : "rgba(168, 85, 247, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: "11px",
                  fontWeight: isCurrent ? "bold" : "normal",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  padding: "0 4px",
                }}
              >
                {getSceneLabel(scene)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Timeline - Ligne 2: Particules ambiantes */}
      <div
        style={{
          display: "flex",
          height: "20px",
          borderRadius: "0 0 6px 6px",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          marginTop: "2px",
        }}
      >
        {/* Marqueur de position actuelle */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(elapsedTime / totalDuration) * 100}%`,
            width: "2px",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            transition: "left 100ms linear",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Événements de particules ambiantes */}
        {ambientParticleEvents.map((event, index) => {
          const startPercent = (event.startTime / totalDuration) * 100;
          const widthPercent = (event.duration / totalDuration) * 100;
          const isActive = showAmbientParticles;

          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
                height: "100%",
                backgroundColor: isActive
                  ? "rgba(255, 100, 50, 0.7)"
                  : "rgba(255, 100, 50, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "3px",
                transition: "background-color 200ms",
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: "9px",
                  fontWeight: isActive ? "bold" : "normal",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                }}
              >
                {getAmbientEffectLabel(event.effect)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Temps global */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                backgroundColor: "rgba(59, 130, 246, 0.7)",
              }}
            />
            Video
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                backgroundColor: "rgba(168, 85, 247, 0.7)",
              }}
            />
            Ecran
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                backgroundColor: "rgba(255, 100, 50, 0.7)",
              }}
            />
            Ambiant
          </div>
        </div>
        <span style={{ fontFamily: "monospace" }}>
          Total: {formatTime(elapsedTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
}
