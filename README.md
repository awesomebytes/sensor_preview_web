# Sensor Preview Web Tool

A browser-based 3D visualization tool for previewing sensor configurations. Place cameras and LIDARs in a virtual scene and see their fields of view and simulated outputs in real-time.

## Features

- **Camera sensors** with frustum visualization and live preview rendering
- **Lens distortion simulation** - Brown-Conrady and fisheye models with realistic defaults
- **LIDAR sensors** with scan volume visualization and real-time point cloud generation
- **Pose controls** for position (X, Y, Z) and rotation (Roll, Pitch, Yaw)
- **Built-in presets** for common sensors (Velodyne VLP-16, Intel RealSense D435, etc.)
- **Save/load configurations** to browser storage or export as JSON
- **Single-file build** - works offline, no server required

## Quick Start

```bash
# Install dependencies
pixi run pnpm install

# Start development server (with hot reload)
pixi run pnpm dev
# Opens at http://localhost:5173/

# Build for production (single HTML file)
pixi run pnpm build
# Output: dist/index.html
```

## Running the Built File

After running `pixi run pnpm build`, you can open `dist/index.html` directly in your browser:

```bash
# Option 1: Open directly (works with file:// protocol)
xdg-open dist/index.html        # Linux
open dist/index.html            # macOS
start dist/index.html           # Windows

# Option 2: Preview with Vite's built-in server
pixi run pnpm preview
# Opens at http://localhost:4173/
```

The single HTML file is fully self-contained and works offline - no server required.

## Development

```bash
# Type check
pixi run pnpm typecheck
```

## Tech Stack

- **TypeScript** + **Three.js** for 3D rendering
- **Vite** for fast development and bundling
- **vite-plugin-singlefile** for standalone HTML output

## License

MIT
