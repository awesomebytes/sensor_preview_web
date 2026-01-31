import * as THREE from 'three';

/**
 * Creates a geometric city scenario using Three.js primitives.
 * All dimensions are in meters, positioned for ROS coordinate system (Z-up).
 *
 * Layout: ~500m × 500m city block area with:
 * - Grid of streets (4 blocks × 4 blocks)
 * - Various buildings (residential, commercial, office towers)
 * - Trees along sidewalks
 * - Parked cars and vehicles
 * - Street lights and traffic signs
 */

// Color palette
const COLORS = {
  asphalt: 0x333333,
  sidewalk: 0x999999,
  laneMarking: 0xffffff,
  building1: 0xc4b8a8,   // Beige
  building2: 0x8b8b8b,   // Gray
  building3: 0xa0522d,   // Brown brick
  building4: 0x4682b4,   // Steel blue (glass)
  window: 0x87ceeb,      // Light blue
  roof: 0x4a4a4a,
  tree: 0x228b22,
  treeTrunk: 0x8b4513,
  car1: 0xff0000,
  car2: 0x0000ff,
  car3: 0xffffff,
  car4: 0x000000,
  car5: 0xffff00,
  streetLight: 0x808080,
  lightBulb: 0xffffcc,
};

// City dimensions
const BLOCK_SIZE = 100;  // 100m per block
const STREET_WIDTH = 12; // 12m wide streets
const SIDEWALK_WIDTH = 3;
const NUM_BLOCKS = 5;    // 5×5 grid = ~500m total

/**
 * Create the ground plane (asphalt base).
 */
function createGround(): THREE.Mesh {
  const size = NUM_BLOCKS * BLOCK_SIZE + (NUM_BLOCKS + 1) * STREET_WIDTH;
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.asphalt,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.name = 'ground';
  ground.receiveShadow = true;
  return ground;
}

/**
 * Create a sidewalk block.
 */
function createSidewalk(width: number, length: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, length, 0.15);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.sidewalk,
    roughness: 0.8,
  });
  const sidewalk = new THREE.Mesh(geometry, material);
  sidewalk.position.z = 0.075;
  sidewalk.receiveShadow = true;
  return sidewalk;
}

/**
 * Create lane markings for a street segment.
 */
function createLaneMarkings(length: number, isHorizontal: boolean): THREE.Group {
  const markings = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: COLORS.laneMarking });
  
  // Center dashed line
  const dashLength = 3;
  const dashGap = 3;
  const numDashes = Math.floor(length / (dashLength + dashGap));
  
  for (let i = 0; i < numDashes; i++) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(isHorizontal ? dashLength : 0.15, isHorizontal ? 0.15 : dashLength, 0.02),
      material
    );
    const offset = -length / 2 + (i + 0.5) * (dashLength + dashGap);
    dash.position.set(isHorizontal ? offset : 0, isHorizontal ? 0 : offset, 0.01);
    markings.add(dash);
  }
  
  return markings;
}

/**
 * Create a building with windows.
 */
