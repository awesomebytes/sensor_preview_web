import * as THREE from 'three';

/**
 * Creates a geometric household scenario using Three.js primitives.
 * All dimensions are in meters, positioned for ROS coordinate system (Z-up).
 *
 * Supports two sizes:
 * - small: 10m × 10m room (cozy house)
 * - large: 20m × 20m room (spacious, good for testing LIDAR ranges)
 *
 * Objects:
 * - Floor and 4 Walls
 * - Table: 1.5m × 0.8m × 0.75m
 * - 2 Chairs: ~0.5m × 0.5m × 1m (composite)
 * - Sofa: 2m × 0.9m × 0.8m
 * - Person: 0.4m diameter × 1.7m tall (cylinder + sphere)
 * - Bookshelf: 1m × 0.3m × 2m
 * - TV: 1.2m × 0.05m × 0.7m
 * - Lamp: 0.3m × 1.5m (cylinder + cone)
 */

// Color palette
const COLORS = {
  floor: 0x808080,        // Gray
  wall: 0xd3d3d3,         // Light gray
  table: 0x8b4513,        // Saddle brown
  chair: 0xa0522d,        // Sienna (brown)
  sofa: 0x4169e1,         // Royal blue
  person: 0xffdbac,       // Skin tone
  personClothes: 0x2f4f4f, // Dark slate gray
  bookshelf: 0x654321,    // Dark brown
  books: 0x8b0000,        // Dark red
  tv: 0x1a1a1a,           // Near black
  tvScreen: 0x000080,     // Navy (off screen)
  lamp: 0xc0c0c0,         // Silver
  lampShade: 0xfff8dc,    // Cornsilk
};

/**
 * Create the floor plane.
 */
function createFloor(roomSize: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(roomSize, roomSize);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.name = 'floor';
  floor.receiveShadow = true;
  floor.position.set(0, 0, 0);
  return floor;
}

/**
 * Create the four walls.
 */
function createWalls(roomSize: number): THREE.Group {
  const walls = new THREE.Group();
  walls.name = 'walls';

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.wall,
    roughness: 0.9,
    metalness: 0.0,
  });

  const wallHeight = 3;
  const wallThickness = 0.1;

  // Back wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(roomSize, wallThickness, wallHeight),
    wallMaterial
  );
  backWall.name = 'wall_back';
  backWall.position.set(0, -roomSize / 2 + wallThickness / 2, wallHeight / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  walls.add(backWall);

  // Front wall
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(roomSize, wallThickness, wallHeight),
    wallMaterial.clone()
  );
  frontWall.name = 'wall_front';
  frontWall.position.set(0, roomSize / 2 - wallThickness / 2, wallHeight / 2);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  walls.add(frontWall);

  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, roomSize, wallHeight),
    wallMaterial.clone()
  );
  leftWall.name = 'wall_left';
  leftWall.position.set(-roomSize / 2 + wallThickness / 2, 0, wallHeight / 2);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  walls.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, roomSize, wallHeight),
    wallMaterial.clone()
  );
  rightWall.name = 'wall_right';
  rightWall.position.set(roomSize / 2 - wallThickness / 2, 0, wallHeight / 2);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  walls.add(rightWall);

  return walls;
}

/**
 * Create a table.
 */
function createTable(): THREE.Group {
  const table = new THREE.Group();
  table.name = 'table';

  const tableMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.table,
    roughness: 0.7,
    metalness: 0.1,
  });

  const topWidth = 1.5;
  const topDepth = 0.8;
  const topThickness = 0.05;
  const tableHeight = 0.75;
  const legHeight = tableHeight - topThickness;
  const legSize = 0.05;

  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(topWidth, topDepth, topThickness),
    tableMaterial
  );
  tableTop.position.set(0, 0, tableHeight - topThickness / 2);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  table.add(tableTop);

  const legGeometry = new THREE.BoxGeometry(legSize, legSize, legHeight);
  const legPositions = [
    [-topWidth / 2 + legSize, -topDepth / 2 + legSize],
    [topWidth / 2 - legSize, -topDepth / 2 + legSize],
    [-topWidth / 2 + legSize, topDepth / 2 - legSize],
    [topWidth / 2 - legSize, topDepth / 2 - legSize],
  ];

  legPositions.forEach((pos, i) => {
    const leg = new THREE.Mesh(legGeometry, tableMaterial);
    leg.position.set(pos[0], pos[1], legHeight / 2);
    leg.castShadow = true;
    leg.receiveShadow = true;
    leg.name = `table_leg_${i}`;
    table.add(leg);
  });

  return table;
}

/**
 * Create a chair.
 */
