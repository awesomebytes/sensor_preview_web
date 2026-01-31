/**
 * GLSL shaders for camera lens distortion.
 * 
 * Implements Brown-Conrady (polynomial) and fisheye (equidistant) distortion models.
 * The shaders apply distortion as a post-process effect on the rendered camera view.
 */

/**
 * Vertex shader - simple fullscreen quad pass-through.
 */
export const distortionVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Fragment shader for lens distortion.
 * 
 * Supports two distortion models:
 * - Brown-Conrady (model = 0): Standard polynomial radial + tangential distortion
 * - Fisheye Equidistant (model = 1): r = f * theta projection
 * 
 * The shader implements the INVERSE mapping: given a distorted output pixel,
 * find where to sample from the undistorted source image.
 */
export const distortionFragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float k1;
uniform float k2;
uniform float k3;
uniform float p1;
uniform float p2;
uniform vec2 principalPoint;  // (cx, cy) as fraction of image
uniform int model;            // 0 = brown-conrady, 1 = fisheye
uniform vec2 fov;             // (hFov, vFov) in radians for fisheye

varying vec2 vUv;

// Constants
const float PI = 3.14159265359;
const int MAX_ITERATIONS = 5;

/**
 * Apply Brown-Conrady distortion (forward direction).
 * Maps undistorted normalized coordinates to distorted.
 */
vec2 applyBrownConrady(vec2 p) {
  float r2 = dot(p, p);
  float r4 = r2 * r2;
  float r6 = r4 * r2;
  
  // Radial distortion
  float radial = 1.0 + k1 * r2 + k2 * r4 + k3 * r6;
  
  // Tangential distortion
  vec2 tangential = vec2(
    2.0 * p1 * p.x * p.y + p2 * (r2 + 2.0 * p.x * p.x),
    p1 * (r2 + 2.0 * p.y * p.y) + 2.0 * p2 * p.x * p.y
  );
  
  return p * radial + tangential;
}

/**
 * Invert Brown-Conrady distortion using Newton-Raphson iteration.
 * Maps distorted normalized coordinates to undistorted.
 */
vec2 invertBrownConrady(vec2 distorted) {
  vec2 p = distorted;  // Initial guess
  
  for (int i = 0; i < MAX_ITERATIONS; i++) {
    vec2 dp = applyBrownConrady(p);
    vec2 error = dp - distorted;
    
    // Check convergence
    if (dot(error, error) < 1e-10) break;
    
    // Compute Jacobian (derivative of distortion function)
    float r2 = dot(p, p);
    float r4 = r2 * r2;
    float r6 = r4 * r2;
    
    float radial = 1.0 + k1 * r2 + k2 * r4 + k3 * r6;
    float dradial_dr2 = k1 + 2.0 * k2 * r2 + 3.0 * k3 * r4;
    
    // Simplified Jacobian (diagonal approximation for stability)
    float J = radial + 2.0 * dradial_dr2 * r2;
    
    // Newton step
    p -= error / max(J, 0.5);
  }
  
  return p;
}

/**
 * Apply fisheye equidistant projection (forward).
 * Maps 3D direction to 2D image coordinates.
 * r = f * theta where theta is angle from optical axis.
 */
vec2 applyFisheyeEquidistant(vec2 p, vec2 halfFov) {
  // p is in normalized coordinates, scale by half-FOV to get angles
  float theta = length(p) * max(halfFov.x, halfFov.y);
  
  if (theta < 0.001) return p;
  
  // Fisheye: r_distorted = theta / tan(theta) * r_undistorted (approximation)
  float scale = theta / tan(theta);
  
  // Apply small radial correction for better accuracy
  float r2 = dot(p, p);
  float correction = 1.0 + k1 * r2 + k2 * r2 * r2;
  
  return p * scale * correction;
}

/**
 * Invert fisheye equidistant projection.
 * Uses iterative approach similar to Brown-Conrady.
 */