function createBuilding(width: number, depth: number, height: number, colorIndex: number): THREE.Group {
  const building = new THREE.Group();
  building.name = 'building';

  const colors = [COLORS.building1, COLORS.building2, COLORS.building3, COLORS.building4];
  const color = colors[colorIndex % colors.length];

  // Main structure
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, depth, height),
    bodyMaterial
  );
  body.position.z = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  building.add(body);

  // Add windows
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.window,
    roughness: 0.1,
    metalness: 0.3,
    emissive: 0x222244,
    emissiveIntensity: 0.1,
  });

  const windowWidth = 1.5;
  const windowHeight = 2;
  const floorHeight = 3.5;
  const numFloors = Math.floor(height / floorHeight);
  const windowsPerSideX = Math.floor((width - 2) / 3);
  const windowsPerSideY = Math.floor((depth - 2) / 3);

  // Windows on front and back (Y faces)
  for (let floor = 0; floor < numFloors; floor++) {
    for (let w = 0; w < windowsPerSideX; w++) {
      const windowZ = (floor + 0.5) * floorHeight + 0.5;
      const windowX = -width / 2 + 1.5 + w * 3;
      
      // Front
      const windowFront = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, 0.1, windowHeight),
        windowMaterial
      );
      windowFront.position.set(windowX, depth / 2 + 0.05, windowZ);
      building.add(windowFront);
      
      // Back
      const windowBack = new THREE.Mesh(
        new THREE.BoxGeometry(windowWidth, 0.1, windowHeight),
        windowMaterial
      );
      windowBack.position.set(windowX, -depth / 2 - 0.05, windowZ);
      building.add(windowBack);
    }
  }

  // Windows on sides (X faces)
  for (let floor = 0; floor < numFloors; floor++) {
    for (let w = 0; w < windowsPerSideY; w++) {
      const windowZ = (floor + 0.5) * floorHeight + 0.5;
      const windowY = -depth / 2 + 1.5 + w * 3;
      
      // Left
      const windowLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, windowWidth, windowHeight),
        windowMaterial
      );
      windowLeft.position.set(-width / 2 - 0.05, windowY, windowZ);
      building.add(windowLeft);
      
      // Right
      const windowRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, windowWidth, windowHeight),
        windowMaterial
      );
      windowRight.position.set(width / 2 + 0.05, windowY, windowZ);
      building.add(windowRight);
    }
  }

  // Roof
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.roof,
    roughness: 0.9,
  });
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.5, depth + 0.5, 0.3),
    roofMaterial
  );
  roof.position.z = height + 0.15;
  roof.castShadow = true;
  building.add(roof);

  return building;
}

/**
 * Create a tree.
 */
function createTree(height: number = 6): THREE.Group {
  const tree = new THREE.Group();
  tree.name = 'tree';

  const trunkHeight = height * 0.4;
  const trunkRadius = 0.15;
  const canopyRadius = height * 0.35;

  // Trunk
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.treeTrunk,
    roughness: 0.9,
  });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8),
    trunkMaterial
  );
  trunk.rotation.x = Math.PI / 2;
  trunk.position.z = trunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // Canopy (sphere)
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.tree,
    roughness: 0.8,
  });
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(canopyRadius, 12, 10),
    canopyMaterial
  );
  canopy.position.z = trunkHeight + canopyRadius * 0.7;
  canopy.castShadow = true;
  tree.add(canopy);

  return tree;
}

/**
 * Create a simple car.
 */
function createCar(color: number): THREE.Group {
  const car = new THREE.Group();
  car.name = 'car';

  const carLength = 4.5;
  const carWidth = 1.8;
  const carHeight = 1.4;
  const cabinHeight = 0.8;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.6,
  });

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(carLength, carWidth, carHeight * 0.5),
    bodyMaterial
  );
  body.position.z = carHeight * 0.25 + 0.3;
  body.castShadow = true;
  car.add(body);

  // Cabin
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(carLength * 0.5, carWidth - 0.2, cabinHeight),
    bodyMaterial
  );
  cabin.position.set(-carLength * 0.1, 0, carHeight * 0.5 + cabinHeight / 2 + 0.1);
  cabin.castShadow = true;
  car.add(cabin);

  // Windows
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x333355,
    roughness: 0.1,
    metalness: 0.5,
  });
  const windowFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, carWidth - 0.4, cabinHeight * 0.8),
    windowMaterial
  );
  windowFront.position.set(carLength * 0.15, 0, carHeight * 0.5 + cabinHeight / 2 + 0.15);
  car.add(windowFront);

  // Wheels
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8,
  });
  const wheelRadius = 0.35;
  const wheelWidth = 0.2;
  const wheelPositions = [
    [carLength * 0.3, carWidth / 2 + 0.1],
    [carLength * 0.3, -carWidth / 2 - 0.1],
    [-carLength * 0.3, carWidth / 2 + 0.1],
    [-carLength * 0.3, -carWidth / 2 - 0.1],
  ];

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16),
      wheelMaterial
    );
    wheel.position.set(pos[0], pos[1], wheelRadius);
    wheel.rotation.x = Math.PI / 2;
    car.add(wheel);
  });

  return car;
}

/**
 * Create a street light.
 */
