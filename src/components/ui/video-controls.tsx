import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "./button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface VideoControlsProps {
  currentVideo: number;
  onVideoChange: (videoNumber: number) => void;
  videoElement: HTMLVideoElement | null;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ProgressBar({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onChange(percent * max);
  };

  const progress = max > 0 ? (value / max) * 100 : 0;

  return (
    <div
      ref={barRef}
      onClick={handleClick}
      style={{
        flex: 1,
        height: "6px",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: "3px",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: "#fff",
          borderRadius: "3px",
          transition: "width 0.1s",
        }}
      />
    </div>
  );
}

export function VideoControls({
  currentVideo,
  onVideoChange,
  videoElement,
}: VideoControlsProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!videoElement) return;

    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    const handleDurationChange = () => setDuration(videoElement.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(videoElement.duration);

    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("durationchange", handleDurationChange);
    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);

    setDuration(videoElement.duration || 0);
    setCurrentTime(videoElement.currentTime || 0);
    setIsPlaying(!videoElement.paused);
    setIsMuted(videoElement.muted);

    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("durationchange", handleDurationChange);
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
    };
  }, [videoElement]);

  const togglePlay = useCallback(() => {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  }, [videoElement]);

  const toggleMute = useCallback(() => {
    if (!videoElement) return;
    videoElement.muted = !videoElement.muted;
    setIsMuted(videoElement.muted);
  }, [videoElement]);

  const handleSeek = useCallback(
    (value: number) => {
      if (!videoElement) return;
      videoElement.currentTime = value;
      setCurrentTime(value);
    },
    [videoElement],
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        minWidth: "500px",
      }}
    >
      {/* Barre de progression */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.7)",
            minWidth: "40px",
          }}
        >
          {formatTime(currentTime)}
        </span>
        <ProgressBar value={currentTime} max={duration} onChange={handleSeek} />
        <span
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.7)",
            minWidth: "40px",
          }}
        >
          {formatTime(duration)}
        </span>
      </div>

      {/* Contrôles */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Play/Pause et Volume */}
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="ghost" size="icon" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </Button>
        </div>

        {/* Sélection de scène */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[1, 2, 3, 4].map((num) => (
            <Button
              key={num}
              variant={currentVideo === num ? "default" : "outline"}
              size="sm"
              onClick={() => onVideoChange(num)}
              style={{ minWidth: "70px" }}
            >
              Scène {num}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
