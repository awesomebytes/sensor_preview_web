import * as THREE from 'three';
import type { SensorConfig, Vector3, EulerAngles } from '../types/sensors';
import type { Scene } from '../core/Scene';

/**
 * Layer used for sensor visualizations (frustums, markers, etc.)
 * This allows preview cameras to optionally hide these visualizations.
 * Layer 0 is the default layer for scene objects.
 * Layer 1 is used for sensor visualizations.
 */
export const SENSOR_VIS_LAYER = 1;

/**
 * Abstract base class for all sensor types.
 * Handles common functionality like pose updates, visibility, and cleanup.
 */
export abstract class BaseSensor<T extends SensorConfig = SensorConfig> {
  protected config: T;
  protected scene: Scene;
  protected group: THREE.Group;
  
  // Axes and label visualization
  protected axesHelper: THREE.Group | null = null;
  protected labelSprite: THREE.Sprite | null = null;
  
  // Current settings
  protected currentAxesSize: number = 0.3;
  protected currentLabelSize: number = 1.0;

  constructor(config: T, scene: Scene) {
    this.config = config;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = `sensor-${config.id}`;

    // Add to scene
    this.scene.addToWorld(this.group);

    // Set initial pose
    this.updatePose(config.position, config.rotation);

    // Set initial visibility
    this.setEnabled(config.enabled);
  }

  /**
   * Create the 3D visualization for this sensor.
   * Must be implemented by subclasses.
   */
  abstract createVisualization(): void;

  /**
   * Update the visualization when config changes.
   * Must be implemented by subclasses.
   */
  abstract updateVisualization(): void;

  /**
   * Get the current sensor configuration.
   */
  getConfig(): T {
    return this.config;
  }

  /**
   * Update sensor configuration.
   */
  updateConfig(changes: Partial<T>): void {
    this.config = { ...this.config, ...changes };

    // Update pose if position or rotation changed
    if (changes.position || changes.rotation) {
      this.updatePose(this.config.position, this.config.rotation);
    }

    // Update visibility if enabled changed
    if (changes.enabled !== undefined) {
      this.setEnabled(changes.enabled);
    }

    // Update visualization for other config changes
    this.updateVisualization();
  }

  /**
   * Update the sensor's position and rotation.
   */
  updatePose(position: Vector3, rotation: EulerAngles): void {
    // Update position
    this.group.position.set(position.x, position.y, position.z);

    // Update rotation (convert degrees to radians)
    // Order: XYZ (roll, pitch, yaw)
    this.group.rotation.set(
      THREE.MathUtils.degToRad(rotation.roll),
      THREE.MathUtils.degToRad(rotation.pitch),
      THREE.MathUtils.degToRad(rotation.yaw),
      'XYZ'
    );

    // Update config
    this.config.position = position;
    this.config.rotation = rotation;

    // Trigger visualization update
    this.updateVisualization();
  }

  /**
   * Set whether the sensor is visible/enabled.
   */
  setEnabled(enabled: boolean): void {
    this.group.visible = enabled;
    this.config.enabled = enabled;
  }

  /**
   * Get the Three.js group containing the sensor visualization.
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Set an object to be ONLY on the sensor visualization layer.
   * This allows preview cameras to optionally hide these objects.
   * Objects are removed from layer 0 and placed only on SENSOR_VIS_LAYER.
   */
  protected setVisualizationLayer(object: THREE.Object3D): void {
    // Use set() to put ONLY on this layer (removes from layer 0)
    object.layers.set(SENSOR_VIS_LAYER);
  }

