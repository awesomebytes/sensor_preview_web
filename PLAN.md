# Sensor Preview Web Tool - Implementation Plan

## Overview

A browser-based 3D visualization tool for previewing sensor configurations. Users can place cameras and LIDARs in a virtual scene and see their fields of view and simulated outputs in real-time.

**Target Browser:** Chrome (latest)  
**Language:** TypeScript  
**Build Tool:** Vite  
**Package Manager:** pnpm  
**Output:** Single-page static app (can run without hosting)

---

## 1. Feature List

### Phase 1: MVP (Current Scope)

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F1.1 | 3D scene with orbit controls | Must | Pending |
| F1.2 | Geometric scenario objects (household) | Must | Pending |
| F1.3 | Camera sensor with frustum visualization | Must | Pending |
| F1.4 | Camera preview window (rendered view) | Must | Pending |
| F1.5 | LIDAR sensor with scan volume visualization | Must | Pending |
| F1.6 | LIDAR point cloud generation (real-time) | Must | Pending |
| F1.7 | Sensor pose controls (position + rotation) | Must | Pending |
| F1.8 | Real-time update as sensors are dragged/adjusted | Must | Pending |
| F1.9 | Add/remove multiple sensors | Must | Pending |
| F1.10 | Sensor list panel with enable/disable toggle | Must | Pending |
| F1.11 | Save/load configurations (LocalStorage) | Must | Pending |
| F1.12 | Coordinate system toggle (ROS/Three.js) in settings | Must | Pending |
| F1.13 | Built-in sensor presets (common cameras, LIDARs) | Should | Pending |
| F1.14 | Export/import configuration as JSON file | Should | Pending |

### Phase 2: Enhanced Sensors

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F2.1 | Depth sensor type | Must | Pending |
| F2.2 | RGBD sensor type (camera + depth combined) | Must | Pending |
| F2.3 | Lens distortion simulation (Brown-Conrady model) | Must | Pending |
| F2.4 | Distortion toggle (show calibrated vs raw) | Must | Pending |
| F2.5 | RGBD colored point cloud visualization | Should | Pending |

### Phase 3: Advanced Scenarios

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F3.1 | City scenario (geometric) | Must | Pending |
| F3.2 | Warehouse scenario (geometric) | Must | Pending |
| F3.3 | Mixed scenario | Should | Pending |
| F3.4 | Custom 3D model import (GLTF/GLB from Sketchfab) | Should | Pending |
| F3.5 | Scenario object library (add/remove objects) | Could | Pending |

### Phase 4: Composite Views

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F4.1 | "Sensor-only view" mode (hide scenario, show only sensor data) | Must | Pending |
| F4.2 | Multi-camera tiled preview | Should | Pending |
| F4.3 | Coverage gap visualization | Could | Pending |
| F4.4 | Point cloud fusion from multiple sensors | Could | Pending |

### Future Considerations (Out of Scope)

| ID | Feature | Notes |
|----|---------|-------|
| F5.1 | URDF import | Separate tool will extract sensor poses from URDF |
| F5.2 | Photorealistic rendering | May add later if geometric proves insufficient |
| F5.3 | Mobile/touch support | Desktop-only for now |

---

## 2. Technical Specification

### 2.1 Coordinate System

**Default:** ROS convention
- X-axis: Forward (red)
- Y-axis: Left (green)  
- Z-axis: Up (blue)

**Implementation:** Apply a root transform to convert Three.js (Y-up) to ROS (Z-up):

```typescript
// In scene setup
const rosRoot = new THREE.Group();
rosRoot.rotation.x = -Math.PI / 2; // Rotate so Z is up
scene.add(rosRoot);
// All scene objects added to rosRoot, not scene directly
```

**Settings toggle:** Store in app state, swap root transform when changed.

### 2.2 Sensor Data Model

```typescript
// src/types/sensors.ts

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface EulerAngles {
  roll: number;   // degrees
  pitch: number;  // degrees
  yaw: number;    // degrees
}

export type SensorType = 'camera' | 'lidar' | 'depth' | 'rgbd';

export interface SensorBase {
  id: string;           // UUID
  name: string;         // User-defined, e.g., "Front Camera"
  type: SensorType;
  enabled: boolean;
  position: Vector3;    // meters, ROS frame
  rotation: EulerAngles;
  color: string;        // Hex color for visualization
}

export interface CameraSensorConfig extends SensorBase {
  type: 'camera';
  hFov: number;         // Horizontal FOV in degrees
  vFov: number;         // Vertical FOV in degrees
  resolutionH: number;  // Pixels
  resolutionV: number;  // Pixels
  minRange: number;     // meters
  maxRange: number;     // meters
  // Phase 2: distortion coefficients
}

export interface LidarSensorConfig extends SensorBase {
  type: 'lidar';
  hFov: number;         // Horizontal FOV (360 for spinning)
  vFov: number;         // Vertical FOV
  channels: number;     // Vertical laser count (16, 32, 64, etc.)
  angularResH: number;  // Horizontal resolution in degrees
  minRange: number;     // meters
  maxRange: number;     // meters
}

export type SensorConfig = CameraSensorConfig | LidarSensorConfig;
```

### 2.3 Application State