function createChair(): THREE.Group {
  const chair = new THREE.Group();
  chair.name = 'chair';

  const chairMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.chair,
    roughness: 0.7,
    metalness: 0.1,
  });

  const seatWidth = 0.45;
  const seatDepth = 0.45;
  const seatHeight = 0.45;
  const seatThickness = 0.05;
  const backHeight = 0.5;
  const backThickness = 0.05;
  const legSize = 0.04;

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(seatWidth, seatDepth, seatThickness),
    chairMaterial
  );
  seat.position.set(0, 0, seatHeight);
  seat.castShadow = true;
  seat.receiveShadow = true;
  chair.add(seat);

  const backRest = new THREE.Mesh(
    new THREE.BoxGeometry(seatWidth, backThickness, backHeight),
    chairMaterial
  );
  backRest.position.set(0, -seatDepth / 2 + backThickness / 2, seatHeight + backHeight / 2);
  backRest.castShadow = true;
  backRest.receiveShadow = true;
  chair.add(backRest);

  const legGeometry = new THREE.BoxGeometry(legSize, legSize, seatHeight - seatThickness / 2);
  const legPositions = [
    [-seatWidth / 2 + legSize, -seatDepth / 2 + legSize],
    [seatWidth / 2 - legSize, -seatDepth / 2 + legSize],
    [-seatWidth / 2 + legSize, seatDepth / 2 - legSize],
    [seatWidth / 2 - legSize, seatDepth / 2 - legSize],
  ];

  legPositions.forEach((pos, i) => {
    const leg = new THREE.Mesh(legGeometry, chairMaterial);
    leg.position.set(pos[0], pos[1], (seatHeight - seatThickness / 2) / 2);
    leg.castShadow = true;
    leg.receiveShadow = true;
    leg.name = `chair_leg_${i}`;
    chair.add(leg);
  });

  return chair;
}

/**
 * Create a sofa.
 */
function createSofa(): THREE.Group {
  const sofa = new THREE.Group();
  sofa.name = 'sofa';

  const sofaMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.sofa,
    roughness: 0.8,
    metalness: 0.0,
  });

  const sofaWidth = 2.0;
  const sofaDepth = 0.9;
  const seatHeight = 0.45;
  const backHeight = 0.35;
  const armWidth = 0.15;
  const armHeight = 0.25;

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(sofaWidth, sofaDepth, seatHeight),
    sofaMaterial
  );
  seat.position.set(0, 0, seatHeight / 2);
  seat.castShadow = true;
  seat.receiveShadow = true;
  sofa.add(seat);

  const backRest = new THREE.Mesh(
    new THREE.BoxGeometry(sofaWidth - 2 * armWidth, 0.2, backHeight),
    sofaMaterial
  );
  backRest.position.set(0, -sofaDepth / 2 + 0.1, seatHeight + backHeight / 2);
  backRest.castShadow = true;
  backRest.receiveShadow = true;
  sofa.add(backRest);

  const leftArm = new THREE.Mesh(
    new THREE.BoxGeometry(armWidth, sofaDepth, seatHeight + armHeight),
    sofaMaterial
  );
  leftArm.position.set(-sofaWidth / 2 + armWidth / 2, 0, (seatHeight + armHeight) / 2);
  leftArm.castShadow = true;
  leftArm.receiveShadow = true;
  sofa.add(leftArm);

  const rightArm = new THREE.Mesh(
    new THREE.BoxGeometry(armWidth, sofaDepth, seatHeight + armHeight),
    sofaMaterial
  );
  rightArm.position.set(sofaWidth / 2 - armWidth / 2, 0, (seatHeight + armHeight) / 2);
  rightArm.castShadow = true;
  rightArm.receiveShadow = true;
  sofa.add(rightArm);

  return sofa;
}

/**
 * Create a standing person.
 */
function createPerson(): THREE.Group {
  const person = new THREE.Group();
  person.name = 'person';

  const bodyHeight = 1.2;
  const bodyRadius = 0.18;
  const headRadius = 0.12;
  const legHeight = 0.85;
  const legRadius = 0.08;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.personClothes,
    roughness: 0.9,
    metalness: 0.0,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius, bodyRadius * 0.9, bodyHeight - legHeight, 16),
    bodyMaterial
  );
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0, legHeight + (bodyHeight - legHeight) / 2);
  body.castShadow = true;
  body.receiveShadow = true;
  person.add(body);

  const headMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.person,
    roughness: 0.7,
    metalness: 0.0,
  });
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 16, 12),
    headMaterial
  );
  head.position.set(0, 0, bodyHeight + headRadius * 0.8);
  head.castShadow = true;
  head.receiveShadow = true;
  person.add(head);

  const legMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.personClothes,
    roughness: 0.9,
    metalness: 0.0,
  });

  const leftLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 8),
    legMaterial
  );
  leftLeg.rotation.x = Math.PI / 2;
  leftLeg.position.set(-0.1, 0, legHeight / 2);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  person.add(leftLeg);

  const rightLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 8),
    legMaterial
  );
  rightLeg.rotation.x = Math.PI / 2;
  rightLeg.position.set(0.1, 0, legHeight / 2);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  person.add(rightLeg);

  return person;
}

