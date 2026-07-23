import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAnisotropicBlur } from '../../src/visual/optics/anisotropicBlur.js';
import { prescriptionToAstigmaticKernel } from '../../src/visual/optics/astigmatismModel.js';
import { axisAnglesEquivalent, prescriptionAxisToImageAngle, } from '../../src/visual/optics/prescriptionAxis.js';
const angleDiffModuloPi = (left, right) => {
    const period = Math.PI;
    const normalizedLeft = ((left % period) + period) % period;
    const normalizedRight = ((right % period) + period) % period;
    const delta = Math.abs(normalizedLeft - normalizedRight);
    return Math.min(delta, period - delta);
};
const createSyntheticImage = (width, height) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            data[index] = (x * 11 + y * 3) % 255;
            data[index + 1] = (x * 5 + y * 13) % 255;
            data[index + 2] = (x * 9 + y * 7) % 255;
            data[index + 3] = 255;
        }
    }
    return { data, width, height };
};
test('axis 0 and 180 degrees are equivalent', () => {
    const a0 = prescriptionAxisToImageAngle(0);
    const a180 = prescriptionAxisToImageAngle(180);
    assert.equal(axisAnglesEquivalent(a0, a180), true);
});
test('axis 90 differs from axis 0 by about quarter turn', () => {
    const a0 = prescriptionAxisToImageAngle(0);
    const a90 = prescriptionAxisToImageAngle(90);
    const delta = angleDiffModuloPi(a0, a90);
    assert.ok(Math.abs(delta - Math.PI / 2) < 1e-8);
});
test('kernel sigmas remain positive', () => {
    const kernel = prescriptionToAstigmaticKernel({
        sphereD: -6,
        cylinderD: -4,
        axisDeg: 33,
        objectDistanceM: 0.4,
        pupilDiameterMm: 7,
        viewportScale: 1,
    });
    assert.ok(kernel.sigmaMajorPx > 0);
    assert.ok(kernel.sigmaMinorPx > 0);
    assert.ok(kernel.sigmaMajorPx >= kernel.sigmaMinorPx);
});
test('cylinder 0 keeps output axis-invariant', () => {
    const source = createSyntheticImage(48, 48);
    const kernelAxis0 = prescriptionToAstigmaticKernel({
        sphereD: -2,
        cylinderD: 0,
        axisDeg: 0,
        objectDistanceM: 1,
        pupilDiameterMm: 4,
    });
    const kernelAxis90 = prescriptionToAstigmaticKernel({
        sphereD: -2,
        cylinderD: 0,
        axisDeg: 90,
        objectDistanceM: 1,
        pupilDiameterMm: 4,
    });
    assert.ok(Math.abs(kernelAxis0.sigmaMajorPx - kernelAxis90.sigmaMajorPx) < 1e-9);
    assert.ok(Math.abs(kernelAxis0.sigmaMinorPx - kernelAxis90.sigmaMinorPx) < 1e-9);
    const blurred0 = applyAnisotropicBlur(source, kernelAxis0);
    const blurred90 = applyAnisotropicBlur(source, kernelAxis90);
    assert.deepEqual(Array.from(blurred0.data), Array.from(blurred90.data));
});
test('anisotropic blur preserves dimensions and full alpha', () => {
    const source = createSyntheticImage(64, 40);
    const kernel = prescriptionToAstigmaticKernel({
        sphereD: -1.5,
        cylinderD: -2,
        axisDeg: 45,
        objectDistanceM: 2,
        pupilDiameterMm: 5,
    });
    const output = applyAnisotropicBlur(source, kernel);
    assert.equal(output.width, source.width);
    assert.equal(output.height, source.height);
    for (let index = 3; index < output.data.length; index += 4) {
        assert.equal(output.data[index], 255);
    }
});