```typescript
// src/types/state.ts

import type { SensorConfig } from './sensors';

export type CoordinateSystem = 'ros' | 'threejs';
export type ScenarioType = 'household' | 'city' | 'warehouse';

export interface AppSettings {
  coordinateSystem: CoordinateSystem;
  pointSize: number;
  maxPoints: number;
  updateRateMs: number;
}

export interface AppState {
  sensors: SensorConfig[];
  selectedSensorId: string | null;
  scenario: ScenarioType;
  settings: AppSettings;
}
```

### 2.4 Preset Sensors (Built-in)

```typescript
// src/data/presets.ts

import type { CameraSensorConfig, LidarSensorConfig } from '../types/sensors';

export type CameraPreset = Omit<CameraSensorConfig, 'id' | 'name' | 'enabled' | 'position' | 'rotation' | 'color'>;
export type LidarPreset = Omit<LidarSensorConfig, 'id' | 'name' | 'enabled' | 'position' | 'rotation' | 'color'>;

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  'logitech-c920': {
    type: 'camera',
    hFov: 70.42,
    vFov: 43.3,
    resolutionH: 1920,
    resolutionV: 1080,
    minRange: 0.1,
    maxRange: 50,
  },
  'realsense-d435-rgb': {
    type: 'camera',
    hFov: 69,
    vFov: 42,
    resolutionH: 1920,
    resolutionV: 1080,
    minRange: 0.1,
    maxRange: 50,
  },
  'fisheye-180': {
    type: 'camera',
    hFov: 180,
    vFov: 180,
    resolutionH: 1280,
    resolutionV: 720,
    minRange: 0.1,
    maxRange: 30,
  },
};

export const LIDAR_PRESETS: Record<string, LidarPreset> = {
  'velodyne-vlp16': {
    type: 'lidar',
    hFov: 360,
    vFov: 30,
    channels: 16,
    angularResH: 0.2,
    minRange: 0.1,
    maxRange: 100,
  },
  'velodyne-vlp32c': {
    type: 'lidar',
    hFov: 360,
    vFov: 40,
    channels: 32,
    angularResH: 0.2,
    minRange: 0.1,
    maxRange: 200,
  },
  'ouster-os1-64': {
    type: 'lidar',
    hFov: 360,
    vFov: 45,
    channels: 64,
    angularResH: 0.35,
    minRange: 0.3,
    maxRange: 120,
  },
};

export const PRESET_DISPLAY_NAMES: Record<string, string> = {
  'logitech-c920': 'Logitech C920',
  'realsense-d435-rgb': 'Intel RealSense D435 (RGB)',
  'fisheye-180': 'Generic Fisheye 180°',
  'velodyne-vlp16': 'Velodyne VLP-16',
  'velodyne-vlp32c': 'Velodyne VLP-32C',
  'ouster-os1-64': 'Ouster OS1-64',
};
```

### 2.5 Geometric Scenario Objects

**Household scenario** - built with Three.js primitives:

| Object | Geometry | Approximate Size |
|--------|----------|------------------|
| Floor | PlaneGeometry | 10m × 10m |
| Walls | BoxGeometry (thin) | 10m × 3m × 0.1m |
| Table | BoxGeometry | 1.5m × 0.8m × 0.75m |
| Chair | BoxGeometry composite | 0.5m × 0.5m × 1m |
| Sofa | BoxGeometry | 2m × 0.9m × 0.8m |
| Person (standing) | CylinderGeometry + SphereGeometry | 0.4m × 1.7m |
| Bookshelf | BoxGeometry | 1m × 0.3m × 2m |
| TV | BoxGeometry (thin) | 1.2m × 0.05m × 0.7m |
| Lamp | CylinderGeometry + ConeGeometry | 0.3m × 1.5m |

Use distinct colors for each object type to aid visualization.

---

## 3. Architecture

### 3.1 File Structure

```
sensor_preview_web/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                    # Entry point
│   ├── App.ts                     # Main application class
│   ├── types/
│   │   ├── sensors.ts             # Sensor type definitions
│   │   └── state.ts               # App state types
│   ├── core/
│   │   ├── Scene.ts               # Three.js scene setup
│   │   ├── CoordinateSystem.ts    # ROS/Three.js transforms
│   │   └── Renderer.ts            # Render loop management
│   ├── sensors/
│   │   ├── SensorManager.ts       # Sensor CRUD operations
│   │   ├── BaseSensor.ts          # Abstract base class
│   │   ├── CameraSensor.ts        # Camera implementation
│   │   └── LidarSensor.ts         # LIDAR implementation
│   ├── scenarios/
│   │   ├── ScenarioManager.ts     # Scenario loading
│   │   └── HouseholdScenario.ts   # Geometric household
│   ├── ui/
│   │   ├── UIManager.ts           # UI orchestration
│   │   ├── SensorPanel.ts         # Sensor list and config
│   │   ├── PreviewPanel.ts        # Camera preview display
│   │   └── SettingsModal.ts       # Settings dialog
│   ├── data/
│   │   └── presets.ts             # Built-in sensor presets
│   ├── utils/
│   │   ├── throttle.ts            # Throttle/debounce utilities
│   │   ├── uuid.ts                # UUID generation
│   │   └── storage.ts             # LocalStorage helpers
│   └── styles/
│       └── main.css               # All styling
└── dist/                          # Build output (gitignored)
```

