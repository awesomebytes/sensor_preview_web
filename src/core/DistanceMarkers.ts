import * as THREE from 'three';
import { SENSOR_VIS_LAYER } from '../sensors/BaseSensor';

/**
 * Configuration for distance markers.
 */
export interface DistanceMarkersConfig {
  /** Size of the floor area (width and height in meters) */
  size: number;
  /** Color of the text labels */
  textColor: string;
}

/**
 * Axis colors following RGB = XYZ convention.
 */
const AXIS_COLORS = {
  x: 0xff4444, // Red - forward/backward
  y: 0x44ff44, // Green - left/right
  z: 0x4444ff, // Blue - up
};

/**
 * Creates distance markers along the principal axes from the origin.
 * Markers go along:
 * - X axis (red): forward (+X) and backward (-X)
 * - Y axis (green): left (+Y) and right (-Y)
 * - Z axis (blue): up (+Z)
 * 
 * Adapts marker spacing based on the scenario size.
 */
export class DistanceMarkers {
  private group: THREE.Group;
  private config: DistanceMarkersConfig;

  constructor(config: DistanceMarkersConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = 'distance-markers';
    this.createMarkers();
  }

  /**
   * Get the spacing intervals for the given size.
   * Returns an array of { from, spacing } pairs sorted by distance ascending.
   */
  private getSpacingIntervals(size: number): Array<{ from: number; spacing: number }> {
    if (size <= 10) {
      return [{ from: 0, spacing: 1 }];
    } else if (size <= 20) {
      return [
        { from: 0, spacing: 1 },
        { from: 10, spacing: 5 },
      ];
    } else if (size <= 100) {
      return [
        { from: 0, spacing: 1 },
        { from: 10, spacing: 5 },
        { from: 50, spacing: 10 },
      ];
    } else if (size <= 500) {
      return [
        { from: 0, spacing: 1 },
        { from: 10, spacing: 5 },
        { from: 50, spacing: 10 },
        { from: 100, spacing: 50 },
        { from: 300, spacing: 100 },
      ];
    } else {
      // 1km+
      return [
        { from: 0, spacing: 1 },
        { from: 10, spacing: 5 },
        { from: 50, spacing: 10 },
        { from: 100, spacing: 50 },
        { from: 300, spacing: 100 },
        { from: 500, spacing: 200 },
      ];
    }
  }

  /**
   * Get the spacing for a given distance from origin.
   */
  private getSpacingAt(distance: number, intervals: Array<{ from: number; spacing: number }>): number {
    for (let i = intervals.length - 1; i >= 0; i--) {
      if (distance >= intervals[i].from) {
        return intervals[i].spacing;
      }
    }
    return intervals[0].spacing;
  }

  /**
   * Generate positions for tick marks based on adaptive spacing.
   */
  private generateTickPositions(maxDistance: number): number[] {
    const intervals = this.getSpacingIntervals(this.config.size);
    const positions: number[] = [];
    
    let distance = 0;
    while (distance < maxDistance) {
      const spacing = this.getSpacingAt(distance, intervals);
      distance += spacing;
      if (distance <= maxDistance) {
        positions.push(distance);
      }
    }
    
    return positions;
  }

  /**
   * Create all markers.
   */
  private createMarkers(): void {
    const { size, textColor } = this.config;
    const halfSize = size / 2;
    
    // Generate tick positions
    const positions = this.generateTickPositions(halfSize);
    
    // Tick mark size (perpendicular to axis)
    const tickSize = Math.max(0.1, size / 100);
    
    // Create axis rulers
    this.createAxisRuler('x', positions, halfSize, tickSize, AXIS_COLORS.x, textColor);
    this.createAxisRuler('y', positions, halfSize, tickSize, AXIS_COLORS.y, textColor);
    this.createAxisRuler('z', positions, halfSize, tickSize, AXIS_COLORS.z, textColor, true); // Z only goes up
  }

