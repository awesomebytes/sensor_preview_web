import * as THREE from 'three';
import { BaseSensor, SENSOR_VIS_LAYER } from './BaseSensor';
import type { LidarSensorConfig } from '../types/sensors';
import type { Scene } from '../core/Scene';
import { throttle } from '../utils/throttle';

/**
 * LIDAR sensor with scan volume visualization and point cloud generation.
 * 
 * Renders the scan volume as:
 * - For hFov = 360°: A conical shell showing the spinning scan pattern
 * - For hFov < 360°: A cone sector showing the directional scan volume
 * 
 * Point cloud is generated via raycasting against scene objects:
 * - Each channel (vertical angle) and horizontal angle produces a ray
 * - Hit points are colored by distance (red=close, green=far)
 * - Point cloud updates are throttled to maintain performance during dragging
 */
export class LidarSensor extends BaseSensor<LidarSensorConfig> {
  private volumeMesh: THREE.Mesh | null = null;
  private volumeEdges: THREE.LineSegments | null = null;
  private sensorMarker: THREE.Mesh | null = null;
  
  // Slice visualization (single vertical scan plane)
  private sliceMesh: THREE.Mesh | null = null;
  private sliceEdges: THREE.LineSegments | null = null;

  // Point cloud visualization
  private pointCloud: THREE.Points | null = null;
  private pointCloudGeometry: THREE.BufferGeometry;
  private raycaster: THREE.Raycaster;

  // Throttled point cloud generation
  private throttledGeneratePointCloud: () => void;

  // Number of segments for geometry generation
  private static readonly H_SEGMENTS = 64;
  private static readonly V_SEGMENTS = 8;
  
  // Point cloud throttle delay (ms)
  private static readonly POINT_CLOUD_THROTTLE_MS = 50;

  constructor(config: LidarSensorConfig, scene: Scene) {
    super(config, scene);
    
    // Initialize raycaster
    this.raycaster = new THREE.Raycaster();
    
    // Initialize point cloud geometry with empty buffers
    this.pointCloudGeometry = new THREE.BufferGeometry();
    
    // Create throttled point cloud generator
    this.throttledGeneratePointCloud = throttle(
      () => this.generatePointCloud(),
      LidarSensor.POINT_CLOUD_THROTTLE_MS
    );
    
    this.createVisualization();
    
    // Generate initial point cloud
    this.generatePointCloud();
  }