### 3.2 Core Classes

#### App (src/App.ts)

```typescript
import type { AppState, SensorConfig } from './types';
import { Scene } from './core/Scene';
import { SensorManager } from './sensors/SensorManager';
import { UIManager } from './ui/UIManager';
import { loadState, saveState } from './utils/storage';

export class App {
  private state: AppState;
  private scene: Scene;
  private sensorManager: SensorManager;
  private uiManager: UIManager;

  constructor() {
    this.state = this.getInitialState();
    this.scene = new Scene();
    this.sensorManager = new SensorManager(this.scene);
    this.uiManager = new UIManager(this);
  }

  init(): void {
    this.scene.init(document.getElementById('viewport')!);
    this.uiManager.init();
    this.loadSavedState();
    this.startRenderLoop();
  }

  // State management
  getState(): AppState { return this.state; }
  
  addSensor(type: SensorType, presetId?: string): void { /* ... */ }
  removeSensor(id: string): void { /* ... */ }
  updateSensor(id: string, changes: Partial<SensorConfig>): void { /* ... */ }
  selectSensor(id: string | null): void { /* ... */ }
  
  // Persistence
  save(): void { saveState(this.state); }
  exportConfig(): void { /* Download JSON */ }
  importConfig(json: string): void { /* Parse and apply */ }
}
```

#### SensorManager (src/sensors/SensorManager.ts)

```typescript
import type { SensorConfig } from '../types/sensors';
import { CameraSensor } from './CameraSensor';
import { LidarSensor } from './LidarSensor';
import type { Scene } from '../core/Scene';

export class SensorManager {
  private scene: Scene;
  private sensors: Map<string, CameraSensor | LidarSensor> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  createSensor(config: SensorConfig): CameraSensor | LidarSensor {
    const sensor = config.type === 'camera' 
      ? new CameraSensor(config, this.scene)
      : new LidarSensor(config, this.scene);
    
    this.sensors.set(config.id, sensor);
    return sensor;
  }

  updateSensorPose(id: string, position: Vector3, rotation: EulerAngles): void {
    const sensor = this.sensors.get(id);
    if (sensor) {
      sensor.updatePose(position, rotation);
    }
  }

  removeSensor(id: string): void {
    const sensor = this.sensors.get(id);
    if (sensor) {
      sensor.dispose();
      this.sensors.delete(id);
    }
  }

  getSensor(id: string): CameraSensor | LidarSensor | undefined {
    return this.sensors.get(id);
  }
}
```

#### BaseSensor (src/sensors/BaseSensor.ts)

```typescript
import * as THREE from 'three';
import type { SensorConfig, Vector3, EulerAngles } from '../types/sensors';
import type { Scene } from '../core/Scene';

export abstract class BaseSensor<T extends SensorConfig = SensorConfig> {
  protected config: T;
  protected scene: Scene;
  protected group: THREE.Group;
  protected volumeMesh: THREE.Mesh | null = null;

  constructor(config: T, scene: Scene) {
    this.config = config;
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.addToWorld(this.group);
  }

  abstract createVisualization(): void;
  abstract updateVisualization(): void;

  updatePose(position: Vector3, rotation: EulerAngles): void {
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.set(
      THREE.MathUtils.degToRad(rotation.roll),
      THREE.MathUtils.degToRad(rotation.pitch),
      THREE.MathUtils.degToRad(rotation.yaw),
      'XYZ'
    );
    this.updateVisualization();
  }

  setEnabled(enabled: boolean): void {
    this.group.visible = enabled;
  }

  dispose(): void {
    this.scene.removeFromWorld(this.group);
    // Dispose geometries and materials
  }
}
```

#### CameraSensor (src/sensors/CameraSensor.ts)

```typescript
import * as THREE from 'three';
import { BaseSensor } from './BaseSensor';
import type { CameraSensorConfig } from '../types/sensors';

export class CameraSensor extends BaseSensor<CameraSensorConfig> {
  private frustumMesh: THREE.Mesh | null = null;
  private previewCamera: THREE.PerspectiveCamera;
  private renderTarget: THREE.WebGLRenderTarget;

  constructor(config: CameraSensorConfig, scene: Scene) {
    super(config, scene);
    this.previewCamera = this.createPreviewCamera();
    this.renderTarget = new THREE.WebGLRenderTarget(
      config.resolutionH / 4,  // Reduced for performance
      config.resolutionV / 4
    );
    this.createVisualization();
  }

  createVisualization(): void {
    const geometry = this.createFrustumGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    this.frustumMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.frustumMesh);
    this.group.add(this.previewCamera);
  }

  private createFrustumGeometry(): THREE.BufferGeometry {
    // Create truncated pyramid from FOV and range
    const { hFov, vFov, minRange, maxRange } = this.config;
    // ... geometry creation logic
  }

  renderPreview(renderer: THREE.WebGLRenderer): THREE.Texture {
    const scene = this.scene.getThreeScene();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, this.previewCamera);
    renderer.setRenderTarget(null);
    return this.renderTarget.texture;
  }
}
```