  /**
   * Create a ruler along an axis with tick marks and labels.
   */
  private createAxisRuler(
    axis: 'x' | 'y' | 'z',
    positions: number[],
    maxDistance: number,
    tickSize: number,
    axisColor: number,
    textColor: string,
    positiveOnly: boolean = false
  ): void {
    // Create main axis line
    const lineMaterial = new THREE.LineBasicMaterial({
      color: axisColor,
      transparent: true,
      opacity: 0.8,
    });

    // Determine start and end based on axis
    let start: THREE.Vector3;
    let end: THREE.Vector3;
    
    if (axis === 'x') {
      start = new THREE.Vector3(positiveOnly ? 0 : -maxDistance, 0, 0.01);
      end = new THREE.Vector3(maxDistance, 0, 0.01);
    } else if (axis === 'y') {
      start = new THREE.Vector3(0, positiveOnly ? 0 : -maxDistance, 0.01);
      end = new THREE.Vector3(0, maxDistance, 0.01);
    } else {
      start = new THREE.Vector3(0, 0, positiveOnly ? 0 : 0);
      end = new THREE.Vector3(0, 0, maxDistance);
    }

    // Main axis line
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const axisLine = new THREE.Line(axisGeometry, lineMaterial);
    axisLine.layers.set(SENSOR_VIS_LAYER); // Only visible on sensor vis layer
    this.group.add(axisLine);

    // Create tick marks and labels
    const tickMaterial = new THREE.LineBasicMaterial({
      color: axisColor,
      transparent: true,
      opacity: 0.6,
    });

    // Determine label skip factor based on density
    const skipFactor = positions.length > 20 ? 5 : positions.length > 10 ? 2 : 1;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      
      // Positive direction
      this.createTickMark(axis, pos, tickSize, tickMaterial);
      
      // Label (skip some for dense markers)
      if (i % skipFactor === 0 || i === positions.length - 1) {
        this.createTickLabel(axis, pos, textColor, axisColor);
      }
      
      // Negative direction (except for Z which only goes up)
      if (!positiveOnly) {
        this.createTickMark(axis, -pos, tickSize, tickMaterial);
        if (i % skipFactor === 0 || i === positions.length - 1) {
          this.createTickLabel(axis, -pos, textColor, axisColor);
        }
      }
    }
  }

  /**
   * Create a tick mark perpendicular to the axis.
   */
  private createTickMark(axis: 'x' | 'y' | 'z', position: number, size: number, material: THREE.LineBasicMaterial): void {
    let p1: THREE.Vector3;
    let p2: THREE.Vector3;
    
    if (axis === 'x') {
      // Tick perpendicular to X (along Y)
      p1 = new THREE.Vector3(position, -size, 0.01);
      p2 = new THREE.Vector3(position, size, 0.01);
    } else if (axis === 'y') {
      // Tick perpendicular to Y (along X)
      p1 = new THREE.Vector3(-size, position, 0.01);
      p2 = new THREE.Vector3(size, position, 0.01);
    } else {
      // Tick perpendicular to Z (along X and Y - make a cross)
      const geometry1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-size, 0, position),
        new THREE.Vector3(size, 0, position),
      ]);
      const line1 = new THREE.Line(geometry1, material);
      line1.layers.set(SENSOR_VIS_LAYER);
      this.group.add(line1);
      
      p1 = new THREE.Vector3(0, -size, position);
      p2 = new THREE.Vector3(0, size, position);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const line = new THREE.Line(geometry, material);
    line.layers.set(SENSOR_VIS_LAYER);
    this.group.add(line);
  }

  /**
   * Create a label for a tick mark.
   */
  private createTickLabel(axis: 'x' | 'y' | 'z', position: number, textColor: string, axisColor: number): void {
    const label = this.formatDistance(Math.abs(position));
    const axisColorHex = '#' + axisColor.toString(16).padStart(6, '0');
    
    // Position offset for label
    const offset = Math.max(0.3, this.config.size / 50);
    
    let x = 0, y = 0, z = 0;
    
    if (axis === 'x') {
      x = position;
      y = -offset * 2;
      z = 0.1;
    } else if (axis === 'y') {
      x = -offset * 2;
      y = position;
      z = 0.1;
    } else {
      x = offset * 1.5;
      y = offset * 1.5;
      z = position;
    }
    
    this.createTextSprite(label, x, y, z, textColor, axisColorHex);
  }

  /**
   * Format distance for display.
   */
  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)}km`;
    }
    return `${meters}m`;
  }

  /**
   * Create a text sprite at the given position.
   */
  private createTextSprite(text: string, x: number, y: number, z: number, textColor: string, bgColor?: string): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Determine font size based on scenario size
    const fontSize = Math.max(20, Math.min(36, this.config.size / 15));
    
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    const metrics = context.measureText(text);
    
    const padding = 4;
    canvas.width = metrics.width + padding * 2;
    canvas.height = fontSize + padding * 2;
    
    // Background with axis color tint
    if (bgColor) {
      context.fillStyle = bgColor;
      context.globalAlpha = 0.15;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = 1;
    }
    
    // Text
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.layers.set(SENSOR_VIS_LAYER);
    
    // Scale based on scenario size
    const scale = Math.max(0.3, this.config.size / 80);
    sprite.scale.set((canvas.width / 50) * scale, (canvas.height / 50) * scale, 1);
    sprite.position.set(x, y, z);

    this.group.add(sprite);
  }

  /**
   * Get the Three.js group containing all markers.
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Line) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
      if (object instanceof THREE.Sprite) {
        (object.material as THREE.SpriteMaterial).map?.dispose();
        (object.material as THREE.SpriteMaterial).dispose();
      }
    });
    this.group.clear();
  }
}

/**
 * Get the floor size for a scenario type.
 */
export function getScenarioFloorSize(scenario: string): number {
  switch (scenario) {
    case 'household-small':
      return 10;
    case 'household-large':
      return 20;
    case 'city':
      return 500;
    case 'highway':
      return 1000;
    default:
      return 20;
  }
}
