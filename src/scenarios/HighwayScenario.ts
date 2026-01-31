import * as THREE from 'three';

/**
 * Creates a geometric highway scenario using Three.js primitives.
 * All dimensions are in meters, positioned for ROS coordinate system (Z-up).
 *
 * Layout: ~1km highway stretch with gentle curve featuring:
 * - 4-lane highway (2 lanes each direction)
 * - Guard rails on both sides
 * - Concrete median barrier (Jersey barrier style)
 * - Highway signs and information panels
 * - Various vehicles (cars, trucks)
 * - Road markings
 */

// Color palette
const COLORS = {
  asphalt: 0x2a2a2a,
  shoulder: 0x3a3a3a,
  laneMarking: 0xffffff,
  yellowLine: 0xffcc00,
  guardrail: 0x888888,
  concrete: 0xc0c0c0,
  signPost: 0x808080,
  signGreen: 0x006400,
  signBlue: 0x0066cc,
  signWhite: 0xffffff,
  car1: 0xff0000,
  car2: 0x0000ff,
  car3: 0xffffff,
  car4: 0x333333,
  car5: 0xffcc00,
  truckCab: 0x1a1a8a,
  truckTrailer: 0xeeeeee,
  grass: 0x3d7a3d,
};

// Highway dimensions
const HIGHWAY_LENGTH = 1000;  // 1km
const LANE_WIDTH = 3.7;       // Standard lane width
const NUM_LANES = 4;          // 2 each direction
const SHOULDER_WIDTH = 3;
const MEDIAN_WIDTH = 2;
const CURVE_AMPLITUDE = 50;   // Maximum lateral offset in meters for S-curve

/**
 * Get Y position along the highway S-curve.
 * The curve passes through (0, 0) at t=0.5 (center of highway).
 * @param t Parameter from 0 to 1 along highway length
 * @returns Y position (lateral offset)
 */
function getCurveY(t: number): number {
  // S-curve: sin((t-0.5)*π) gives -1 at t=0, 0 at t=0.5, +1 at t=1
  return Math.sin((t - 0.5) * Math.PI) * CURVE_AMPLITUDE;
}

/**
 * Create a curved road segment using multiple straight pieces.
 */
function createCurvedRoad(): THREE.Group {
  const road = new THREE.Group();
  road.name = 'highway_road';

  const roadWidth = NUM_LANES * LANE_WIDTH + SHOULDER_WIDTH * 2 + MEDIAN_WIDTH;
  const segments = 50;
  const segmentLength = HIGHWAY_LENGTH / segments;

  const asphaltMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.asphalt,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  // Create road segments following a gentle S-curve centered at origin
  const getPosition = (t: number) => {
    const x = t * HIGHWAY_LENGTH - HIGHWAY_LENGTH / 2;
    const y = getCurveY(t);
    return { x, y };
  };
  
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const nextT = (i + 1) / segments;
    
    const pos = getPosition(t + 0.5 / segments);
    const nextPos = getPosition(nextT);
    const angle = Math.atan2(nextPos.y - getPosition(t).y, nextPos.x - getPosition(t).x);

    const segment = new THREE.Mesh(
      new THREE.BoxGeometry(segmentLength * 1.02, roadWidth, 0.1),
      asphaltMaterial
    );
    segment.position.set(pos.x, pos.y, 0.05);
    segment.rotation.z = angle;
    segment.receiveShadow = true;
    road.add(segment);
  }

  return road;
}

/**
 * Create lane markings along the curved path.
 */
