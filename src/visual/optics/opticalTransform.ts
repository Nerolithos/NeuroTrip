import { runOpticalTransform as runOpticalPipeline } from './opticalPipeline.js'
import type { RefractionParams } from './refractionModel.js'

export const runOpticalTransform = (
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  params: RefractionParams,
) => {
  return runOpticalPipeline(context, image, width, height, params)
}
