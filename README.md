# Sensor Preview Web Tool

> **Status: Work in Progress**

A browser-based 3D visualization tool for previewing sensor configurations. Place cameras and LIDARs in a virtual scene and see their fields of view and simulated outputs in real-time.

## Features

- **Camera sensors** with frustum visualization and live preview rendering
- **LIDAR sensors** with scan volume visualization and real-time point cloud generation
- **Pose controls** for position (X, Y, Z) and rotation (Roll, Pitch, Yaw)
- **Built-in presets** for common sensors (Velodyne VLP-16, Intel RealSense D435, etc.)
- **Save/load configurations** to browser storage or export as JSON
- **Single-file build** - works offline, no server required

## Quick Start

```bash
# Install dependencies
pixi run pnpm install

# Start development server
pixi run pnpm dev

# Build for production (single HTML file)
pixi run pnpm build
```

## Tech Stack

- **TypeScript** + **Three.js** for 3D rendering
- **Vite** for fast development and bundling
- **vite-plugin-singlefile** for standalone HTML output

## License

MIT