/**
 * Create a bookshelf.
 */
function createBookshelf(): THREE.Group {
  const bookshelf = new THREE.Group();
  bookshelf.name = 'bookshelf';

  const shelfMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.bookshelf,
    roughness: 0.8,
    metalness: 0.1,
  });

  const width = 1.0;
  const depth = 0.3;
  const height = 2.0;
  const shelfThickness = 0.03;
  const sideThickness = 0.03;
  const numShelves = 5;

  const leftSide = new THREE.Mesh(
    new THREE.BoxGeometry(sideThickness, depth, height),
    shelfMaterial
  );
  leftSide.position.set(-width / 2 + sideThickness / 2, 0, height / 2);
  leftSide.castShadow = true;
  leftSide.receiveShadow = true;
  bookshelf.add(leftSide);

  const rightSide = new THREE.Mesh(
    new THREE.BoxGeometry(sideThickness, depth, height),
    shelfMaterial
  );
  rightSide.position.set(width / 2 - sideThickness / 2, 0, height / 2);
  rightSide.castShadow = true;
  rightSide.receiveShadow = true;
  bookshelf.add(rightSide);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.01, height),
    shelfMaterial
  );
  back.position.set(0, -depth / 2 + 0.005, height / 2);
  back.castShadow = true;
  back.receiveShadow = true;
  bookshelf.add(back);

  const shelfWidth = width - 2 * sideThickness;
  const shelfGeometry = new THREE.BoxGeometry(shelfWidth, depth, shelfThickness);

  for (let i = 0; i <= numShelves; i++) {
    const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    const z = (i / numShelves) * (height - shelfThickness);
    shelf.position.set(0, 0, z + shelfThickness / 2);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    shelf.name = `shelf_${i}`;
    bookshelf.add(shelf);
  }

  // Add books with deterministic colors (no random)
  const bookColors = [0x8b0000, 0x006400, 0x00008b, 0x8b4513, 0x4b0082];
  for (let shelfIdx = 1; shelfIdx < numShelves; shelfIdx++) {
    const shelfZ = (shelfIdx / numShelves) * (height - shelfThickness) + shelfThickness;
    const numBooks = 6 + shelfIdx;
    let xPos = -shelfWidth / 2 + 0.05;

    for (let b = 0; b < numBooks && xPos < shelfWidth / 2 - 0.05; b++) {
      const bookWidth = 0.025 + (b % 3) * 0.01;
      const bookHeight = 0.18 + (b % 4) * 0.02;
      const bookDepth = depth - 0.05;

      const book = new THREE.Mesh(
        new THREE.BoxGeometry(bookWidth, bookDepth, bookHeight),
        new THREE.MeshStandardMaterial({
          color: bookColors[(b + shelfIdx) % bookColors.length],
          roughness: 0.9,
        })
      );
      book.position.set(xPos + bookWidth / 2, 0.02, shelfZ + bookHeight / 2);
      book.castShadow = true;
      book.receiveShadow = true;
      bookshelf.add(book);

      xPos += bookWidth + 0.005;
    }
  }

  return bookshelf;
}

/**
 * Create a TV on a stand.
 */
function createTV(): THREE.Group {
  const tv = new THREE.Group();
  tv.name = 'tv';

  const tvWidth = 1.2;
  const tvDepth = 0.05;
  const tvHeight = 0.7;
  const standWidth = 0.8;
  const standHeight = 0.5;
  const standDepth = 0.3;

  const standMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.bookshelf,
    roughness: 0.7,
    metalness: 0.1,
  });
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(standWidth, standDepth, standHeight),
    standMaterial
  );
  stand.position.set(0, 0, standHeight / 2);
  stand.castShadow = true;
  stand.receiveShadow = true;
  tv.add(stand);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.tv,
    roughness: 0.3,
    metalness: 0.5,
  });
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(tvWidth, tvDepth, tvHeight),
    frameMaterial
  );
  frame.position.set(0, 0, standHeight + tvHeight / 2);
  frame.castShadow = true;
  frame.receiveShadow = true;
  tv.add(frame);

  const screenMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.tvScreen,
    roughness: 0.1,
    metalness: 0.3,
    emissive: 0x000040,
    emissiveIntensity: 0.2,
  });
  const screenBorder = 0.03;
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(tvWidth - screenBorder * 2, 0.001, tvHeight - screenBorder * 2),
    screenMaterial
  );
  screen.position.set(0, tvDepth / 2 + 0.001, standHeight + tvHeight / 2);
  tv.add(screen);

  return tv;
}

