import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { MainScene } from "./scenes";
import { canvasConfig } from "./config/canvas.config";
import { VideoControls } from "./components/ui/video-controls";

import "./styles.css";

export default function App() {
  const [currentVideo, setCurrentVideo] = useState(1);
  const videoUrl = `/scene${currentVideo}.mp4`;

  return (
    <div className="app-container">
      <Leva collapsed />
      <Canvas
        camera={canvasConfig.camera}
        gl={canvasConfig.gl}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000");
        }}
      >
        <MainScene videoUrl={videoUrl} />
      </Canvas>
      <VideoControls
        currentVideo={currentVideo}
        onVideoChange={setCurrentVideo}
      />
    </div>
  );
}