#### LidarSensor (src/sensors/LidarSensor.ts)

```typescript
import * as THREE from 'three';
import { BaseSensor } from './BaseSensor';
import type { LidarSensorConfig } from '../types/sensors';
import { throttle } from '../utils/throttle';

export class LidarSensor extends BaseSensor<LidarSensorConfig> {
  private pointCloud: THREE.Points | null = null;
  private raycaster: THREE.Raycaster;
  
  private throttledGeneratePointCloud: () => void;

  constructor(config: LidarSensorConfig, scene: Scene) {
    super(config, scene);
    this.raycaster = new THREE.Raycaster();
    this.throttledGeneratePointCloud = throttle(
      () => this.generatePointCloud(),
      50
    );
    this.createVisualization();
  }

  createVisualization(): void {
    // Create scan volume mesh
    this.createVolumeMesh();
    
    // Create point cloud
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
    });
    this.pointCloud = new THREE.Points(geometry, material);
    this.scene.addToWorld(this.pointCloud);
  }

  updateVisualization(): void {
    this.throttledGeneratePointCloud();
  }

  private generatePointCloud(): void {
    const { channels, hFov, vFov, angularResH, minRange, maxRange } = this.config;
    const positions: number[] = [];
    const colors: number[] = [];

    const vFovMin = -vFov / 2;
    const hFovMin = -hFov / 2;
    const hFovMax = hFov / 2;

    for (let ch = 0; ch < channels; ch++) {
      const vAngle = vFovMin + (ch / (channels - 1)) * vFov;
      const vRad = THREE.MathUtils.degToRad(vAngle);

      for (let hAngle = hFovMin; hAngle < hFovMax; hAngle += angularResH) {
        const hRad = THREE.MathUtils.degToRad(hAngle);

        const direction = new THREE.Vector3(
          Math.cos(vRad) * Math.cos(hRad),
          Math.cos(vRad) * Math.sin(hRad),
          Math.sin(vRad)
        );
        direction.applyQuaternion(this.group.quaternion);

        this.raycaster.set(this.group.position, direction);
        this.raycaster.near = minRange;
        this.raycaster.far = maxRange;

        const hits = this.raycaster.intersectObjects(
          this.scene.getScenarioObjects(),
          true
        );

        if (hits.length > 0) {
          const hit = hits[0];
          positions.push(hit.point.x, hit.point.y, hit.point.z);

          // Color by distance (red=close, green=far)
          const t = hit.distance / maxRange;
          colors.push(1 - t, t, 0.2);
        }
      }
    }

    const geometry = this.pointCloud!.geometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
}
```

### 3.3 Real-Time Update Strategy

When sensor pose changes (drag or slider):

1. **Immediate:** Update frustum/volume mesh transform (cheap)
2. **Throttled (50ms):** Regenerate LIDAR point cloud (expensive)
3. **Throttled (100ms):** Re-render camera preview (moderate)

```typescript
// src/utils/throttle.ts

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      // Schedule a call at the end of the delay period
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}
```

---

## 4. UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Sensor Preview Tool                              [Settings ⚙️] [Help ?]│
├───────────────┬─────────────────────────────────────────────────────────┤
│               │                                                         │
│  SENSORS      │                                                         │
│  ───────────  │                                                         │
│  [+ Camera]   │                                                         │
│  [+ LIDAR]    │                    3D VIEWPORT                          │
│               │                                                         │
│  ┌──────────┐ │              (Three.js canvas with                      │
│  │☑ Camera1 │ │               orbit controls)                           │
│  │  VLP-16  │ │                                                         │
│  └──────────┘ │                                                         │
│  ┌──────────┐ │                                                         │
│  │☑ LIDAR1  │ │                                                         │
│  │  VLP-16  │ │                                                         │
│  └──────────┘ │                                                         │
│               ├─────────────────────────────────────────────────────────┤
│  SCENARIO     │  SENSOR CONFIG (when sensor selected)                   │
│  ───────────  │  ────────────────────────────────────────               │
│  ○ Household  │  Name: [Camera1        ]  Preset: [Logitech C920 ▼]    │
│  ○ City       │                                                         │
│  ○ Warehouse  │  Position (m)           Rotation (deg)                  │
│               │  X: [0.00 ] ────○────   Roll:  [0   ] ────○────        │
│  ───────────  │  Y: [0.00 ] ────○────   Pitch: [0   ] ────○────        │
│  [Save]       │  Z: [0.50 ] ────○────   Yaw:   [0   ] ────○────        │
│  [Load]       │                                                         │
│  [Export]     │  H-FOV: [70  ]°  V-FOV: [43  ]°  Range: [0.1]-[50 ]m   │
│  [Import]     │  Resolution: [1920 ] × [1080 ] px                       │
│               │                                                         │
│               │  [Delete Sensor]                     [Clone Sensor]     │
├───────────────┴─────────────────────────────────────────────────────────┤
│  CAMERA PREVIEW (when camera selected)                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │                    Rendered camera view                            │ │
│  │                    (aspect matches sensor resolution)              │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Settings Panel (modal)

