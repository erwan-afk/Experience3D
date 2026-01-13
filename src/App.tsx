import { useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { MainScene } from "./scenes";
import { canvasConfig } from "./config/canvas.config";
import { VideoControls } from "./components/ui/video-controls";

import "./styles.css";

// Config caméra en dehors du composant pour éviter les re-créations
const cameraProps = {
  position: [0, 1.6, 0] as [number, number, number],
  fov: 75,
};

export default function App() {
  const [currentVideo, setCurrentVideo] = useState(1);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const videoUrl = `/scene${currentVideo}.mp4`;

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    setVideoElement(video);
  }, []);

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
        <MainScene videoUrl={videoUrl} onVideoReady={handleVideoReady} />
      </Canvas>
      <VideoControls
        currentVideo={currentVideo}
        onVideoChange={setCurrentVideo}
        videoElement={videoElement}
      />
    </div>
  );
}