  /**
   * Create the LIDAR scan volume visualization.
   */
  createVisualization(): void {
    // Create the scan volume geometry based on hFov
    const geometry = this.config.hFov >= 360
      ? this.createFullRotationGeometry()
      : this.createSectorGeometry();

    // Parse color from config
    const color = new THREE.Color(this.config.color);

    // Semi-transparent material for the volume
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.volumeMesh = new THREE.Mesh(geometry, material);
    this.setVisualizationLayer(this.volumeMesh);
    this.group.add(this.volumeMesh);

    // Add wireframe edges for better visibility
    const edgesGeometry = new THREE.EdgesGeometry(geometry, 30); // 30° threshold
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
    });
    this.volumeEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.setVisualizationLayer(this.volumeEdges);
    this.group.add(this.volumeEdges);

    // Add a small sphere at the sensor origin
    const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
    this.sensorMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    this.setVisualizationLayer(this.sensorMarker);
    this.group.add(this.sensorMarker);

    // Create slice visualization (single vertical scan plane at origin)
    this.createSliceVisualization(color);

    // Create point cloud
    this.createPointCloud();
  }

  /**
   * Create the slice visualization - a single vertical scan plane aligned with sensor origin.
   * This helps visualize the sensor's forward direction and origin point.
   */
  private createSliceVisualization(color: THREE.Color): void {
    const sliceGeometry = this.createSliceGeometry();
    
    // Slightly darker/more opaque material for the slice
    const darkerColor = color.clone().multiplyScalar(0.7);
    const sliceMaterial = new THREE.MeshBasicMaterial({
      color: darkerColor,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.sliceMesh = new THREE.Mesh(sliceGeometry, sliceMaterial);
    this.setVisualizationLayer(this.sliceMesh);
    this.sliceMesh.visible = this.config.showSlice ?? false;
    this.group.add(this.sliceMesh);

    // Add edges for better visibility
    const sliceEdgesGeometry = new THREE.EdgesGeometry(sliceGeometry);
    const sliceEdgesMaterial = new THREE.LineBasicMaterial({
      color: darkerColor,
      transparent: true,
      opacity: 0.8,
    });
    this.sliceEdges = new THREE.LineSegments(sliceEdgesGeometry, sliceEdgesMaterial);
    this.setVisualizationLayer(this.sliceEdges);
    this.sliceEdges.visible = this.config.showSlice ?? false;
    this.group.add(this.sliceEdges);
  }

  /**
   * Create geometry for the slice - a vertical plane from minRange to maxRange
   * spanning the vertical FOV, aligned with +X axis (sensor forward direction).
   */
  private createSliceGeometry(): THREE.BufferGeometry {
    const { vFov, minRange, maxRange } = this.config;
    const vSegments = LidarSensor.V_SEGMENTS;
    
    const vFovHalfRad = THREE.MathUtils.degToRad(vFov / 2);
    
    const vertices: number[] = [];
    const indices: number[] = [];

    // Create vertices along the slice (at h=0, pointing along +X)
    for (let v = 0; v <= vSegments; v++) {
      const vAngle = -vFovHalfRad + (v / vSegments) * (2 * vFovHalfRad);
      const cosV = Math.cos(vAngle);
      const sinV = Math.sin(vAngle);

      // Near vertex (at minRange)
      vertices.push(minRange * cosV, 0, minRange * sinV);
      
      // Far vertex (at maxRange)
      vertices.push(maxRange * cosV, 0, maxRange * sinV);
    }

    // Create triangles connecting the vertices
    for (let v = 0; v < vSegments; v++) {
      const i0 = v * 2;       // near current
      const i1 = v * 2 + 1;   // far current
      const i2 = (v + 1) * 2 + 1; // far next
      const i3 = (v + 1) * 2; // near next

      // Two triangles for each quad
      indices.push(i0, i1, i2);
      indices.push(i0, i2, i3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Create the point cloud visualization.
   * The point cloud is added directly to the world (not as a child of the sensor group)
   * because it represents world-space positions of detected surfaces.
   */
  private createPointCloud(): void {
    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.pointCloud = new THREE.Points(this.pointCloudGeometry, material);
    this.pointCloud.name = `lidar-pointcloud-${this.config.id}`;
    
    // Point cloud is in world coordinates, add directly to world
    // (not as child of sensor group which would transform with the sensor)
    this.scene.addToWorld(this.pointCloud);
  }

  // Maximum number of rays to cast per frame (performance limit)
  private static readonly MAX_RAYS_PER_FRAME = 10000;
  
  // Maximum number of meshes to raycast against (performance limit)
  private static readonly MAX_RAYCAST_TARGETS = 500;

  /**
   * Generate the point cloud by raycasting through the scene.
   * 
   * For each channel (vertical angle) and horizontal angle:
   * 1. Calculate the ray direction in sensor-local space
   * 2. Transform to world space using sensor pose
   * 3. Raycast against scenario objects
   * 4. If hit, add point with distance-based color
   * 
   * Performance optimizations:
   * - Limits total rays to MAX_RAYS_PER_FRAME
   * - Pre-filters objects by distance from sensor (within maxRange)
   * - Limits raycast targets to MAX_RAYCAST_TARGETS nearest objects
   * - Uses non-recursive intersectObjects since we pre-collected meshes
   */
  private generatePointCloud(): void {
    if (!this.config.enabled || !this.config.showPointCloud) {
      // Clear point cloud if disabled
      this.pointCloudGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([], 3)
      );
      this.pointCloudGeometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute([], 3)
      );
      return;
    }

    const { channels, hFov, vFov, angularResH, minRange, maxRange } = this.config;
    
    const positions: number[] = [];
    const colors: number[] = [];

    // Get sensor world position and quaternion early for distance filtering
    const sensorWorldPosition = new THREE.Vector3();
    const sensorWorldQuaternion = new THREE.Quaternion();
    this.group.getWorldPosition(sensorWorldPosition);
    this.group.getWorldQuaternion(sensorWorldQuaternion);

    // Get scenario objects for raycasting
    const scenarioObjects = this.scene.getScenarioObjects();
    
    // Filter to only include Mesh objects within range for realistic LIDAR simulation
    // This excludes:
    // - GridHelper and AxesHelper (LineSegments) which would cause grid-pattern artifacts
    // - Sensor groups and point clouds
    // - Objects outside maxRange (optimization)
    const meshesWithDistance: Array<{ mesh: THREE.Mesh; distance: number }> = [];
    const meshWorldPos = new THREE.Vector3();
    
    for (const obj of scenarioObjects) {
      // Skip sensor groups
      if (obj.name && obj.name.startsWith('sensor-')) {
        continue;
      }
      // Skip point clouds
      if (obj.name && obj.name.startsWith('lidar-pointcloud-')) {
        continue;
      }
      
      // Recursively collect all Mesh objects from this object and its children
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Get mesh world position for distance check
          child.getWorldPosition(meshWorldPos);
          const distance = sensorWorldPosition.distanceTo(meshWorldPos);
          
          // Get mesh bounding radius for better distance estimate
          if (!child.geometry.boundingSphere) {
            child.geometry.computeBoundingSphere();
          }
          const boundingRadius = child.geometry.boundingSphere?.radius || 0;
          
          // Only include if potentially within range (add some margin for large objects)
          if (distance - boundingRadius <= maxRange * 1.5) {
            meshesWithDistance.push({ mesh: child, distance });
          }
        }
      });
    }

    if (meshesWithDistance.length === 0) {
      return;
    }

    // Sort by distance and limit to MAX_RAYCAST_TARGETS nearest meshes
    meshesWithDistance.sort((a, b) => a.distance - b.distance);
    const raycastTargets = meshesWithDistance
      .slice(0, LidarSensor.MAX_RAYCAST_TARGETS)
      .map(m => m.mesh);

    // Get the rosRoot (world root) for coordinate transformation
    // Hit points are in Three.js world space, but we need them in rosRoot local space
    // since the point cloud is added to rosRoot
    const worldRoot = this.scene.getCoordinateSystem().getWorldRoot();

    // Get point cloud color (use pointCloudColor if set, otherwise default to sensor color)
    const pointCloudColorHex = this.config.pointCloudColor || this.config.color;
    const pointCloudColor = new THREE.Color(pointCloudColorHex);

    // Calculate effective angular resolution to stay within ray budget
    const baseRayCount = channels * (hFov / angularResH);
    let effectiveAngularResH = angularResH;
    if (baseRayCount > LidarSensor.MAX_RAYS_PER_FRAME) {
      // Increase angular resolution to reduce ray count
      effectiveAngularResH = (channels * hFov) / LidarSensor.MAX_RAYS_PER_FRAME;
    }

    // Horizontal FOV range
    const hFovMin = -hFov / 2;
    const hFovMax = hFov / 2;

    // Reusable vectors to reduce allocations
    const localDirection = new THREE.Vector3();
    const worldDirection = new THREE.Vector3();

    // Iterate through channels (vertical angles)
    for (let ch = 0; ch < channels; ch++) {
      // Calculate vertical angle for this channel
      // For single-channel LIDARs (2D), scan at horizontal (vAngle = 0)
      // For multi-channel LIDARs (3D), distribute channels evenly from -vFov/2 to +vFov/2
      let vAngle: number;
      if (channels === 1) {
        vAngle = 0; // 2D LIDAR scans horizontally
      } else {
        const vFovMin = -vFov / 2;
        const vAngleStep = vFov / (channels - 1);
        vAngle = vFovMin + ch * vAngleStep;
      }
      const vRad = THREE.MathUtils.degToRad(vAngle);
      const cosV = Math.cos(vRad);
      const sinV = Math.sin(vRad);

      // Iterate through horizontal angles
      for (let hAngle = hFovMin; hAngle < hFovMax; hAngle += effectiveAngularResH) {
        const hRad = THREE.MathUtils.degToRad(hAngle);
        const cosH = Math.cos(hRad);
        const sinH = Math.sin(hRad);

        // Direction in sensor-local space (ROS convention: +X forward, +Y left, +Z up)
        // For a ray at (vAngle, hAngle):
        // - x = cos(vAngle) * cos(hAngle)  (forward component)
        // - y = cos(vAngle) * sin(hAngle)  (left component)
        // - z = sin(vAngle)                 (up component)
        localDirection.set(cosV * cosH, cosV * sinH, sinV);

        // Transform direction to world space
        worldDirection.copy(localDirection);
        worldDirection.applyQuaternion(sensorWorldQuaternion);
        worldDirection.normalize();

        // Setup raycaster
        this.raycaster.set(sensorWorldPosition, worldDirection);
        this.raycaster.near = minRange;
        this.raycaster.far = maxRange;

        // Raycast against scenario objects (non-recursive since we pre-collected meshes)
        const intersects = this.raycaster.intersectObjects(raycastTargets, false);

        if (intersects.length > 0) {
          const hit = intersects[0];
          
          // Transform hit point from Three.js world space to rosRoot local space
          // This is needed because the point cloud is a child of rosRoot
          const localPoint = hit.point.clone();
          worldRoot.worldToLocal(localPoint);
          
          // Add point position (in rosRoot local coordinates)
          positions.push(localPoint.x, localPoint.y, localPoint.z);

          // Use solid color for all points
          colors.push(pointCloudColor.r, pointCloudColor.g, pointCloudColor.b);
        }
      }
    }

    // Update geometry buffers
    this.pointCloudGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.pointCloudGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );

    // Update bounding sphere for frustum culling
    this.pointCloudGeometry.computeBoundingSphere();
  }

  /**
   * Create geometry for 360° scanning LIDAR (e.g., Velodyne VLP-16).
   * 
   * Creates a conical shell representing the scan volume:
   * - Inner surface at minRange
   * - Outer surface at maxRange
   * - Vertical extent based on vFov
   * 
   * The LIDAR is assumed to rotate around its local Z axis (up in ROS convention),
   * with the scan plane tilted based on vFov.
   */
  private createFullRotationGeometry(): THREE.BufferGeometry {
    const { vFov, minRange, maxRange } = this.config;
    const hSegments = LidarSensor.H_SEGMENTS;
    const vSegments = LidarSensor.V_SEGMENTS;

    // Vertical FOV angles (symmetric around horizontal)
    const vFovHalfRad = THREE.MathUtils.degToRad(vFov / 2);
    
    const vertices: number[] = [];
    const indices: number[] = [];

    // Generate vertices for inner and outer surfaces
    // For each horizontal angle, create a vertical slice at both ranges
    for (let h = 0; h <= hSegments; h++) {
      const hAngle = (h / hSegments) * Math.PI * 2;
      const cosH = Math.cos(hAngle);
      const sinH = Math.sin(hAngle);

      for (let v = 0; v <= vSegments; v++) {
        const vAngle = -vFovHalfRad + (v / vSegments) * (2 * vFovHalfRad);
        const cosV = Math.cos(vAngle);
        const sinV = Math.sin(vAngle);

        // Inner surface vertex (at minRange)
        // Direction in local frame: cosV points outward, sinV points up/down
        const innerX = minRange * cosV * cosH;
        const innerY = minRange * cosV * sinH;
        const innerZ = minRange * sinV;
        vertices.push(innerX, innerY, innerZ);

        // Outer surface vertex (at maxRange)
        const outerX = maxRange * cosV * cosH;
        const outerY = maxRange * cosV * sinH;
        const outerZ = maxRange * sinV;
        vertices.push(outerX, outerY, outerZ);
      }
    }

    // Generate indices for faces
    // Each cell in the grid creates quads on inner surface, outer surface, and end caps
    const verticesPerSlice = (vSegments + 1) * 2;

    for (let h = 0; h < hSegments; h++) {
      for (let v = 0; v < vSegments; v++) {
        const current = h * verticesPerSlice + v * 2;
        const next = (h + 1) * verticesPerSlice + v * 2;

        // Inner surface (inner vertices are at even indices: 0, 2, 4, ...)
        const i0 = current;
        const i1 = next;
        const i2 = next + 2;
        const i3 = current + 2;
        indices.push(i0, i2, i1); // Triangle 1
        indices.push(i0, i3, i2); // Triangle 2

        // Outer surface (outer vertices are at odd indices: 1, 3, 5, ...)
        const o0 = current + 1;
        const o1 = next + 1;
        const o2 = next + 3;
        const o3 = current + 3;
        indices.push(o0, o1, o2); // Triangle 1
        indices.push(o0, o2, o3); // Triangle 2
      }

      // End caps (connect inner to outer at top and bottom of vFov)
      // Bottom cap (v = 0)
      const b0 = h * verticesPerSlice;
      const b1 = (h + 1) * verticesPerSlice;
      const b2 = b1 + 1;
      const b3 = b0 + 1;
      indices.push(b0, b1, b2);
      indices.push(b0, b2, b3);

      // Top cap (v = vSegments)
      const t0 = h * verticesPerSlice + vSegments * 2;
      const t1 = (h + 1) * verticesPerSlice + vSegments * 2;
      const t2 = t1 + 1;
      const t3 = t0 + 1;
      indices.push(t0, t2, t1);
      indices.push(t0, t3, t2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Create geometry for sector-scanning LIDAR (e.g., Livox Mid-40).
   * 
   * Creates a cone sector (wedge) representing the directional scan volume.
   * The cone points along +X axis (forward in ROS convention).
   */
  private createSectorGeometry(): THREE.BufferGeometry {
    const { hFov, vFov, minRange, maxRange } = this.config;
    const hSegments = Math.max(8, Math.floor(LidarSensor.H_SEGMENTS * (hFov / 360)));
    const vSegments = LidarSensor.V_SEGMENTS;

    const hFovHalfRad = THREE.MathUtils.degToRad(hFov / 2);
    const vFovHalfRad = THREE.MathUtils.degToRad(vFov / 2);

    const vertices: number[] = [];
    const indices: number[] = [];

    // Generate vertices for the frustum sector
    // The sector points along +X, with horizontal spread along Y and vertical along Z
    for (let h = 0; h <= hSegments; h++) {
      // Horizontal angle from -hFov/2 to +hFov/2
      const hAngle = -hFovHalfRad + (h / hSegments) * (2 * hFovHalfRad);

      for (let v = 0; v <= vSegments; v++) {
        // Vertical angle from -vFov/2 to +vFov/2
        const vAngle = -vFovHalfRad + (v / vSegments) * (2 * vFovHalfRad);

        // Direction in local frame (pointing along +X with angular offsets)
        const cosV = Math.cos(vAngle);
        const sinV = Math.sin(vAngle);
        const cosH = Math.cos(hAngle);
        const sinH = Math.sin(hAngle);

        // Near plane vertex
        // x = range * cos(vAngle) (forward component)
        // y = range * cos(vAngle) * sin(hAngle) (left/right)
        // z = range * sin(vAngle) (up/down)
        const nearX = minRange * cosV * cosH;
        const nearY = minRange * cosV * sinH;
        const nearZ = minRange * sinV;
        vertices.push(nearX, nearY, nearZ);

        // Far plane vertex
        const farX = maxRange * cosV * cosH;
        const farY = maxRange * cosV * sinH;
        const farZ = maxRange * sinV;
        vertices.push(farX, farY, farZ);
      }
    }

    // Generate indices
    const verticesPerSlice = (vSegments + 1) * 2;

    for (let h = 0; h < hSegments; h++) {
      for (let v = 0; v < vSegments; v++) {
        const current = h * verticesPerSlice + v * 2;
        const next = (h + 1) * verticesPerSlice + v * 2;

        // Near surface
        const n0 = current;
        const n1 = next;
        const n2 = next + 2;
        const n3 = current + 2;
        indices.push(n0, n2, n1);
        indices.push(n0, n3, n2);

        // Far surface
        const f0 = current + 1;
        const f1 = next + 1;
        const f2 = next + 3;
        const f3 = current + 3;
        indices.push(f0, f1, f2);
        indices.push(f0, f2, f3);
      }

      // Top and bottom caps (connecting near to far at vFov boundaries)
      const b0 = h * verticesPerSlice;
      const b1 = (h + 1) * verticesPerSlice;
      const b2 = b1 + 1;
      const b3 = b0 + 1;
      indices.push(b0, b1, b2);
      indices.push(b0, b2, b3);

      const t0 = h * verticesPerSlice + vSegments * 2;
      const t1 = (h + 1) * verticesPerSlice + vSegments * 2;
      const t2 = t1 + 1;
      const t3 = t0 + 1;
      indices.push(t0, t2, t1);
      indices.push(t0, t3, t2);
    }

    // Side caps (left and right edges of the sector)
    // Left side (h = 0)
    for (let v = 0; v < vSegments; v++) {
      const l0 = v * 2;
      const l1 = v * 2 + 1;
      const l2 = (v + 1) * 2 + 1;
      const l3 = (v + 1) * 2;
      indices.push(l0, l2, l1);
      indices.push(l0, l3, l2);
    }

    // Right side (h = hSegments)
    for (let v = 0; v < vSegments; v++) {
      const r0 = hSegments * verticesPerSlice + v * 2;
      const r1 = hSegments * verticesPerSlice + v * 2 + 1;
      const r2 = hSegments * verticesPerSlice + (v + 1) * 2 + 1;
      const r3 = hSegments * verticesPerSlice + (v + 1) * 2;
      indices.push(r0, r1, r2);
      indices.push(r0, r2, r3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Update the visualization when configuration changes.
   * This is called when pose or config changes.
   */
  updateVisualization(): void {
    const color = new THREE.Color(this.config.color);
    const showVolume = this.config.showVolume ?? true;
    
    // Recreate the volume geometry if FOV or range changed
    if (this.volumeMesh && this.volumeEdges) {
      // Dispose old geometries
      this.volumeMesh.geometry.dispose();
      this.volumeEdges.geometry.dispose();

      // Create new geometry
      const newGeometry = this.config.hFov >= 360
        ? this.createFullRotationGeometry()
        : this.createSectorGeometry();
      
      this.volumeMesh.geometry = newGeometry;
      this.volumeEdges.geometry = new THREE.EdgesGeometry(newGeometry, 30);

      // Update color
      (this.volumeMesh.material as THREE.MeshBasicMaterial).color = color;
      (this.volumeEdges.material as THREE.LineBasicMaterial).color = color;
      if (this.sensorMarker) {
        (this.sensorMarker.material as THREE.MeshBasicMaterial).color = color;
      }

      // Update volume visibility
      this.volumeMesh.visible = showVolume;
      this.volumeEdges.visible = showVolume;
    }

    // Update slice visualization
    if (this.sliceMesh && this.sliceEdges) {
      // Update visibility (slice is only visible if both showSlice and showVolume are true)
      const showSlice = (this.config.showSlice ?? false) && showVolume;
      this.sliceMesh.visible = showSlice;
      this.sliceEdges.visible = showSlice;

      // Recreate geometry if FOV or range changed
      this.sliceMesh.geometry.dispose();
      this.sliceEdges.geometry.dispose();
      
      const sliceGeometry = this.createSliceGeometry();
      this.sliceMesh.geometry = sliceGeometry;
      this.sliceEdges.geometry = new THREE.EdgesGeometry(sliceGeometry);

      // Update color (darker for slice)
      const darkerColor = color.clone().multiplyScalar(0.7);
      (this.sliceMesh.material as THREE.MeshBasicMaterial).color = darkerColor;
      (this.sliceEdges.material as THREE.LineBasicMaterial).color = darkerColor;
    }

    // Update point cloud visibility
    if (this.pointCloud) {
      this.pointCloud.visible = this.config.enabled && (this.config.showPointCloud ?? true);
    }
    
    // Regenerate point cloud (throttled to avoid performance issues)
    // Note: throttledGeneratePointCloud may not exist during base class construction
    if (this.throttledGeneratePointCloud) {
      this.throttledGeneratePointCloud();
    }
  }

  /**
   * Force recomputation of the point cloud.
   * Call this when the scenario changes.
   */
  recomputePointCloud(): void {
    this.generatePointCloud();
  }

  /**
   * Set the point size for the point cloud visualization.
   * @param size The point size in pixels
   */
  setPointSize(size: number): void {
    if (this.pointCloud) {
      (this.pointCloud.material as THREE.PointsMaterial).size = size;
    }
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    // Dispose LIDAR-specific resources
    if (this.volumeMesh) {
      this.volumeMesh.geometry.dispose();
      (this.volumeMesh.material as THREE.Material).dispose();
    }
    if (this.volumeEdges) {
      this.volumeEdges.geometry.dispose();
      (this.volumeEdges.material as THREE.Material).dispose();
    }
    if (this.sensorMarker) {
      this.sensorMarker.geometry.dispose();
      (this.sensorMarker.material as THREE.Material).dispose();
    }
    if (this.sliceMesh) {
      this.sliceMesh.geometry.dispose();
      (this.sliceMesh.material as THREE.Material).dispose();
    }
    if (this.sliceEdges) {
      this.sliceEdges.geometry.dispose();
      (this.sliceEdges.material as THREE.Material).dispose();
    }

    // Dispose point cloud (remove from world and clean up)
    if (this.pointCloud) {
      this.scene.removeFromWorld(this.pointCloud);
      this.pointCloudGeometry.dispose();
      (this.pointCloud.material as THREE.Material).dispose();
    }

    // Call parent dispose
    super.dispose();
  }
}