function createLaneMarkings(): THREE.Group {
  const markings = new THREE.Group();
  markings.name = 'lane_markings';

  const whiteMaterial = new THREE.MeshBasicMaterial({ color: COLORS.laneMarking });
  const yellowMaterial = new THREE.MeshBasicMaterial({ color: COLORS.yellowLine });

  const segments = 100;
  const dashLength = 3;
  const dashGap = 6;
  const roadWidth = NUM_LANES * LANE_WIDTH + SHOULDER_WIDTH * 2 + MEDIAN_WIDTH;

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const x = t * HIGHWAY_LENGTH - HIGHWAY_LENGTH / 2;
    const y = getCurveY(t);
    
    // Calculate road direction
    const nextT = Math.min(t + 0.01, 1);
    const nextY = getCurveY(nextT);
    const angle = Math.atan2(nextY - y, HIGHWAY_LENGTH * 0.01);

    // Center double yellow line (median)
    if (i % 2 === 0) {
      const centerLine1 = new THREE.Mesh(
        new THREE.BoxGeometry(dashLength, 0.15, 0.02),
        yellowMaterial
      );
      centerLine1.position.set(x, y + 0.2, 0.11);
      centerLine1.rotation.z = angle;
      markings.add(centerLine1);

      const centerLine2 = new THREE.Mesh(
        new THREE.BoxGeometry(dashLength, 0.15, 0.02),
        yellowMaterial
      );
      centerLine2.position.set(x, y - 0.2, 0.11);
      centerLine2.rotation.z = angle;
      markings.add(centerLine2);
    }

    // Lane dividers (dashed white)
    if (i % 3 === 0) {
      for (let lane = 1; lane < NUM_LANES / 2; lane++) {
        // Right side lanes
        const rightLane = new THREE.Mesh(
          new THREE.BoxGeometry(dashLength, 0.15, 0.02),
          whiteMaterial
        );
        const rightOffset = MEDIAN_WIDTH / 2 + lane * LANE_WIDTH;
        rightLane.position.set(x, y + rightOffset, 0.11);
        rightLane.rotation.z = angle;
        markings.add(rightLane);

        // Left side lanes
        const leftLane = new THREE.Mesh(
          new THREE.BoxGeometry(dashLength, 0.15, 0.02),
          whiteMaterial
        );
        leftLane.position.set(x, y - rightOffset, 0.11);
        leftLane.rotation.z = angle;
        markings.add(leftLane);
      }
    }

    // Edge lines (solid white)
    const edgeOffset = roadWidth / 2 - SHOULDER_WIDTH / 2;
    const rightEdge = new THREE.Mesh(
      new THREE.BoxGeometry(HIGHWAY_LENGTH / segments, 0.2, 0.02),
      whiteMaterial
    );
    rightEdge.position.set(x, y + edgeOffset, 0.11);
    rightEdge.rotation.z = angle;
    markings.add(rightEdge);

    const leftEdge = new THREE.Mesh(
      new THREE.BoxGeometry(HIGHWAY_LENGTH / segments, 0.2, 0.02),
      whiteMaterial
    );
    leftEdge.position.set(x, y - edgeOffset, 0.11);
    leftEdge.rotation.z = angle;
    markings.add(leftEdge);
  }

  return markings;
}

/**
 * Create guard rails along the highway.
 */
function createGuardRails(): THREE.Group {
  const rails = new THREE.Group();
  rails.name = 'guard_rails';

  const railMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.guardrail,
    roughness: 0.5,
    metalness: 0.7,
  });

  const postMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.guardrail,
    roughness: 0.6,
    metalness: 0.5,
  });

  const roadWidth = NUM_LANES * LANE_WIDTH + SHOULDER_WIDTH * 2 + MEDIAN_WIDTH;
  const railOffset = roadWidth / 2 + 0.5;
  const postSpacing = 4;
  const numPosts = Math.floor(HIGHWAY_LENGTH / postSpacing);

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < numPosts; i++) {
      const t = i / numPosts;
      const x = t * HIGHWAY_LENGTH - HIGHWAY_LENGTH / 2;
      const baseY = getCurveY(t);
      const y = baseY + side * railOffset;

      // Post
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.8),
        postMaterial
      );
      post.position.set(x, y, 0.4);
      post.castShadow = true;
      rails.add(post);

      // Rail beam (every other post)
      if (i % 2 === 0 && i < numPosts - 1) {
        const nextT = (i + 2) / numPosts;
        const nextX = nextT * HIGHWAY_LENGTH - HIGHWAY_LENGTH / 2;
        const nextBaseY = getCurveY(nextT);
        const nextY = nextBaseY + side * railOffset;
        
        const beamLength = Math.sqrt(Math.pow(nextX - x, 2) + Math.pow(nextY - y, 2));
        const beamAngle = Math.atan2(nextY - y, nextX - x);

        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(beamLength, 0.3, 0.05),
          railMaterial
        );
        beam.position.set((x + nextX) / 2, (y + nextY) / 2, 0.55);
        beam.rotation.z = beamAngle;
        rails.add(beam);
      }
    }
  }

  return rails;
}

/**
 * Create concrete median barrier (Jersey barrier style).
 */
