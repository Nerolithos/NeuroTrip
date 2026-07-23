import { prescriptionAxisToImageAngle } from './prescriptionAxis.js';
import { computeOpticalApproximation } from './refractionModel.js';
const MIN_SIGMA_PX = 0.35;
const SPHERE_SIGMA_SCALE = 8.4;
const ASTIGMATISM_SCALE = 1.28;
const MAX_MINOR_SIGMA_PX = 7.2;
const MAX_MAJOR_SIGMA_PX = 9.6;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const prescriptionToAstigmaticKernel = (params) => {
    const optics = computeOpticalApproximation(params);
    const pupilGain = clamp((params.pupilDiameterMm - 2) / 6, 0, 1);
    const viewportScale = params.viewportScale ?? 1;
    const cylinderMagnitude = Math.abs(params.cylinderD);
    const sphereSigma = clamp((MIN_SIGMA_PX + optics.defocusStrength * SPHERE_SIGMA_SCALE) * viewportScale, MIN_SIGMA_PX, MAX_MINOR_SIGMA_PX);
    const astigmaticDelta = cylinderMagnitude * ASTIGMATISM_SCALE * (0.88 + pupilGain * 0.22);
    const sigmaMinorPx = clamp(sphereSigma, MIN_SIGMA_PX, MAX_MINOR_SIGMA_PX);
    const sigmaMajorPx = clamp(sigmaMinorPx + (cylinderMagnitude < 1e-4 ? 0 : astigmaticDelta), sigmaMinorPx, MAX_MAJOR_SIGMA_PX);
    return {
        sigmaMajorPx,
        sigmaMinorPx,
        imageAngleRad: prescriptionAxisToImageAngle(params.axisDeg),
        modelNote: 'PERCEPTUAL APPROXIMATION. NOT A PHYSICAL WAVEFRONT RECONSTRUCTION OR CLINICAL DIOPTER-TO-PIXEL CONVERSION.',
    };
};
