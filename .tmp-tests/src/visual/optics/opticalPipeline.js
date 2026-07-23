import { applyAnisotropicBlur, toImageData } from './anisotropicBlur.js';
import { prescriptionToAstigmaticKernel } from './astigmatismModel.js';
import { computeOpticalApproximation } from './refractionModel.js';
export const runOpticalTransform = (context, image, width, height, params) => {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const sourceData = context.getImageData(0, 0, width, height);
    const optics = computeOpticalApproximation(params);
    const kernel = prescriptionToAstigmaticKernel({ ...params, viewportScale: 1 });
    const blurred = applyAnisotropicBlur(sourceData, kernel);
    context.putImageData(typeof ImageData !== 'undefined' && blurred instanceof ImageData ? blurred : toImageData(blurred), 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.filter = 'none';
    return {
        ...optics,
        kernel,
    };
};