function createMedianBarrier(): THREE.Group {
  const barrier = new THREE.Group();
  barrier.name = 'median_barrier';

  const concreteMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.concrete,
    roughness: 0.9,
  });

  const segments = 50;
  const barrierLength = HIGHWAY_LENGTH / segments;
  const barrierWidth = 0.6;
  const barrierHeight = 0.8;

  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments;
    const x = t * HIGHWAY_LENGTH - HIGHWAY_LENGTH / 2;
    const y = getCurveY(t);
    
    const nextT = (i + 1.5) / segments;
    const nextY = getCurveY(nextT);
    const angle = Math.atan2(nextY - y, barrierLength);

    // Jersey barrier shape (simplified as trapezoid-ish box)
    const barrierSegment = new THREE.Mesh(
      new THREE.BoxGeometry(barrierLength * 1.02, barrierWidth, barrierHeight),
      concreteMaterial
    );
    barrierSegment.position.set(x, y, barrierHeight / 2);
    barrierSegment.rotation.z = angle;
    barrierSegment.castShadow = true;
    barrierSegment.receiveShadow = true;
    barrier.add(barrierSegment);
  }

  return barrier;
}

/**
 * Create a highway information sign (overhead).
 */
function createOverheadSign(text: string, distance: string): THREE.Group {
  const sign = new THREE.Group();
  sign.name = 'overhead_sign';

  const postMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.signPost,
    roughness: 0.5,
    metalness: 0.6,
  });

  const signMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.signGreen,
    roughness: 0.7,
  });

  const roadWidth = NUM_LANES * LANE_WIDTH + SHOULDER_WIDTH * 2 + MEDIAN_WIDTH;

  // Support posts
  const postHeight = 7;
  const leftPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, postHeight, 8),
    postMaterial
  );
  leftPost.rotation.x = Math.PI / 2;
  leftPost.position.set(0, roadWidth / 2 + 1, postHeight / 2);
  leftPost.castShadow = true;
  sign.add(leftPost);

  const rightPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, postHeight, 8),
    postMaterial
  );
  rightPost.rotation.x = Math.PI / 2;
  rightPost.position.set(0, -roadWidth / 2 - 1, postHeight / 2);
  rightPost.castShadow = true;
  sign.add(rightPost);

  // Horizontal beam
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, roadWidth + 4, 0.3),
    postMaterial
  );
  beam.position.set(0, 0, postHeight);
  sign.add(beam);

  // Sign panel
  const signWidth = roadWidth - 2;
  const signHeight = 2.5;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, signWidth, signHeight),
    signMaterial
  );
  panel.position.set(0.1, 0, postHeight - 0.5);
  panel.castShadow = true;
  sign.add(panel);

  // White backing strip
  const backingMaterial = new THREE.MeshStandardMaterial({ color: COLORS.signWhite });
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, signWidth - 0.5, 0.3),
    backingMaterial
  );
  backing.position.set(0.15, 0, postHeight - 0.5 + signHeight / 2 - 0.3);
  sign.add(backing);

  return sign;
}

/**
 * Create a roadside sign (speed limit, exit, etc).
 */
function createRoadsideSign(type: 'speed' | 'exit' | 'info' = 'speed'): THREE.Group {
  const sign = new THREE.Group();
  sign.name = `roadside_sign_${type}`;

  const postMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.signPost,
    roughness: 0.6,
    metalness: 0.5,
  });

  // Post
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 3, 8),
    postMaterial
  );
  post.rotation.x = Math.PI / 2;
  post.position.z = 1.5;
  post.castShadow = true;
  sign.add(post);

  // Sign face
  let signColor = COLORS.signWhite;
  let signWidth = 0.8;
  let signHeight = 1.0;
  
  if (type === 'exit') {
    signColor = COLORS.signGreen;
    signWidth = 1.5;
    signHeight = 0.8;
  } else if (type === 'info') {
    signColor = COLORS.signBlue;
    signWidth = 1.2;
  }

  const signMaterial = new THREE.MeshStandardMaterial({
    color: signColor,
    roughness: 0.5,
  });

  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, signWidth, signHeight),
    signMaterial
  );
  face.position.set(0, 0, 2.8);
  face.castShadow = true;
  sign.add(face);

  // Border for speed limit signs
  if (type === 'speed') {
    const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, signWidth + 0.1, signHeight + 0.1),
      borderMaterial
    );
    border.position.set(-0.02, 0, 2.8);
    sign.add(border);
  }

  return sign;
}

