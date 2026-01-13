import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { MainScene } from './scenes'
import { canvasConfig } from './config/canvas.config'

import './styles.css'

export default function App() {
  return (
    <div className="app-container">
      <Leva collapsed />
      <Canvas
        camera={canvasConfig.camera}
        gl={canvasConfig.gl}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000')
        }}>
        <MainScene />
      </Canvas>
    </div>
  )
}