```
┌─────────────────────────────────────────┐
│  Settings                          [×]  │
├─────────────────────────────────────────┤
│                                         │
│  Coordinate System                      │
│  ○ ROS (X-forward, Z-up)                │
│  ● Three.js (Y-up)                      │
│                                         │
│  Point Cloud                            │
│  Point size: [3  ] px                   │
│  Max points: [50000]                    │
│                                         │
│  Performance                            │
│  Update rate: [50 ] ms                  │
│                                         │
│                            [Save]       │
└─────────────────────────────────────────┘
```

---

## 5. Implementation Order

Execute in this exact order. Each step should be completable and testable before moving to the next.

### Step 1: Project Setup ✅

> **Note:** This project uses pixi workspaces. All pnpm commands must be run via `pixi run pnpm <command>`.

1. Initialize project with pnpm and Vite:
   ```bash
   pixi run pnpm create vite . --template vanilla-ts
   ```
   *(If existing files conflict, create `package.json`, `tsconfig.json`, `vite.config.ts` manually)*
2. Install dependencies:
   ```bash
   pixi run pnpm install
   ```
3. Configure `vite.config.ts` for single-file output:
   ```typescript
   import { defineConfig } from 'vite';
   import { viteSingleFile } from 'vite-plugin-singlefile';

   export default defineConfig({
     plugins: [viteSingleFile()],
     build: {
       target: 'esnext',
       minify: 'esbuild',
     },
   });
   ```
4. Configure `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true
     },
     "include": ["src"]
   }
   ```
5. Create initial file structure (empty files/folders as per Section 3.1)
6. Create basic `index.html` with viewport container
7. Create `src/main.ts` that logs "App initialized"
8. Verify: `pixi run pnpm dev` runs, page loads, console shows message

**Completed:** 2026-01-25. Dev server runs at `http://localhost:5173/`. Build produces single `dist/index.html` (7.42 kB).

### Step 2: 3D Scene Foundation ✅

1. Create `src/core/Scene.ts`:
   - Initialize THREE.Scene, THREE.PerspectiveCamera, THREE.WebGLRenderer
   - Add OrbitControls from `three/examples/jsm/controls/OrbitControls`
   - Add THREE.GridHelper and THREE.AxesHelper
2. Create `src/core/CoordinateSystem.ts`:
   - Create `rosRoot` group with rotation transform
   - Export functions: `addToWorld()`, `removeFromWorld()`
3. Create `src/core/Renderer.ts`:
   - Manage render loop with `requestAnimationFrame`
   - Handle window resize
4. Update `src/main.ts` to instantiate Scene
5. Verify: Can orbit around empty scene with visible grid and axes

**Completed:** 2026-01-25. Dev server runs at `http://localhost:5174/` (port 5173 was in use). Build produces single `dist/index.html` (500 kB with Three.js bundled).

**Implementation notes:**
- `Scene.ts`: Camera positioned at (8, 8, 8) looking at origin. OrbitControls with damping enabled. Added ambient + directional + hemisphere lighting for good 3D visualization. Grid is 20x20m with 20 divisions.
- `CoordinateSystem.ts`: ROS transform applied via `-Math.PI/2` rotation on X-axis of the `rosRoot` group. Grid rotated to lie on XY plane (Z-up in ROS). Includes `setCoordinateSystem()` method for toggling.
- `Renderer.ts`: Uses `ResizeObserver` for responsive resize handling. Supports `onBeforeRender` callbacks for future sensor updates. Calculates delta time for animations.
- **Types added early:** `src/types/sensors.ts` and `src/types/state.ts` were populated with basic type definitions needed for `CoordinateSystem.ts` to compile. Full type definitions match Section 2.2 and 2.3 specs.

### Step 3: Geometric Scenario ✅

1. Create `src/scenarios/HouseholdScenario.ts`:
   - Export function `createHouseholdScenario(): THREE.Group`
   - Build floor (PlaneGeometry, gray)
   - Build 4 walls (BoxGeometry, light gray)
   - Build table (BoxGeometry, brown)
   - Build 2 chairs (BoxGeometry composites, brown)
   - Build sofa (BoxGeometry, blue)
   - Build person (CylinderGeometry + SphereGeometry, skin tone)
   - Build bookshelf (BoxGeometry, brown)
2. Create `src/scenarios/ScenarioManager.ts`:
   - Load scenario by name
   - Return array of meshes for raycasting
3. Add scenario to scene in `main.ts`
4. Verify: Household scene visible, can orbit around it

**Completed:** 2026-01-25. Build produces single `dist/index.html` (513 kB).

**Implementation notes:**
- `HouseholdScenario.ts`: Created all geometric objects per spec plus TV and lamp. Objects use distinct materials with proper shadows. Color palette defined at top of file. Each object is a factory function returning a `THREE.Group`. Helper function `getScenarioMeshes()` traverses the group and returns all `THREE.Mesh` instances for raycasting.
- Object placement: Table centered at (0, 0.5, 0), chairs flanking it, sofa against back wall at Y=-3.5, person standing near sofa, bookshelf against left wall, TV against right wall facing sofa, lamp in corner.
- `ScenarioManager.ts`: Manages scenario lifecycle with `loadScenario(type)` and `unloadScenario()`. Properly disposes geometries and materials when unloading. Provides `getScenarioMeshes()` for future LIDAR raycasting. City and warehouse scenarios fall back to household with warning.
- `main.ts`: Creates `ScenarioManager` with callbacks to `scene.addToWorld()` / `removeFromWorld()`. Loads 'household' scenario on init. Both `scene` and `scenarioManager` exported to `window` for debugging.
- ROS coordinate system: All objects positioned with Z-up convention. Cylinders (person, lamp) rotated `Math.PI/2` on X to align with Z-axis. Floor lies on XY plane at Z=0.

