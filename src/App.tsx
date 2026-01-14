import { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { MainScene } from "./scenes";
import { canvasConfig } from "./config/canvas.config";
import { Timeline } from "./components/ui/timeline";
import { FadeOverlay } from "./components/ui/fade-overlay";
import { useTimeline } from "./hooks/useTimeline";

import "./styles.css";

// Config caméra en dehors du composant pour éviter les re-créations
const cameraProps = {
  position: [0, 1.6, 0] as [number, number, number],
  fov: 75,
};

export default function App() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  // Utiliser le hook timeline pour gérer tout le séquençage
  const timeline = useTimeline({ videoElement });

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    setVideoElement(video);
  }, []);

  // URL vidéo basée sur la scène actuelle
  const videoUrl = timeline.currentVideo
    ? `/scene${timeline.currentVideo}.mp4`
    : undefined;

  return (
    <div className="app-container">
      <Leva collapsed />
      <Canvas
        camera={cameraProps}
        gl={canvasConfig.gl}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000");
        }}
      >
        <MainScene
          videoUrl={videoUrl}
          onVideoReady={handleVideoReady}
          particleEffect={timeline.particleEffect}
          particlesEnabled={timeline.showParticles}
          ambientParticleEffect={timeline.ambientParticleEffect}
          showAmbientParticles={timeline.showAmbientParticles}
          ambientParticleOpacity={timeline.ambientParticleOpacity}
        />
      </Canvas>

      {/* Overlay de fondu */}
      <FadeOverlay opacity={timeline.fadeOpacity} />

      {/* Timeline avec tous les contrôles */}
      <Timeline
        scenes={timeline.scenes}
        currentIndex={timeline.currentIndex}
        progress={timeline.progress}
        sceneProgress={timeline.sceneProgress}
        elapsedTime={timeline.elapsedTime}
        totalDuration={timeline.totalDuration}
        isPlaying={timeline.isPlaying}
        playbackMode={timeline.playbackMode}
        play={timeline.play}
        pause={timeline.pause}
        goToScene={timeline.goToScene}
        togglePlaybackMode={timeline.togglePlaybackMode}
        videoElement={videoElement}
        showParticles={timeline.showParticles}
        sceneDuration={timeline.sceneDuration}
        sceneElapsedTime={timeline.sceneElapsedTime}
        ambientParticleEvents={timeline.ambientParticleEvents}
        showAmbientParticles={timeline.showAmbientParticles}
      />
    </div>
  );
}
