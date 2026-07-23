const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const createImageDataLike = (width, height, data) => {
    if (typeof ImageData !== 'undefined') {
        const safeData = new Uint8ClampedArray(data.length);
        safeData.set(data);
        return new ImageData(safeData, width, height);
    }
    return { data, width, height };
};
export const toImageData = (image) => {
    const safeData = new Uint8ClampedArray(image.data.length);
    safeData.set(image.data);
    return new ImageData(safeData, image.width, image.height);
};
const buildGaussianWeights = (sigmaPx) => {
    if (sigmaPx <= 0.001) {
        return { offsets: [0], weights: [1] };
    }
    const radius = Math.max(1, Math.ceil(sigmaPx * 2));
    const step = sigmaPx > 2.8 ? 2 : 1;
    const offsets = [];
    const weights = [];
    for (let offset = -radius; offset <= radius; offset += step) {
        const weight = Math.exp(-0.5 * (offset * offset) / (sigmaPx * sigmaPx));
        offsets.push(offset);
        weights.push(weight);
    }
    return { offsets, weights };
};
const sampleBilinearRgb = (buffer, width, height, sampleX, sampleY) => {
    const clampedX = clamp(sampleX, 0, width - 1);
    const clampedY = clamp(sampleY, 0, height - 1);
    const x0 = Math.floor(clampedX);
    const y0 = Math.floor(clampedY);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = clampedX - x0;
    const ty = clampedY - y0;
    const i00 = (y0 * width + x0) * 4;
    const i10 = (y0 * width + x1) * 4;
    const i01 = (y1 * width + x0) * 4;
    const i11 = (y1 * width + x1) * 4;
    const output = [0, 0, 0];
    for (let channel = 0; channel < 3; channel += 1) {
        const c00 = buffer[i00 + channel] ?? 0;
        const c10 = buffer[i10 + channel] ?? 0;
        const c01 = buffer[i01 + channel] ?? 0;
        const c11 = buffer[i11 + channel] ?? 0;
        const top = c00 + (c10 - c00) * tx;
        const bottom = c01 + (c11 - c01) * tx;
        output[channel] = top + (bottom - top) * ty;
    }
    return output;
};
const blurPass = (source, width, height, directionX, directionY, sigmaPx) => {
    const { offsets, weights } = buildGaussianWeights(sigmaPx);
    const output = new Float32Array(source.length);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            let r = 0;
            let g = 0;
            let b = 0;
            let sum = 0;
            for (let index = 0; index < weights.length; index += 1) {
                const offset = offsets[index] ?? 0;
                const weight = weights[index] ?? 0;
                const sample = sampleBilinearRgb(source, width, height, x + directionX * offset, y + directionY * offset);
                r += sample[0] * weight;
                g += sample[1] * weight;
                b += sample[2] * weight;
                sum += weight;
            }
            const targetIndex = (y * width + x) * 4;
            const invSum = sum > 0 ? 1 / sum : 1;
            output[targetIndex] = r * invSum;
            output[targetIndex + 1] = g * invSum;
            output[targetIndex + 2] = b * invSum;
            output[targetIndex + 3] = 255;
        }
    }
    return output;
};
export const applyAnisotropicBlur = (source, kernel) => {
    const { width, height } = source;
    const input = new Float32Array(source.data.length);
    for (let index = 0; index < source.data.length; index += 1) {
        input[index] = source.data[index] ?? 0;
    }
    const theta = kernel.imageAngleRad;
    const majorDirX = Math.cos(theta);
    const majorDirY = Math.sin(theta);
    const minorDirX = -Math.sin(theta);
    const minorDirY = Math.cos(theta);
    const majorPass = blurPass(input, width, height, majorDirX, majorDirY, kernel.sigmaMajorPx);
    const minorPass = blurPass(majorPass, width, height, minorDirX, minorDirY, kernel.sigmaMinorPx);
    const output = new Uint8ClampedArray(source.data.length);
    for (let index = 0; index < output.length; index += 4) {
        output[index] = Math.round(clamp(minorPass[index] ?? 0, 0, 255));
        output[index + 1] = Math.round(clamp(minorPass[index + 1] ?? 0, 0, 255));
        output[index + 2] = Math.round(clamp(minorPass[index + 2] ?? 0, 0, 255));
        output[index + 3] = 255;
    }
    return createImageDataLike(width, height, output);
};
