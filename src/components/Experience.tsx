import { useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { MainScene } from "../scenes";
import { PostProcessing } from "./3d";
import { canvasConfig } from "../config/canvas.config";
import { Timeline } from "./ui/timeline";
import { FadeOverlay } from "./ui/fade-overlay";
import { EndingOverlay } from "./ui/ending-overlay";
import { ExitButton } from "./ui/exit-button";
import { useTimeline } from "../hooks/useTimeline";

// Config caméra en dehors du composant pour éviter les re-créations
const cameraProps = {
  position: [0, 1.6, 0] as [number, number, number],
  fov: 75,
};

/**
 * Composant principal de l'expérience 3D immersive
 */
export function Experience() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  // Utiliser le hook timeline pour gérer tout le séquençage
  const timeline = useTimeline({ videoElement });

  // Démarrer automatiquement l'expérience
  useEffect(() => {
    timeline.play();
  }, []);

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
          activeAmbientEffects={timeline.activeAmbientEffects}
          audioUrl="/genesis-audio.mp3"
          isPlaying={timeline.isPlaying}
          audioCurrentTime={timeline.audioCurrentTime}
          showText={timeline.showText}
          currentText={timeline.currentText}
        />
        <PostProcessing toneMappingExposure={timeline.toneMappingExposure} />
      </Canvas>

      {/* Overlay de fondu */}
      <FadeOverlay opacity={timeline.fadeOpacity} />

      {/* Bouton de sortie - apparaît quand on sort du pointer lock */}
      <ExitButton returnUrl="/" />

      {/* Overlay de fin avec flou, texte "merci" et popup de choix */}
      <EndingOverlay
        isActive={timeline.isEnding}
        onContinue={timeline.resetEnding}
        returnUrl="/"
      />

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
        goToTime={timeline.goToTime}
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
