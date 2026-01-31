/**
 * Lens distortion utilities.
 * 
 * Provides functions for estimating lens distortion parameters from FOV,
 * creating default distortion configurations, and distortion-related helpers.
 */

import type { CameraDistortion, DistortionModel, PrincipalPoint } from '../types/sensors';

/**
 * Default principal point (image center).
 */
export const DEFAULT_PRINCIPAL_POINT: PrincipalPoint = {
  cx: 0.5,
  cy: 0.5,
};

/**
 * Default distortion (no distortion).
 */
export const ZERO_DISTORTION: CameraDistortion = {
  model: 'brown-conrady',
  k1: 0,
  k2: 0,
  k3: 0,
  p1: 0,
  p2: 0,
};

/**
 * Determine the appropriate distortion model based on FOV.
 * Fisheye model is used for very wide FOV (>= 140°).
 * 
 * @param hFov Horizontal FOV in degrees
 * @returns The recommended distortion model
 */
export function getDistortionModelForFOV(hFov: number): DistortionModel {
  return hFov >= 140 ? 'fisheye-equidistant' : 'brown-conrady';
}

/**
 * Estimate lens distortion parameters from horizontal FOV.
 * 
 * This uses empirical relationships derived from typical lens designs:
 * - Narrow FOV (<60°): Negligible distortion
 * - Normal FOV (60-80°): Very slight barrel distortion
 * - Wide FOV (80-120°): Moderate barrel distortion
 * - Ultra-wide FOV (120-140°): Significant barrel distortion
 * - Fisheye (>140°): Uses fisheye projection model
 * 
 * The k1 coefficient is the primary distortion factor:
 * - Negative k1 = barrel distortion (center appears stretched)
 * - Positive k1 = pincushion distortion (center appears compressed)
 * 
 * @param hFov Horizontal FOV in degrees
 * @returns Estimated distortion parameters
 */
export function estimateDistortionFromFOV(hFov: number): CameraDistortion {
  const model = getDistortionModelForFOV(hFov);
  
  // For fisheye lenses, distortion is inherent to the projection model
  // k1/k2 can still fine-tune but the main effect is the fisheye projection
  if (model === 'fisheye-equidistant') {
    // Fisheye: mild additional radial correction
    const k1 = -0.02 - 0.05 * Math.max(0, (hFov - 140) / 40);
    return {
      model,
      k1: Math.round(k1 * 1000) / 1000,
      k2: 0,
      k3: 0,
      p1: 0,
      p2: 0,
    };
  }
  
  // Brown-Conrady model for standard lenses
  // Based on empirical observations of real lenses
  let k1 = 0;
  let k2 = 0;
  
  if (hFov <= 50) {
    // Narrow FOV: telephoto, minimal distortion
    k1 = 0;
  } else if (hFov <= 70) {
    // Normal FOV: slight barrel distortion
    k1 = -0.02 * ((hFov - 50) / 20);
  } else if (hFov <= 90) {
    // Moderate wide-angle: increasing barrel distortion
    k1 = -0.02 - 0.08 * ((hFov - 70) / 20);
  } else if (hFov <= 120) {
    // Wide-angle: significant barrel distortion
    k1 = -0.10 - 0.15 * ((hFov - 90) / 30);
    k2 = 0.02 + 0.03 * ((hFov - 90) / 30); // Correction term
  } else {
    // Ultra wide-angle (120-140°): strong barrel distortion
    k1 = -0.25 - 0.10 * ((hFov - 120) / 20);
    k2 = 0.05 + 0.03 * ((hFov - 120) / 20);
  }
  
  // Round to 3 decimal places for cleaner UI
  return {
    model,
    k1: Math.round(k1 * 1000) / 1000,
    k2: Math.round(k2 * 1000) / 1000,
    k3: 0,
    p1: 0,
    p2: 0,
  };
}

/**
 * Create default distortion parameters for a camera with given FOV.
 * This is used when creating new cameras with distortion enabled by default.
 * 
 * @param hFov Horizontal FOV in degrees
 * @returns Distortion parameters estimated from FOV
 */
export function createDefaultDistortion(hFov: number): CameraDistortion {
  return estimateDistortionFromFOV(hFov);
}

/**
 * Get a human-readable description of what a distortion parameter does.
 * Used for tooltips in the UI.
 */
