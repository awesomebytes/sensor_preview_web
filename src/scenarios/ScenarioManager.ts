import * as THREE from 'three';
import type { ScenarioType } from '../types/state';
import { createHouseholdScenario, getScenarioMeshes } from './HouseholdScenario';

/**
 * Manages scenario loading and provides access to scenario objects.
 * Scenarios are geometric environments that sensors can observe.
 */
export class ScenarioManager {
  private currentScenario: THREE.Group | null = null;
  private currentType: ScenarioType | null = null;
  private scenarioMeshes: THREE.Mesh[] = [];
  private addToWorld: (object: THREE.Object3D) => void;
  private removeFromWorld: (object: THREE.Object3D) => void;

  constructor(
    addToWorld: (object: THREE.Object3D) => void,
    removeFromWorld: (object: THREE.Object3D) => void
  ) {
    this.addToWorld = addToWorld;
    this.removeFromWorld = removeFromWorld;
  }

  /**
   * Load a scenario by type.
   * @param type The scenario type to load
   */
  loadScenario(type: ScenarioType): void {
    // Remove current scenario if one exists
    if (this.currentScenario) {
      this.unloadScenario();
    }

    // Create the new scenario
    let scenario: THREE.Group;

    switch (type) {
      case 'household':
        scenario = createHouseholdScenario();
        break;
      case 'city':
        // Placeholder for future implementation
        console.warn('City scenario not yet implemented, loading household instead');
        scenario = createHouseholdScenario();
        break;
      case 'warehouse':
        // Placeholder for future implementation
        console.warn('Warehouse scenario not yet implemented, loading household instead');
        scenario = createHouseholdScenario();
        break;
      default:
        console.error(`Unknown scenario type: ${type}`);
        scenario = createHouseholdScenario();
    }

    this.currentScenario = scenario;
    this.currentType = type;
    this.scenarioMeshes = getScenarioMeshes(scenario);

    // Add scenario to the world
    this.addToWorld(scenario);

    console.log(`Loaded scenario: ${type}`, {
      meshCount: this.scenarioMeshes.length,
    });
  }

  /**
   * Unload the current scenario.
   */
  unloadScenario(): void {
    if (this.currentScenario) {
      // Remove from world
      this.removeFromWorld(this.currentScenario);

      // Dispose of all geometries and materials
      this.currentScenario.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      this.currentScenario = null;
      this.currentType = null;
      this.scenarioMeshes = [];

      console.log('Unloaded scenario');
    }
  }

  /**
   * Get the current scenario type.
   */
  getCurrentType(): ScenarioType | null {
    return this.currentType;
  }

  /**
   * Get all meshes in the current scenario for raycasting.
   * @returns Array of meshes that can be intersected by rays
   */
  getScenarioMeshes(): THREE.Mesh[] {
    return this.scenarioMeshes;
  }

  /**
   * Get all objects in the current scenario.
   * @returns Array of all objects for raycasting (includes groups)
   */
  getScenarioObjects(): THREE.Object3D[] {
    if (!this.currentScenario) {
      return [];
    }

    const objects: THREE.Object3D[] = [];
    this.currentScenario.traverse((object) => {
      objects.push(object);
    });

    return objects;
  }

  /**
   * Get the scenario group.
   */
  getScenarioGroup(): THREE.Group | null {
    return this.currentScenario;
  }

  /**
   * Check if a scenario is currently loaded.
   */
  hasScenario(): boolean {
    return this.currentScenario !== null;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.unloadScenario();
  }
}
