import { runOpticalTransform as runOpticalPipeline } from './opticalPipeline.js';
export const runOpticalTransform = (context, image, width, height, params) => {
    return runOpticalPipeline(context, image, width, height, params);
};