export const DISTORTION_TOOLTIPS: Record<string, string> = {
  k1: `Primary radial distortion (barrel/pincushion).
• Negative values create barrel distortion - the image bulges outward like looking through a door peephole
• Positive values create pincushion distortion - the image pinches inward
• This is the strongest distortion effect and most common in wide-angle lenses
• Typical range: -0.4 (extreme wide-angle) to +0.1 (telephoto)`,

  k2: `Secondary radial distortion correction.
• Fine-tunes the distortion curve, especially at image edges
• Usually smaller magnitude than k1
• Helps correct for complex lens designs
• Typical range: -0.2 to +0.2`,

  k3: `Tertiary radial distortion correction.
• Only needed for extreme precision calibration
• Usually zero for most applications
• Affects the very corners of the image
• Typical range: -0.1 to +0.1`,

  p1: `First tangential distortion coefficient.
• Caused by lens elements not being perfectly parallel to the sensor
• Creates a skewing effect in the horizontal direction
• Usually very small in well-manufactured lenses
• Typical range: -0.01 to +0.01`,

  p2: `Second tangential distortion coefficient.
• Caused by lens elements not being perfectly parallel to the sensor
• Creates a skewing effect in the vertical direction
• Usually very small in well-manufactured lenses
• Typical range: -0.01 to +0.01`,

  model: `Distortion model type.
• Brown-Conrady: Standard polynomial model, good for most lenses up to ~140° FOV
• Fisheye Equidistant: Uses r = f·θ projection, better for ultra-wide fisheye lenses (>140° FOV)`,

  showDistortion: `Toggle distorted vs calibrated view.
• Distorted: Shows raw sensor output with lens distortion (what the sensor actually captures)
• Calibrated: Shows undistorted image (what perception algorithms typically work with after calibration)`,
};

/**
 * Ranges for distortion parameter sliders in the UI.
 */
export const DISTORTION_RANGES: Record<string, { min: number; max: number; step: number }> = {
  k1: { min: -0.5, max: 0.2, step: 0.01 },
  k2: { min: -0.3, max: 0.3, step: 0.01 },
  k3: { min: -0.1, max: 0.1, step: 0.005 },
  p1: { min: -0.02, max: 0.02, step: 0.001 },
  p2: { min: -0.02, max: 0.02, step: 0.001 },
};

/**
 * Check if distortion parameters are effectively zero (no visible distortion).
 */
export function isZeroDistortion(distortion: CameraDistortion): boolean {
  const threshold = 0.001;
  return (
    Math.abs(distortion.k1) < threshold &&
    Math.abs(distortion.k2) < threshold &&
    Math.abs(distortion.k3) < threshold &&
    Math.abs(distortion.p1) < threshold &&
    Math.abs(distortion.p2) < threshold
  );
}

/**
 * Known distortion values for specific camera models.
 * These are approximations based on typical values from calibration data.
 */
export const KNOWN_CAMERA_DISTORTIONS: Record<string, CameraDistortion> = {
  // Intel RealSense D435i - calibrated depth camera, low distortion
  'realsense-d435i-depth': {
    model: 'brown-conrady',
    k1: -0.056,
    k2: 0.062,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  'realsense-d435i-rgb': {
    model: 'brown-conrady',
    k1: -0.035,
    k2: 0.012,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // ZED 2i - wide stereo camera
  'zed-2i': {
    model: 'brown-conrady',
    k1: -0.12,
    k2: 0.04,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // Orbbec Femto Mega - 120° ToF sensor
  'orbbec-femto-mega': {
    model: 'brown-conrady',
    k1: -0.18,
    k2: 0.05,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // Luxonis OAK-D Pro Wide - 127° stereo
  'oak-d-pro-wide': {
    model: 'brown-conrady',
    k1: -0.22,
    k2: 0.06,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // Leopard Imaging automotive camera
  'li-imx390-gmsl2': {
    model: 'brown-conrady',
    k1: -0.18,
    k2: 0.05,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // DJI Zenmuse H20 Wide - drone camera, moderate FOV
  'zenmuse-h20-wide': {
    model: 'brown-conrady',
    k1: -0.025,
    k2: 0.005,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // Logitech C920 - typical webcam
  'logitech-c920': {
    model: 'brown-conrady',
    k1: -0.04,
    k2: 0.01,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // Raspberry Pi Camera V2 - narrow FOV
  'raspberry-pi-cam-v2': {
    model: 'brown-conrady',
    k1: -0.015,
    k2: 0,
    k3: 0,
    p1: 0,
    p2: 0,
  },
  // Generic fisheye 180°
  'fisheye-180': {
    model: 'fisheye-equidistant',
    k1: -0.03,
    k2: 0,
    k3: 0,
    p1: 0,
    p2: 0,
  },
};

/**
 * Get distortion parameters for a known camera preset.
 * Falls back to FOV-based estimation if not in the known list.
 * 
 * @param presetId Camera preset identifier
 * @param hFov Horizontal FOV (used for fallback estimation)
 * @returns Distortion parameters
 */
export function getDistortionForPreset(presetId: string, hFov: number): CameraDistortion {
  const known = KNOWN_CAMERA_DISTORTIONS[presetId];
  if (known) {
    return { ...known };
  }
  return estimateDistortionFromFOV(hFov);
}
