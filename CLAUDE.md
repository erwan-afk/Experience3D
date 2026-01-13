# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development server (port 3000, auto-opens browser)
pnpm dev

# Production build (outputs to dist/)
pnpm build

# Preview production build
pnpm serve
```

## Architecture

This is a React Three Fiber (R3F) application for rendering interactive 3D scenes with GLTF models.

### Tech Stack
- **React 19** with TypeScript and Vite
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful R3F helpers (OrbitControls, useGLTF, MeshReflectorMaterial)
- **Leva** - GUI controls for real-time parameter tweaking
- **Tailwind CSS v4** - Styling (dark theme configured via CSS variables in `src/styles.css`)

### Project Structure

```
src/
├── App.tsx              # Canvas setup with Leva GUI
├── index.tsx            # React root
├── scenes/              # Scene compositions
│   └── MainScene.tsx    # Main scene with model, floor, lights, controls
├── components/
│   ├── 3d/              # Three.js components
│   │   ├── Model3D.tsx  # GLTF loader with material processing
│   │   ├── Floor.tsx    # Reflective floor with Leva controls
│   │   └── Lights.tsx   # Ambient + directional lights
│   └── ui/              # React UI components (shadcn/ui pattern)
├── config/
│   └── canvas.config.ts # Camera, GL renderer, and light settings
├── types/
│   └── index.ts         # TypeScript interfaces for all components
└── lib/
    └── utils.ts         # cn() utility for Tailwind class merging
```

### Path Aliases

Configured in both `vite.config.ts` and `tsconfig.json`:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@scenes/*` → `src/scenes/*`
- `@config/*` → `src/config/*`
- `@types/*` → `src/types/*`
- `@lib/*` → `src/lib/*`

### Key Patterns

**3D Components**: Located in `src/components/3d/`, exported via barrel file. Each component handles its own Three.js setup.

**Model Loading**: `Model3D` uses `useGLTF` from drei. Models are cloned and materials are processed to add emissive properties.

**Runtime Controls**: The `Floor` component demonstrates the Leva pattern for exposing parameters (blur, resolution, reflectivity) as GUI controls.

**Configuration**: Canvas settings (camera FOV/position, WebGL options) and light intensities are centralized in `src/config/canvas.config.ts`.

### Assets

Static assets in `public/`:
- `blocking.glb` - Default 3D model loaded by MainScene
- Video files (video1.mp4, video2.mp4, video3.mp4)