function createStreetLight(): THREE.Group {
  const light = new THREE.Group();
  light.name = 'streetlight';

  const poleMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.streetLight,
    roughness: 0.5,
    metalness: 0.7,
  });

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 5, 8),
    poleMaterial
  );
  pole.rotation.x = Math.PI / 2;
  pole.position.z = 2.5;
  pole.castShadow = true;
  light.add(pole);

  // Arm
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.5, 0.08),
    poleMaterial
  );
  arm.position.set(0, 0.75, 5);
  light.add(arm);

  // Light fixture
  const fixtureMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.lightBulb,
    emissive: COLORS.lightBulb,
    emissiveIntensity: 0.3,
  });
  const fixture = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.6, 0.15),
    fixtureMaterial
  );
  fixture.position.set(0, 1.5, 4.9);
  light.add(fixture);

  return light;
}

/**
 * Create a traffic sign.
 */
function createTrafficSign(text: string = 'STOP'): THREE.Group {
  const sign = new THREE.Group();
  sign.name = 'traffic_sign';

  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.5,
    metalness: 0.7,
  });

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8),
    poleMaterial
  );
  pole.rotation.x = Math.PI / 2;
  pole.position.z = 1.25;
  sign.add(pole);

  // Sign face
  const signColor = text === 'STOP' ? 0xff0000 : 0xffff00;
  const signMaterial = new THREE.MeshStandardMaterial({
    color: signColor,
    roughness: 0.5,
  });
  const signFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.6, 0.6),
    signMaterial
  );
  signFace.position.set(0, 0, 2.5);
  sign.add(signFace);

  return sign;
}

/**
 * Creates the complete city scenario.
 */