### Step 4: Type Definitions ✅ (Completed in Step 2)

1. Create `src/types/sensors.ts` with all sensor interfaces (as in Section 2.2)
2. Create `src/types/state.ts` with AppState interface (as in Section 2.3)
3. Create `src/data/presets.ts` with sensor presets (as in Section 2.4)
4. Verify: TypeScript compiles with no errors

**Completed:** 2026-01-25. Types were implemented during Step 2 as they were required for `CoordinateSystem.ts` to compile.

**Implementation notes:**
- `src/types/sensors.ts`: Contains `Vector3`, `EulerAngles`, `SensorType`, `SensorBase`, `CameraSensorConfig`, `LidarSensorConfig`, `DepthSensorConfig`, `RgbdSensorConfig`, and union type `SensorConfig`.
- `src/types/state.ts`: Contains `CoordinateSystem`, `ScenarioType`, `AppSettings`, `AppState`, plus `DEFAULT_SETTINGS` and `DEFAULT_STATE` constants.
- `src/data/presets.ts`: Still contains placeholder comment. **Implement preset data when starting Step 14.**

### Step 5: Camera Sensor - Visualization ✅

1. Create `src/sensors/BaseSensor.ts` (abstract class as in Section 3.2)
2. Create `src/sensors/CameraSensor.ts`:
   - Implement `createVisualization()` with frustum geometry
   - Frustum: truncated pyramid from hFov, vFov, minRange, maxRange
   - Use semi-transparent green material (opacity 0.15)
3. Create `src/sensors/SensorManager.ts` with factory method
4. Hardcode a test camera in `main.ts`
5. Verify: Can see camera frustum in scene at origin

**Completed:** 2026-01-25. Build produces single `dist/index.html` (521 kB).

**Implementation notes:**
- `BaseSensor.ts`: Abstract class handling common sensor functionality - pose updates (position + rotation in degrees), visibility toggle, config management, and resource disposal. Uses Three.js Group as container. Implements `updatePose()` with XYZ Euler order and degree-to-radian conversion.
- `CameraSensor.ts`: Extends BaseSensor with frustum visualization. Frustum is a truncated pyramid pointing along +X axis (ROS forward). Creates BufferGeometry with 8 vertices (4 near, 4 far plane) and indexed triangle faces. Includes wireframe edges (LineSegments with EdgesGeometry) for better visibility and a small sphere marker at sensor origin. Material uses `depthWrite: false` for correct transparency blending.
- `SensorManager.ts`: Factory class with Map-based sensor storage. Provides CRUD operations: `createSensor()`, `getSensor()`, `updateSensor()`, `removeSensor()`. Switch statement ready for LIDAR implementation in Step 11.
- `main.ts`: Two test cameras added - green camera at (0, 2, 1.5) pointing forward, orange camera at (-2, -2, 1.2) rotated 45°. Both visible in scene with distinct frustum colors. Sensor creation wrapped in try-catch for error isolation.
- **Frustum geometry:** Near/far plane half-widths calculated as `range * tan(fov/2)`. Width along Y-axis, height along Z-axis (ROS convention).

### Step 6: Camera Sensor - Pose Updates ✅

1. Implement `updatePose()` in CameraSensor
2. Implement `setEnabled()` to show/hide
3. Add test: change pose programmatically, verify frustum moves
4. Verify: Frustum position and rotation update correctly

**Completed:** 2026-01-25. Build produces single `dist/index.html` (523 kB).

**Implementation notes:**
- `updatePose()` and `setEnabled()` were already implemented in `BaseSensor.ts` during Step 5 and inherited by `CameraSensor`. No changes needed to sensor classes.
- Added three test functions exposed to browser console for interactive testing:
  - `toggleAnimation()`: Creates a magenta camera that orbits the scene in a 3-meter radius circular path, demonstrating real-time pose updates each frame
  - `testPoseUpdate()`: Programmatically moves the green test camera to verify position/rotation updates
  - `testToggleEnabled(sensorId)`: Toggles sensor visibility on/off
- Animation callback registered with `Renderer.onBeforeRender()` to update animated camera pose every frame (60fps)
- Fixed timing bug: `animationStartTime` and render callback `time` parameter both use seconds (not milliseconds)
- Fixed initialization order bug: Placeholder window functions must be assigned before `init()` runs, so `init()` can overwrite them with real implementations
- All console test functions work correctly, camera frustums move smoothly when pose is updated

### Step 7: Camera Sensor - Preview ✅

1. Add THREE.PerspectiveCamera to CameraSensor (for rendering preview)
2. Add THREE.WebGLRenderTarget for off-screen rendering
3. Implement `renderPreview()` method
4. Create `src/ui/PreviewPanel.ts`:
   - Create canvas element in DOM
   - Display rendered texture using 2D canvas context