/**
 * Create a car for highway.
 */
function createHighwayCar(color: number): THREE.Group {
  const car = new THREE.Group();
  car.name = 'highway_car';

  const carLength = 4.5;
  const carWidth = 1.8;
  const carHeight = 1.4;

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
    new THREE.BoxGeometry(carLength * 0.5, carWidth - 0.2, carHeight * 0.5),
    bodyMaterial
  );
  cabin.position.set(-carLength * 0.1, 0, carHeight * 0.5 + 0.4);
  cabin.castShadow = true;
  car.add(cabin);

  // Wheels
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const wheelRadius = 0.35;
  const wheelPositions = [
    [carLength * 0.3, carWidth / 2 + 0.1],
    [carLength * 0.3, -carWidth / 2 - 0.1],
    [-carLength * 0.3, carWidth / 2 + 0.1],
    [-carLength * 0.3, -carWidth / 2 - 0.1],
  ];

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.25, 16),
      wheelMaterial
    );
    wheel.position.set(pos[0], pos[1], wheelRadius);
    wheel.rotation.x = Math.PI / 2;
    car.add(wheel);
  });

  return car;
}

/**
 * Create a truck with trailer.
 */
function createTruck(): THREE.Group {
  const truck = new THREE.Group();
  truck.name = 'truck';

  const cabMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.truckCab,
    roughness: 0.4,
    metalness: 0.5,
  });

  const trailerMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.truckTrailer,
    roughness: 0.6,
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8,
  });

  // Cab
  const cabLength = 3;
  const cabWidth = 2.4;
  const cabHeight = 2.8;

  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(cabLength, cabWidth, cabHeight),
    cabMaterial
  );
  cab.position.set(cabLength / 2 + 6, 0, cabHeight / 2 + 0.5);
  cab.castShadow = true;
  truck.add(cab);

  // Trailer
  const trailerLength = 12;
  const trailerWidth = 2.5;
  const trailerHeight = 3.5;

  const trailer = new THREE.Mesh(
    new THREE.BoxGeometry(trailerLength, trailerWidth, trailerHeight),
    trailerMaterial
  );
  trailer.position.set(-trailerLength / 2 + 5, 0, trailerHeight / 2 + 0.8);
  trailer.castShadow = true;
  truck.add(trailer);

  // Wheels
  const wheelRadius = 0.5;
  const wheelWidth = 0.3;
  const wheelPositions = [
    // Cab wheels
    [cabLength + 5, cabWidth / 2 + 0.2],
    [cabLength + 5, -cabWidth / 2 - 0.2],
    [4.5, cabWidth / 2 + 0.2],
    [4.5, -cabWidth / 2 - 0.2],
    // Trailer wheels (dual axle)
    [-4, trailerWidth / 2 + 0.2],
    [-4, -trailerWidth / 2 - 0.2],
    [-5.5, trailerWidth / 2 + 0.2],
    [-5.5, -trailerWidth / 2 - 0.2],
  ];

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16),
      wheelMaterial
    );
    wheel.position.set(pos[0], pos[1], wheelRadius);
    wheel.rotation.x = Math.PI / 2;
    truck.add(wheel);
  });

  return truck;
}

/**
 * Create grass areas alongside highway.
 */
function createGrassAreas(): THREE.Group {
  const grass = new THREE.Group();
  grass.name = 'grass';

  const grassMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.grass,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });

  const roadWidth = NUM_LANES * LANE_WIDTH + SHOULDER_WIDTH * 2 + MEDIAN_WIDTH;
  const grassWidth = 30;

  // Right side grass
  const rightGrass = new THREE.Mesh(
    new THREE.PlaneGeometry(HIGHWAY_LENGTH + 100, grassWidth),
    grassMaterial
  );
  rightGrass.position.set(0, roadWidth / 2 + grassWidth / 2 + 2, 0);
  rightGrass.receiveShadow = true;
  grass.add(rightGrass);

  // Left side grass
  const leftGrass = new THREE.Mesh(
    new THREE.PlaneGeometry(HIGHWAY_LENGTH + 100, grassWidth),
    grassMaterial
  );
  leftGrass.position.set(0, -roadWidth / 2 - grassWidth / 2 - 2, 0);
  leftGrass.receiveShadow = true;
  grass.add(leftGrass);

  return grass;
}

/**
 * Creates the complete highway scenario.
 */