vec2 invertFisheyeEquidistant(vec2 distorted, vec2 halfFov) {
  vec2 p = distorted;  // Initial guess
  
  for (int i = 0; i < MAX_ITERATIONS; i++) {
    vec2 dp = applyFisheyeEquidistant(p, halfFov);
    vec2 error = dp - distorted;
    
    if (dot(error, error) < 1e-10) break;
    
    // Approximate inverse step
    float r = length(p);
    float theta = r * max(halfFov.x, halfFov.y);
    
    float J = 1.0;
    if (theta > 0.001) {
      float tanTheta = tan(theta);
      J = theta / tanTheta;
    }
    
    p -= error / max(J, 0.3);
  }
  
  return p;
}

void main() {
  // Convert UV (0-1) to normalized coordinates centered on principal point
  // Normalized coordinates range approximately -1 to 1 based on FOV
  vec2 centered = vUv - principalPoint;
  
  // Scale to account for aspect ratio
  // This maps the image to a normalized space where both axes have similar scale
  float aspect = 1.0;  // Assumes square pixels, adjust if needed
  vec2 normalized = centered * 2.0;  // Now in range [-1, 1]
  
  // Apply inverse distortion to find source coordinates
  vec2 undistorted;
  
  if (model == 0) {
    // Brown-Conrady
    undistorted = invertBrownConrady(normalized);
  } else {
    // Fisheye equidistant
    vec2 halfFov = fov * 0.5;
    undistorted = invertFisheyeEquidistant(normalized, halfFov);
  }
  
  // Convert back to UV coordinates
  vec2 sourceUv = undistorted * 0.5 + principalPoint;
  
  // Check bounds - pixels outside the source image are black
  if (sourceUv.x < 0.0 || sourceUv.x > 1.0 || sourceUv.y < 0.0 || sourceUv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  
  // Sample the undistorted source texture
  gl_FragColor = texture2D(tDiffuse, sourceUv);
}
`;

/**
 * Shader uniforms interface for TypeScript.
 */
export interface DistortionUniforms {
  tDiffuse: { value: THREE.Texture | null };
  k1: { value: number };
  k2: { value: number };
  k3: { value: number };
  p1: { value: number };
  p2: { value: number };
  principalPoint: { value: THREE.Vector2 };
  model: { value: number };
  fov: { value: THREE.Vector2 };
}

import * as THREE from 'three';
import type { CameraDistortion, PrincipalPoint } from '../types/sensors';

/**
 * Create default uniform values for the distortion shader.
 */
export function createDistortionUniforms(): DistortionUniforms {
  return {
    tDiffuse: { value: null },
    k1: { value: 0 },
    k2: { value: 0 },
    k3: { value: 0 },
    p1: { value: 0 },
    p2: { value: 0 },
    principalPoint: { value: new THREE.Vector2(0.5, 0.5) },
    model: { value: 0 },
    fov: { value: new THREE.Vector2(1.22, 0.79) }, // ~70°, ~45° in radians
  };
}

/**
 * Update distortion uniforms from camera config.
 */
export function updateDistortionUniforms(
  uniforms: DistortionUniforms,
  distortion: CameraDistortion,
  principalPoint: PrincipalPoint,
  hFovDeg: number,
  vFovDeg: number
): void {
  uniforms.k1.value = distortion.k1;
  uniforms.k2.value = distortion.k2;
  uniforms.k3.value = distortion.k3;
  uniforms.p1.value = distortion.p1;
  uniforms.p2.value = distortion.p2;
  uniforms.principalPoint.value.set(principalPoint.cx, principalPoint.cy);
  uniforms.model.value = distortion.model === 'fisheye-equidistant' ? 1 : 0;
  uniforms.fov.value.set(
    hFovDeg * Math.PI / 180,
    vFovDeg * Math.PI / 180
  );
}

/**
 * Create a ShaderMaterial for distortion post-processing.
 */
export function createDistortionMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: createDistortionUniforms() as unknown as { [uniform: string]: THREE.IUniform },
    vertexShader: distortionVertexShader,
    fragmentShader: distortionFragmentShader,
  });
}