export function createCityScenario(): THREE.Group {
  const scenario = new THREE.Group();
  scenario.name = 'city_scenario';

  // Ground
  scenario.add(createGround());

  const totalSize = NUM_BLOCKS * BLOCK_SIZE + (NUM_BLOCKS + 1) * STREET_WIDTH;
  const halfSize = totalSize / 2;

  // Create city blocks with buildings
  const carColors = [COLORS.car1, COLORS.car2, COLORS.car3, COLORS.car4, COLORS.car5];
  let buildingIndex = 0;
  let carIndex = 0;

  for (let bx = 0; bx < NUM_BLOCKS; bx++) {
    for (let by = 0; by < NUM_BLOCKS; by++) {
      // Block center position
      const blockCenterX = -halfSize + STREET_WIDTH + BLOCK_SIZE / 2 + bx * (BLOCK_SIZE + STREET_WIDTH);
      const blockCenterY = -halfSize + STREET_WIDTH + BLOCK_SIZE / 2 + by * (BLOCK_SIZE + STREET_WIDTH);

      // Create sidewalk around block
      const sidewalk = createSidewalk(BLOCK_SIZE + SIDEWALK_WIDTH * 2, BLOCK_SIZE + SIDEWALK_WIDTH * 2);
      sidewalk.position.set(blockCenterX, blockCenterY, 0);
      scenario.add(sidewalk);

      // Add buildings to block (2-4 buildings per block)
      const numBuildings = 2 + (bx + by) % 3;
      const buildingArea = BLOCK_SIZE - SIDEWALK_WIDTH * 2 - 4; // Leave margin

      for (let i = 0; i < numBuildings; i++) {
        const buildingWidth = 15 + (buildingIndex % 4) * 10;
        const buildingDepth = 15 + ((buildingIndex + 1) % 3) * 8;
        const buildingHeight = 8 + (buildingIndex % 6) * 8; // 8-48m tall
        
        const building = createBuilding(buildingWidth, buildingDepth, buildingHeight, buildingIndex);
        
        // Position within block
        const offsetX = (i % 2 === 0 ? -1 : 1) * (buildingArea / 4);
        const offsetY = (i < 2 ? -1 : 1) * (buildingArea / 4);
        building.position.set(
          blockCenterX + offsetX,
          blockCenterY + offsetY,
          0
        );
        building.rotation.z = (buildingIndex % 4) * Math.PI / 2;
        scenario.add(building);
        buildingIndex++;
      }

      // Add trees along sidewalks
      const treeSpacing = 15;
      for (let t = 0; t < 4; t++) {
        const tree = createTree(5 + (t % 3));
        const side = t % 4;
        let tx = blockCenterX;
        let ty = blockCenterY;
        
        if (side === 0) { tx -= BLOCK_SIZE / 2; ty += (t - 2) * treeSpacing; }
        else if (side === 1) { tx += BLOCK_SIZE / 2; ty += (t - 2) * treeSpacing; }
        else if (side === 2) { ty -= BLOCK_SIZE / 2; tx += (t - 2) * treeSpacing; }
        else { ty += BLOCK_SIZE / 2; tx += (t - 2) * treeSpacing; }
        
        tree.position.set(tx, ty, 0);
        scenario.add(tree);
      }

      // Add parked cars along streets
      if ((bx + by) % 2 === 0) {
        const car = createCar(carColors[carIndex % carColors.length]);
        car.position.set(
          blockCenterX + BLOCK_SIZE / 2 + 3,
          blockCenterY + (carIndex % 5 - 2) * 8,
          0
        );
        car.rotation.z = Math.PI / 2;
        scenario.add(car);
        carIndex++;
      }
    }
  }

  // Add lane markings to streets
  for (let i = 0; i <= NUM_BLOCKS; i++) {
    const streetPos = -halfSize + STREET_WIDTH / 2 + i * (BLOCK_SIZE + STREET_WIDTH);
    
    // Horizontal streets
    const hMarkings = createLaneMarkings(totalSize, true);
    hMarkings.position.set(0, streetPos, 0);
    scenario.add(hMarkings);
    
    // Vertical streets
    const vMarkings = createLaneMarkings(totalSize, false);
    vMarkings.position.set(streetPos, 0, 0);
    scenario.add(vMarkings);
  }

  // Add street lights at intersections
  for (let ix = 0; ix <= NUM_BLOCKS; ix++) {
    for (let iy = 0; iy <= NUM_BLOCKS; iy++) {
      if ((ix + iy) % 2 === 0) {
        const light = createStreetLight();
        light.position.set(
          -halfSize + STREET_WIDTH / 2 + ix * (BLOCK_SIZE + STREET_WIDTH) + 5,
          -halfSize + STREET_WIDTH / 2 + iy * (BLOCK_SIZE + STREET_WIDTH) + 5,
          0
        );
        scenario.add(light);
      }
    }
  }

  // Add traffic signs at some intersections
  for (let ix = 0; ix < NUM_BLOCKS; ix += 2) {
    for (let iy = 0; iy < NUM_BLOCKS; iy += 2) {
      const sign = createTrafficSign(ix % 4 === 0 ? 'STOP' : 'YIELD');
      sign.position.set(
        -halfSize + STREET_WIDTH + ix * (BLOCK_SIZE + STREET_WIDTH) - 2,
        -halfSize + STREET_WIDTH + iy * (BLOCK_SIZE + STREET_WIDTH) - 2,
        0
      );
      scenario.add(sign);
    }
  }

  // Add some cars on the streets
  for (let i = 0; i < 20; i++) {
    const car = createCar(carColors[i % carColors.length]);
    const streetIdx = i % (NUM_BLOCKS + 1);
    const isHorizontal = i % 2 === 0;
    const streetPos = -halfSize + STREET_WIDTH / 2 + streetIdx * (BLOCK_SIZE + STREET_WIDTH);
    const alongStreet = -halfSize + 50 + (i * 47) % (totalSize - 100);
    
    car.position.set(
      isHorizontal ? alongStreet : streetPos + (i % 2 === 0 ? 3 : -3),
      isHorizontal ? streetPos + (i % 2 === 0 ? 3 : -3) : alongStreet,
      0
    );
    car.rotation.z = isHorizontal ? 0 : Math.PI / 2;
    scenario.add(car);
  }

  return scenario;
}

/**
 * Get all meshes from the scenario for raycasting.
 */
export function getCityScenarioMeshes(scenario: THREE.Group): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scenario.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object);
    }
  });
  return meshes;
}
