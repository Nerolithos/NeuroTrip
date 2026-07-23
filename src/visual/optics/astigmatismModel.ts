import { prescriptionAxisToImageAngle } from './prescriptionAxis.js'
import { computeOpticalApproximation, type RefractionParams } from './refractionModel.js'

const MIN_SIGMA_PX = 0.35
const SPHERE_SIGMA_SCALE = 8.4
const ASTIGMATISM_SCALE = 1.28

type KernelParams = RefractionParams & {
  viewportScale?: number
}

export type AstigmaticKernel = {
  sigmaMajorPx: number
  sigmaMinorPx: number
  imageAngleRad: number
  modelNote: string
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const prescriptionToAstigmaticKernel = (params: KernelParams): AstigmaticKernel => {
  const optics = computeOpticalApproximation(params)
  const pupilGain = clamp((params.pupilDiameterMm - 2) / 6, 0, 1)
  const viewportScale = params.viewportScale ?? 1

  const sphereSigma = (MIN_SIGMA_PX + optics.defocusStrength * SPHERE_SIGMA_SCALE) * viewportScale
  const astigmaticDelta = Math.abs(params.cylinderD) * ASTIGMATISM_SCALE * (0.88 + pupilGain * 0.22)

  const sigmaMinorPx = Math.max(MIN_SIGMA_PX, sphereSigma)
  const sigmaMajorPx = Math.max(
    sigmaMinorPx,
    sphereSigma + (Math.abs(params.cylinderD) < 1e-4 ? 0 : astigmaticDelta),
  )

  return {
    sigmaMajorPx,
    sigmaMinorPx,
    imageAngleRad: prescriptionAxisToImageAngle(params.axisDeg),
    modelNote:
      'PERCEPTUAL APPROXIMATION. NOT A PHYSICAL WAVEFRONT RECONSTRUCTION OR CLINICAL DIOPTER-TO-PIXEL CONVERSION.',
  }
}