  /**
   * Create RGB axes at the sensor origin.
   * X = Red, Y = Green, Z = Blue
   * @param size Length of each axis in meters
   */
  protected createAxesHelper(size: number): THREE.Group {
    this.currentAxesSize = size;
    const axesGroup = new THREE.Group();
    axesGroup.name = 'sensor-axes';

    // Create line geometry for each axis
    const createAxis = (color: number, direction: THREE.Vector3): THREE.Line => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        direction.clone().multiplyScalar(size),
      ]);
      const material = new THREE.LineBasicMaterial({ 
        color, 
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      this.setVisualizationLayer(line);
      return line;
    };

    // X axis (Red) - forward in ROS
    const xAxis = createAxis(0xff0000, new THREE.Vector3(1, 0, 0));
    axesGroup.add(xAxis);

    // Y axis (Green) - left in ROS
    const yAxis = createAxis(0x00ff00, new THREE.Vector3(0, 1, 0));
    axesGroup.add(yAxis);

    // Z axis (Blue) - up in ROS
    const zAxis = createAxis(0x0000ff, new THREE.Vector3(0, 0, 1));
    axesGroup.add(zAxis);

    // Add small cone arrow heads
    const addArrowHead = (color: number, direction: THREE.Vector3): void => {
      const coneGeometry = new THREE.ConeGeometry(size * 0.08, size * 0.2, 8);
      const coneMaterial = new THREE.MeshBasicMaterial({ color });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      
      // Position at end of axis
      cone.position.copy(direction.clone().multiplyScalar(size));
      
      // Orient cone to point along axis
      cone.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), // Cone default points up
        direction.clone().normalize()
      );
      
      this.setVisualizationLayer(cone);
      axesGroup.add(cone);
    };

    addArrowHead(0xff0000, new THREE.Vector3(1, 0, 0));
    addArrowHead(0x00ff00, new THREE.Vector3(0, 1, 0));
    addArrowHead(0x0000ff, new THREE.Vector3(0, 0, 1));

    return axesGroup;
  }

  /**
   * Update the axes size.
   */
  updateAxesSize(size: number): void {
    if (this.axesHelper && this.currentAxesSize !== size) {
      // Remove old axes
      this.group.remove(this.axesHelper);
      this.disposeAxes();
      
      // Create new axes with new size
      this.axesHelper = this.createAxesHelper(size);
      this.group.add(this.axesHelper);
    }
  }

  /**
   * Create a text label sprite for the sensor name.
   * @param text The text to display
   * @param scale Scale factor for the label (1.0 = default)
   */
  protected createLabelSprite(text: string, scale: number = 1.0): THREE.Sprite {
    this.currentLabelSize = scale;
    
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // High resolution for crisp text
    const fontSize = 48;
    const padding = 10;
    
    // Set font to measure text
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    const metrics = context.measureText(text);
    
    // Size canvas to fit text
    canvas.width = metrics.width + padding * 2;
    canvas.height = fontSize + padding * 2;
    
    // Fill background (semi-transparent dark)
    context.fillStyle = 'rgba(30, 30, 50, 0.85)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    
    // Draw text
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    
    // Scale sprite to appropriate size in world units
    // Base size: 1 meter for 100px canvas width
    const baseScale = 0.5 * scale;
    sprite.scale.set(
      (canvas.width / 100) * baseScale,
      (canvas.height / 100) * baseScale,
      1
    );
    
    // Position above the sensor origin
    sprite.position.set(0, 0, this.currentAxesSize + 0.15 * scale);
    
    this.setVisualizationLayer(sprite);
    
    return sprite;
  }

  /**
   * Update the label text and/or size.
   */
  updateLabel(text?: string, scale?: number): void {
    const newText = text ?? this.config.name;
    const newScale = scale ?? this.currentLabelSize;
    
    if (this.labelSprite) {
      // Remove old sprite
      this.group.remove(this.labelSprite);
      (this.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.labelSprite.material as THREE.SpriteMaterial).dispose();
    }
    
    // Create new sprite
    this.labelSprite = this.createLabelSprite(newText, newScale);
    this.group.add(this.labelSprite);
  }

  /**
   * Update label size only.
   */
  updateLabelSize(scale: number): void {
    if (this.currentLabelSize !== scale) {
      this.updateLabel(undefined, scale);
    }
  }

  /**
   * Dispose of axes resources.
   */
  private disposeAxes(): void {
    if (this.axesHelper) {
      this.axesHelper.traverse((child) => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.axesHelper = null;
    }
  }

  /**
   * Dispose of label resources.
   */
  private disposeLabel(): void {
    if (this.labelSprite) {
      (this.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.labelSprite.material as THREE.SpriteMaterial).dispose();
      this.labelSprite = null;
    }
  }

  /**
   * Dispose of all resources used by this sensor.
   */
  dispose(): void {
    // Dispose axes and label
    this.disposeAxes();
    this.disposeLabel();
    // Remove from scene
    this.scene.removeFromWorld(this.group);

    // Traverse and dispose all geometries and materials
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
      if (object instanceof THREE.Line) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // Clear children
    this.group.clear();
  }
}