5. Call renderPreview in render loop for selected camera
6. Verify: Camera preview shows scene from sensor's perspective

**Completed:** 2026-01-25. Build produces single `dist/index.html` (528 kB).

**Implementation notes:**
- `CameraSensor.ts`: Added `THREE.PerspectiveCamera` (child of sensor group, inherits pose transforms) and `THREE.WebGLRenderTarget` at 25% of sensor resolution for performance. Camera orientation computed via `Matrix4.lookAt()` to look along +X with +Z as up (ROS convention). Methods: `renderPreview(renderer)`, `getRenderTarget()`, `getPreviewCamera()`, `setPreviewShowsSensorVis(visible)`.
- `PreviewPanel.ts`: Manages `#preview-container` DOM element. Creates 2D canvas to display rendered preview by reading pixels from WebGLRenderTarget with vertical flip. Panel is **resizable** via drag handle at top (height persisted to localStorage). Shows camera name in header with "Show sensors" checkbox toggle.
- `BaseSensor.ts`: Added `SENSOR_VIS_LAYER = 1` constant and `setVisualizationLayer()` helper. Sensor visualizations (frustum, edges, marker) placed ONLY on layer 1 using `layers.set()`. Main camera and preview camera enable layer 1 to see them; preview can toggle layer 1 off to hide sensor visualizations.
- `main.ts`: Creates `PreviewPanel`, hooks `updatePreview()` into render loop, exposes `selectCameraForPreview(id)` and `togglePreviewSensorVis()` for console testing.
- **Camera orientation fix:** Initial implementation had wrong Y rotation sign (180° flip) and missing up-vector alignment (90° roll). Fixed by using `Matrix4.lookAt(eye, target, up)` to correctly compute rotation for looking along +X with +Z up.

### Step 8: Sensor UI Panel - Structure

1. Create `src/ui/UIManager.ts` to orchestrate all UI
2. Create `src/ui/SensorPanel.ts`:
   - Sensor list container
   - "Add Camera" and "Add LIDAR" buttons
   - Individual sensor items with checkbox and name
3. Create `src/styles/main.css` with flexbox layout matching Section 4
4. Verify: UI structure renders correctly

### Step 9: Sensor UI Panel - Controls

1. Add sensor config panel to SensorPanel.ts:
   - Name input
   - Preset dropdown
   - Position sliders (X, Y, Z) with number inputs
   - Rotation sliders (Roll, Pitch, Yaw) with number inputs
   - Sensor-specific fields (FOV, resolution for camera)
2. Wire slider `input` events to App.updateSensor()
3. Verify: Can add camera, adjust pose with sliders, see frustum move in real-time

### Step 10: App State Management

1. Create `src/App.ts` with full state management:
   - `addSensor()`, `removeSensor()`, `updateSensor()`, `selectSensor()`
   - State change triggers UI re-render and 3D update
2. Create `src/utils/uuid.ts` for generating sensor IDs
3. Connect UI actions to App methods
4. Verify: Adding, removing, selecting sensors works correctly

### Step 11: LIDAR Sensor - Volume

1. Create `src/sensors/LidarSensor.ts`:
   - Implement scan volume geometry:
     - Cone for hFov < 360°
     - Cylinder-like shape for hFov = 360°
   - Semi-transparent blue material (opacity 0.15)
2. Implement `updatePose()`
3. Add "Add LIDAR" button functionality
4. Verify: Can add LIDAR, see scan volume in scene

### Step 12: LIDAR Sensor - Point Cloud

1. Create `src/utils/throttle.ts` with throttle function
2. Add THREE.Points with BufferGeometry to LidarSensor
3. Implement `generatePointCloud()`:
   - Raycast through scene for each channel and horizontal angle
   - Color points by distance (red=close, green=far)
4. Call throttled generatePointCloud on pose change
5. Verify: Point cloud updates as LIDAR is moved

### Step 13: Multiple Sensors

1. Update SensorManager to handle Map of sensors
2. Implement sensor selection (click in list)
3. Show config panel for selected sensor only
4. Enable/disable checkbox toggles visibility
5. Add Delete and Clone buttons
6. Verify: Can add multiple sensors of mixed types, select and configure each

### Step 14: Presets

1. Add preset dropdown to config panel
2. Populate from CAMERA_PRESETS and LIDAR_PRESETS
3. Selecting preset populates all fields and updates sensor
4. Verify: Can create sensor from preset, values are correct

### Step 15: Persistence

1. Create `src/utils/storage.ts`:
   - `saveState(state: AppState): void` - serialize to LocalStorage
   - `loadState(): AppState | null` - deserialize from LocalStorage
2. Call saveState on state changes (debounced, 500ms)
3. Call loadState on app init, restore sensors
4. Verify: Refresh page, sensors persist

### Step 16: Export/Import

1. Add Export button:
   - Serialize state to JSON
   - Trigger download as `sensor-config.json`
2. Add Import button:
   - File input for JSON
   - Parse and apply to state
3. Verify: Export, clear LocalStorage, import, sensors restored

### Step 17: Settings Modal

