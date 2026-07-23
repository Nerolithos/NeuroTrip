import { applyAnisotropicBlur, toImageData } from './anisotropicBlur.js'
import type { AstigmaticKernel } from './astigmatismModel.js'
import { prescriptionAxisToImageAngle } from './prescriptionAxis.js'
import type { OpticalApproximation } from './refractionModel.js'

export const applyAstigmaticBlur = (
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  optics: OpticalApproximation,
) => {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.filter = 'none'
  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const source = context.getImageData(0, 0, width, height)
  const sphereSigma = 0.35 + optics.defocusStrength * 8.4
  const sigmaMinorPx = Math.max(0.35, sphereSigma)
  const sigmaMajorPx = Math.max(sigmaMinorPx, sphereSigma + optics.anisotropyStrength * 8)

  const kernel: AstigmaticKernel = {
    sigmaMajorPx,
    sigmaMinorPx,
    imageAngleRad: prescriptionAxisToImageAngle((optics.axisRad * 180) / Math.PI),
    modelNote:
      'PERCEPTUAL APPROXIMATION. NOT A PHYSICAL WAVEFRONT RECONSTRUCTION OR CLINICAL DIOPTER-TO-PIXEL CONVERSION.',
  }

  const output = applyAnisotropicBlur(source, kernel)
  context.putImageData(
    typeof ImageData !== 'undefined' && output instanceof ImageData ? output : toImageData(output),
    0,
    0,
  )
}