/**
 * Create a floor lamp.
 */
function createLamp(): THREE.Group {
  const lamp = new THREE.Group();
  lamp.name = 'lamp';

  const baseRadius = 0.15;
  const baseHeight = 0.03;
  const poleRadius = 0.02;
  const poleHeight = 1.3;
  const shadeRadius = 0.15;
  const shadeHeight = 0.25;

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.lamp,
    roughness: 0.3,
    metalness: 0.8,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 16),
    metalMaterial
  );
  base.rotation.x = Math.PI / 2;
  base.position.set(0, 0, baseHeight / 2);
  base.castShadow = true;
  base.receiveShadow = true;
  lamp.add(base);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 8),
    metalMaterial
  );
  pole.rotation.x = Math.PI / 2;
  pole.position.set(0, 0, baseHeight + poleHeight / 2);
  pole.castShadow = true;
  lamp.add(pole);

  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.lampShade,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(shadeRadius, shadeHeight, 16, 1, true),
    shadeMaterial
  );
  shade.rotation.x = -Math.PI / 2;
  shade.position.set(0, 0, baseHeight + poleHeight + shadeHeight / 2);
  shade.castShadow = true;
  lamp.add(shade);

  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffaa,
    emissive: 0xffffaa,
    emissiveIntensity: 0.5,
  });
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    bulbMaterial
  );
  bulb.position.set(0, 0, baseHeight + poleHeight);
  lamp.add(bulb);

  return lamp;
}

/**
 * Configuration for household scenario sizes.
 */
export interface HouseholdConfig {
  roomSize: number;
  furnitureScale: number; // Scale factor for furniture positioning
}

export const HOUSEHOLD_CONFIGS = {
  small: { roomSize: 10, furnitureScale: 0.8 },
  large: { roomSize: 20, furnitureScale: 1.0 },
} as const;

/**
 * Creates the complete household scenario.
 * @param size 'small' (10m) or 'large' (20m)
 * @returns A THREE.Group containing all scenario objects
 */
export function createHouseholdScenario(size: 'small' | 'large' = 'large'): THREE.Group {
  const config = HOUSEHOLD_CONFIGS[size];
  const scenario = new THREE.Group();
  scenario.name = `household_${size}_scenario`;

  // Add floor and walls
  scenario.add(createFloor(config.roomSize));
  scenario.add(createWalls(config.roomSize));

  // Position multiplier based on room size
  const s = config.furnitureScale;
  const wallOffset = config.roomSize * 0.4; // Distance from center to wall area

  // Table in center
  const table = createTable();
  table.position.set(0, 0.5 * s, 0);
  scenario.add(table);

  // Chairs near table
  const chair1 = createChair();
  chair1.position.set(-0.8 * s, 0.5 * s, 0);
  chair1.rotation.z = Math.PI / 2;
  chair1.name = 'chair_1';
  scenario.add(chair1);

  const chair2 = createChair();
  chair2.position.set(0.8 * s, 0.5 * s, 0);
  chair2.rotation.z = -Math.PI / 2;
  chair2.name = 'chair_2';
  scenario.add(chair2);

  // Sofa against back wall
  const sofa = createSofa();
  sofa.position.set(0, -wallOffset + 1.5, 0);
  scenario.add(sofa);

  // Person near sofa
  const person = createPerson();
  person.position.set(1.5 * s, -wallOffset + 3, 0);
  scenario.add(person);

  // Bookshelf against left wall
  const bookshelf = createBookshelf();
  bookshelf.position.set(-wallOffset + 0.5, 0, 0);
  bookshelf.rotation.z = Math.PI / 2;
  scenario.add(bookshelf);

  // TV against right wall
  const tv = createTV();
  tv.position.set(wallOffset - 1, -2 * s, 0);
  tv.rotation.z = -Math.PI / 2;
  scenario.add(tv);

  // Lamp in corner
  const lamp = createLamp();
  lamp.position.set(-wallOffset + 1, -wallOffset + 1, 0);
  scenario.add(lamp);

  return scenario;
}

/**
 * Get all meshes from the scenario for raycasting.
 */
export function getScenarioMeshes(scenario: THREE.Group): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scenario.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object);
    }
  });
  return meshes;
}
