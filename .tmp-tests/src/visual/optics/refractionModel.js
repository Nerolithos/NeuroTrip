const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const computeOpticalApproximation = (params) => {
    const sphereMagnitude = Math.abs(params.sphereD);
    const normalizedCylinder = clamp(Math.abs(params.cylinderD) / 6, 0, 1);
    const objectDistance = Math.max(params.objectDistanceM, 0.1);
    const demandD = 1 / objectDistance;
    const pupilGain = clamp((params.pupilDiameterMm - 2) / 6, 0, 1);
    let focusMismatchD = 0;
    let refractiveRegime = 'emmetropia';
    if (params.sphereD < 0) {
        // Myopia: best focus near far-point; blur grows when target demand diverges from |sphere|.
        refractiveRegime = 'myopia';
        focusMismatchD = Math.abs(demandD - sphereMagnitude);
    }
    else if (params.sphereD > 0) {
        // Hyperopia: object demand + latent hyperopic demand can exceed accommodation reserve.
        refractiveRegime = 'hyperopia';
        const accommodationReserveD = 1.8 + (1 - pupilGain) * 0.35;
        const requiredAccommodationD = demandD + params.sphereD;
        focusMismatchD = Math.max(0, requiredAccommodationD - accommodationReserveD);
    }
    focusMismatchD *= 0.88 + pupilGain * 0.24;
    const normalizedMismatch = clamp(focusMismatchD / 6, 0, 1);
    const defocusStrength = clamp(normalizedMismatch * (0.82 + 0.14 * pupilGain) + normalizedCylinder * 0.08, 0, 1);
    const anisotropyStrength = clamp(normalizedCylinder * (0.58 + pupilGain * 0.25), 0, 1);
    const axisRad = (clamp(params.axisDeg, 0, 180) * Math.PI) / 180;
    return {
        defocusStrength,
        anisotropyStrength,
        axisRad,
        focusMismatchD,
        refractiveRegime,
        modelNote: 'Perceptual educational approximation: diopter controls are mapped to screen-space blur and anisotropy, not clinical retinal image formation.',
    };
};