1. Create `src/ui/SettingsModal.ts`:
   - Modal overlay with close button
   - Coordinate system radio buttons (ROS/Three.js)
   - Point size input
   - Max points input
2. Store settings in AppState.settings
3. Apply coordinate system change:
   - Update rosRoot transform
   - Re-render axes
4. Verify: Toggle coordinate system, axes and positions update

### Step 18: Polish

1. Add Help modal with usage instructions
2. Add hover states and transitions in CSS
3. Add error handling:
   - Invalid JSON import shows error message
   - Missing LocalStorage gracefully falls back
4. Performance tuning:
   - Adjust throttle rates if needed
   - Add point budget limit for LIDAR
5. Build and test single-file output:
   ```bash
   pixi run pnpm build
   # Open dist/index.html directly in browser
   ```
6. Verify: All acceptance criteria met

---

## 6. Acceptance Criteria

### MVP Complete When:

- [x] `pixi run pnpm dev` runs development server
- [x] `pixi run pnpm build` produces single `dist/index.html` that works standalone
- [x] 3D scene renders with household geometric objects
- [x] Can add camera sensor and see frustum in scene
- [x] Camera frustum position and rotation update correctly when changed programmatically
- [x] Camera preview window shows rendered view from sensor
- [ ] Can add LIDAR sensor and see scan volume
- [ ] LIDAR generates point cloud colored by distance
- [ ] Point cloud updates in real-time as sensor is dragged/adjusted
- [ ] Can add multiple sensors of mixed types
- [ ] Can enable/disable individual sensors
- [ ] Position and rotation adjustable via sliders (X, Y, Z, Roll, Pitch, Yaw)
- [ ] Preset sensors can be selected from dropdown
- [ ] Configuration persists across page refresh
- [ ] Can export/import configuration as JSON
- [ ] Coordinate system toggle works (ROS vs Three.js)
- [ ] No console errors during normal operation
- [x] TypeScript compiles with no errors (`pixi run pnpm typecheck`)

---

## 7. Dependencies

### package.json

```json
{
  "name": "sensor-preview-web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "three": "^0.170.0"
  },
  "devDependencies": {
    "@types/three": "^0.170.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-singlefile": "^2.0.0"
  }
}
```

### Key Libraries

| Package | Purpose |
|---------|---------|
| `three` | 3D rendering, raycasting, geometry |
| `@types/three` | TypeScript definitions for Three.js |
| `vite` | Fast dev server, ES module bundler |
| `vite-plugin-singlefile` | Bundle everything into one HTML file |
| `typescript` | Type checking and compilation |

---

## 8. Notes for Implementation Agent

1. **Pixi workspace:** This project uses pixi workspaces. **All pnpm commands must be prefixed with `pixi run`:**
   ```bash
   pixi run pnpm dev        # Start dev server
   pixi run pnpm build      # Production build
   pixi run pnpm typecheck  # Type check
   ```

2. **TypeScript strict mode:** The project uses strict TypeScript. All types must be explicit, no `any` unless absolutely necessary. Use type guards for narrowing.

3. **ES Modules:** Use ES module imports throughout. Three.js controls come from:
   ```typescript
   import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
   ```

4. **Test incrementally:** After each step, run `pixi run pnpm dev` and verify in browser. Run `pixi run pnpm typecheck` to catch type errors.

5. **State immutability:** When updating state, create new objects/arrays rather than mutating:
   ```typescript
   this.state = {
     ...this.state,
     sensors: [...this.state.sensors, newSensor],
   };
   ```

6. **Real-time is critical:** Use `input` event on sliders, not `change`. Point cloud must update as sliders are dragged.

7. **Performance budget:** Target 60fps for scene navigation. LIDAR point cloud generation can drop to 20fps during active dragging.

8. **Color scheme:**
   - Camera frustums: Green (#00ff00) with 15% opacity
   - LIDAR volumes: Blue (#0066ff) with 15% opacity
   - Point clouds: Gradient from red (close) to green (far)
   - Selected sensor: Highlight border in UI

9. **Coordinate transform:** Apply ROS transform at root level via CoordinateSystem. All user-facing positions are in the selected coordinate frame.

10. **Single-file build:** After `pixi run pnpm build`, the `dist/index.html` should work when opened directly from filesystem (`file://` protocol). Test this explicitly.

11. **Do not over-engineer:** MVP first. RGBD, lens distortion, and additional scenarios are Phase 2. Keep the architecture extensible but don't implement Phase 2 features.

12. **No external runtime dependencies:** The built output should not require any CDN or external resources. Everything is bundled into the single HTML file.

13. **Update the plan after being done:** This plan file must be up to date. You must "tick" the steps that have been done, and add the necessary explanations if technical or design decisions were made when fulfilling steps. This plan must make it easy for an AI agent to implement these steps.

14. **User verification required:** Never mark a step as complete (✅) until the user has explicitly confirmed the changes work correctly. For steps with visual output, the agent cannot verify correctness - only the user can. After implementing a step, inform the user it's ready for testing and wait for confirmation before updating the plan status.

15. **Do not break existing functionality:** Before considering any implementation done, ensure all previously working features still function. If a change breaks something, fix it before reporting completion.
