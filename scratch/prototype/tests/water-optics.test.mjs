import test from 'node:test';
import assert from 'node:assert/strict';
import { WATER, packetProfile, clickSurfaceAt, causticResponse, waterTransmittance, waterFresnel } from '../water-model.mjs';

const approximately = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) < tolerance,
    `${actual} differs from ${expected} by ${Math.abs(actual - expected)}`);

test('packet curvature matches the derivative of its analytic slope, including tapered edges', () => {
    for (const sigma of [WATER.clickSigma, WATER.trailSigma]) {
        const delta = 1e-8;
        for (let i = -245; i <= 245; i++) {
            const d = i / 100 * sigma;
            const derivative = step => (packetProfile(d + step, sigma, WATER.clickWavelength).slope
                - packetProfile(d - step, sigma, WATER.clickWavelength).slope) / (2 * step);
            // The C² taper has a third-derivative jump; cancel O(h) boundary error.
            const numeric = 2 * derivative(delta / 2) - derivative(delta);
            approximately(packetProfile(d, sigma, WATER.clickWavelength).curvature, numeric, .01);
        }
    }
});

test('organic surface gradient and Laplacian match the warped height field', () => {
    const delta = 1e-6;
    for (const age of [.025, .06, .2, .6]) {
        for (let i = 0; i < 16; i++) {
            const angle = i * Math.PI / 8;
            const r = .018 + age * WATER.clickSpeed + .005;
            const x = r * Math.cos(angle), y = r * Math.sin(angle);
            const phase = 1.37;
            const center = clickSurfaceAt(x, y, age, phase);
            const l = clickSurfaceAt(x - delta, y, age, phase).height;
            const rHeight = clickSurfaceAt(x + delta, y, age, phase).height;
            const b = clickSurfaceAt(x, y - delta, age, phase).height;
            const t = clickSurfaceAt(x, y + delta, age, phase).height;
            approximately(center.gradient[0], (rHeight - l) / (2 * delta), 1e-5);
            approximately(center.gradient[1], (t - b) / (2 * delta), 1e-5);
            approximately(center.curvature, (rHeight + l + t + b - 4 * center.height) / (delta * delta), .02);
        }
    }
});

test('the click origin stays finite and expired waves have no optical residue', () => {
    for (const age of [0, .001, .02, .4]) {
        const s = clickSurfaceAt(0, 0, age);
        assert.ok([s.height, ...s.gradient, s.curvature].every(Number.isFinite));
        assert.deepEqual(s.gradient, [0, 0]);
    }
    for (const age of [-1, WATER.clickLife, WATER.clickLife + 1]) {
        assert.deepEqual(clickSurfaceAt(.1, 0, age), { height: 0, gradient: [0, 0], curvature: 0 });
    }
});

test('micro-turbulence breaks radial symmetry with a bounded perturbation', () => {
    const age = .3;
    const r = .018 + WATER.clickSpeed * age;
    const heights = Array.from({ length: 48 }, (_, i) => {
        const angle = i * Math.PI / 24;
        return clickSurfaceAt(r * Math.cos(angle), r * Math.sin(angle), age).height;
    });
    assert.ok(Math.max(...heights) - Math.min(...heights) > 1e-5);
    assert.ok(WATER.warpAmplitude < WATER.clickSigma * .2);
    const maxWarpSpeed = WATER.warpAmplitude * WATER.warpSpeed * (.6 + .4 * .7);
    const passage = 5 * (WATER.clickSigma + WATER.clickSigmaGrowth) / (WATER.clickSpeed - maxWarpSpeed);
    assert.ok(passage < .2);
});

test('signed convergence produces bright crests and soft trough shadows, without flat-water light', () => {
    assert.deepEqual(causticResponse(0), { focus: 0, shadow: 0 });
    assert.ok(causticResponse(-200).focus > 0);
    assert.equal(causticResponse(-200).shadow, 0);
    assert.ok(causticResponse(200).shadow > 0);
    assert.equal(causticResponse(200).focus, 0);
    for (const curvature of [-1e9, -1000, -1, 0, 1, 1000, 1e9]) {
        const response = causticResponse(curvature);
        assert.ok(response.focus >= 0 && response.focus <= 1);
        assert.ok(response.shadow >= 0 && response.shadow <= .6);
    }
});

test('Beer–Lambert transmission is neutral at zero depth and shifts towards Zima cyan with depth', () => {
    assert.deepEqual(waterTransmittance(0), [1, 1, 1]);
    const shallow = waterTransmittance(.05), deep = waterTransmittance(.2);
    assert.ok(deep.every((channel, i) => channel > 0 && channel < shallow[i]));
    assert.ok(deep[0] < deep[1] && deep[1] < deep[2]);
    assert.deepEqual(waterTransmittance(-1), waterTransmittance(0));
    assert.deepEqual(waterTransmittance(1), waterTransmittance(.22));
});

test('water Fresnel reflectance starts near 2% and rises smoothly to grazing incidence', () => {
    approximately(waterFresnel(1), .02037, .0001);
    assert.ok(waterFresnel(.1) > waterFresnel(.5));
    assert.ok(waterFresnel(.5) > waterFresnel(1));
    assert.equal(waterFresnel(0), 1);
});