export function createHighwayScenario(): THREE.Group {
  const scenario = new THREE.Group();
  scenario.name = 'highway_scenario';

  // Grass areas first (background)
  scenario.add(createGrassAreas());

  // Road surface
  scenario.add(createCurvedRoad());

  // Lane markings
  scenario.add(createLaneMarkings());

  // Median barrier
  scenario.add(createMedianBarrier());

  // Guard rails
  scenario.add(createGuardRails());

  // Add overhead signs
  const sign1 = createOverheadSign('City Center', '5 km');
  sign1.position.x = -300;
  scenario.add(sign1);

  const sign2 = createOverheadSign('Airport / Industrial', '12 km');
  sign2.position.x = 200;
  scenario.add(sign2);

  // Add roadside signs
  const roadWidth = NUM_LANES * LANE_WIDTH + SHOULDER_WIDTH * 2 + MEDIAN_WIDTH;
  
  const speedSign1 = createRoadsideSign('speed');
  speedSign1.position.set(-400, roadWidth / 2 + 3, 0);
  scenario.add(speedSign1);

  const speedSign2 = createRoadsideSign('speed');
  speedSign2.position.set(100, roadWidth / 2 + 3, 0);
  scenario.add(speedSign2);

  const exitSign = createRoadsideSign('exit');
  exitSign.position.set(-100, roadWidth / 2 + 3, 0);
  scenario.add(exitSign);

  const infoSign = createRoadsideSign('info');
  infoSign.position.set(350, roadWidth / 2 + 3, 0);
  scenario.add(infoSign);

  // Add vehicles
  const carColors = [COLORS.car1, COLORS.car2, COLORS.car3, COLORS.car4, COLORS.car5];
  
  // Cars in various positions and lanes
  const laneOffset = MEDIAN_WIDTH / 2 + LANE_WIDTH / 2;
  const vehiclePositions = [
    { x: -350, lane: 1, color: 0 },
    { x: -250, lane: 2, color: 1 },
    { x: -150, lane: -1, color: 2 },
    { x: -50, lane: 1, color: 3 },
    { x: 50, lane: -2, color: 4 },
    { x: 150, lane: 2, color: 0 },
    { x: 250, lane: -1, color: 1 },
    { x: 350, lane: 1, color: 2 },
    { x: 400, lane: -2, color: 3 },
  ];

  vehiclePositions.forEach(vp => {
    const t = (vp.x + HIGHWAY_LENGTH / 2) / HIGHWAY_LENGTH;
    const y = getCurveY(t);
    const laneY = y + vp.lane * LANE_WIDTH;
    
    const car = createHighwayCar(carColors[vp.color]);
    car.position.set(vp.x, laneY, 0);
    
    // Angle car to follow road curve
    const nextT = (vp.x + 10 + HIGHWAY_LENGTH / 2) / HIGHWAY_LENGTH;
    const nextY = getCurveY(nextT);
    car.rotation.z = Math.atan2(nextY - y, 10);
    
    // Flip cars in opposite lanes
    if (vp.lane < 0) {
      car.rotation.z += Math.PI;
    }
    
    scenario.add(car);
  });

  // Add a truck
  const truck = createTruck();
  const truckT = 0.3;
  const truckX = truckT * HIGHWAY_LENGTH - HIGHWAY_LENGTH / 2;
  const truckY = getCurveY(truckT);
  truck.position.set(truckX, truckY + laneOffset + LANE_WIDTH, 0);
  
  const nextTruckT = 0.31;
  const nextTruckY = getCurveY(nextTruckT);
  truck.rotation.z = Math.atan2(nextTruckY - truckY, HIGHWAY_LENGTH * 0.01);
  scenario.add(truck);

  // Add another truck going opposite direction
  const truck2 = createTruck();
  const truck2T = 0.7;
  const truck2X = truck2T * HIGHWAY_LENGTH - HIGHWAY_LENGTH / 2;
  const truck2Y = getCurveY(truck2T);
  truck2.position.set(truck2X, truck2Y - laneOffset - LANE_WIDTH, 0);
  truck2.rotation.z = Math.PI + Math.atan2(nextTruckY - truckY, HIGHWAY_LENGTH * 0.01);
  scenario.add(truck2);

  return scenario;
}

/**
 * Get all meshes from the scenario for raycasting.
 */
export function getHighwayScenarioMeshes(scenario: THREE.Group): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scenario.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes.push(object);
    }
  });
  return meshes;
}
