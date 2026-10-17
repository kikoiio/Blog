import test from 'node:test';
import assert from 'node:assert/strict';
import { WATER, glideSegments, appendTrail, packetProfile } from '../water-model.mjs';

const point = (x, y, time) => ({ x, y, time });

test('slow hover generates a wake with no pressed state', () => {
    const segments = glideSegments(point(10, 20, 0), point(12, 20, 60));
    assert.ok(segments.length > 0);
    assert.ok(segments[0].strength > 0);
    assert.ok(segments[0].strength < WATER.clickStrength * .15);
});

test('subpixel movement produces a proportionally small wake', () => {
    const tiny = glideSegments(point(10, 20, 0), point(10.1, 20, 16));
    const normal = glideSegments(point(10, 20, 0), point(14, 20, 16));
    assert.equal(tiny.length, 1);
    assert.ok(tiny[0].strength > 0 && tiny[0].strength < normal[0].strength);
});

test('normal and fast hover amplitudes stay at 15–20% of a click', () => {
    for (const distance of [4, 20, 200, 1500]) {
        const segment = glideSegments(point(0, 0, 0), point(distance, 0, 16))[0];
        assert.ok(segment.strength >= WATER.clickStrength * .15);
        assert.ok(segment.strength <= WATER.clickStrength * .20);
    }
});

test('fast movement covers its entire path with bounded contiguous segments', () => {
    const segments = glideSegments(point(0, 10, 0), point(1500, 610, 16));
    assert.equal(segments.length, WATER.maxSegments);
    assert.equal(segments[0].startX, 0);
    assert.equal(segments[0].startY, 10);
    assert.equal(segments.at(-1).x, 1500);
    assert.equal(segments.at(-1).y, 610);
    for (let i = 1; i < segments.length; i++) {
        assert.equal(segments[i].startX, segments[i - 1].x);
        assert.equal(segments[i].startY, segments[i - 1].y);
    }
});

test('pressed movement remains distinct from passive hover', () => {
    const from = point(0, 0, 0), to = point(40, 10, 16);
    const hover = glideSegments(from, to)[0], pressed = glideSegments(from, to, true)[0];
    assert.ok(pressed.strength > hover.strength);
    assert.ok(pressed.radius > hover.radius);
    assert.ok(pressed.strength < WATER.clickStrength);
});

test('pauses, stationary samples and malformed inputs do not create stale lines', () => {
    const from = point(0, 0, 0);
    for (const to of [point(100, 0, 150), point(0, 0, 16), point(50, 0, 0), point(NaN, 0, 16)]) {
        assert.deepEqual(glideSegments(from, to), []);
    }
    assert.deepEqual(glideSegments(null, point(10, 0, 16)), []);
});

test('queue compaction preserves coverage instead of dropping the beginning of a fast stroke', () => {
    const queue = [];
    for (let i = 0; i < 40; i++) {
        appendTrail(queue, { startX: i / 40, startY: 0, x: (i + 1) / 40, y: 0,
            time: (i + 1) * 2, duration: .002, strength: .06, stroke: 1 });
    }
    assert.equal(queue.length, WATER.maxTrails);
    assert.equal(queue[0].startX, 0);
    assert.equal(queue.at(-1).x, 1);
    for (let i = 1; i < queue.length; i++) assert.equal(queue[i].startX, queue[i - 1].x);
    assert.ok(Math.abs(queue.reduce((sum, p) => sum + p.duration, 0) - .08) < 1e-9);
});

test('queue compaction never joins separate gestures', () => {
    const queue = [];
    for (let i = 0; i < 20; i++) {
        appendTrail(queue, { startX: i, startY: 0, x: i + .5, y: 0,
            time: i * 16, duration: .016, strength: .06, stroke: i });
    }
    assert.equal(queue.length, WATER.maxTrails);
    assert.ok(queue.every(p => p.x - p.startX === .5));
});

test('wave packet has a main crest and smaller rebound crests', () => {
    const main = packetProfile(0, WATER.clickSigma, WATER.clickWavelength).height;
    const rebound = packetProfile(WATER.clickWavelength, WATER.clickSigma, WATER.clickWavelength).height;
    const trough = packetProfile(WATER.clickWavelength / 2, WATER.clickSigma, WATER.clickWavelength).height;
    assert.equal(main, 1);
    assert.ok(rebound > 0 && rebound < main * .2);
    assert.ok(trough < 0);
});

test('wave height and slope are exactly zero outside the compact packet', () => {
    for (const sigma of [WATER.clickSigma, WATER.trailSigma]) {
        for (const direction of [-1, 1]) {
            assert.deepEqual(packetProfile(direction * 2.5 * sigma, sigma, WATER.clickWavelength), { height: 0, slope: 0, curvature: 0 });
            assert.deepEqual(packetProfile(direction, sigma, WATER.clickWavelength), { height: 0, slope: 0, curvature: 0 });
        }
    }
});

test('analytic normal matches the derivative, including tapered packet edges', () => {
    const sigma = WATER.clickSigma;
    const delta = 1e-7;
    for (let i = -245; i <= 245; i++) {
        const d = i / 100 * sigma;
        const sample = packetProfile(d, sigma, WATER.clickWavelength);
        const numeric = (packetProfile(d + delta, sigma, WATER.clickWavelength).height
            - packetProfile(d - delta, sigma, WATER.clickWavelength).height) / (2 * delta);
        assert.ok(Math.abs(sample.slope - numeric) < 1e-4);
    }
});

test('a passing click or hover front clears a reading point within 0.2 seconds', () => {
    const clickPassage = 5 * (WATER.clickSigma + WATER.clickSigmaGrowth) / WATER.clickSpeed;
    const hoverPassage = 5 * WATER.trailSigma / WATER.trailSpeed;
    assert.ok(clickPassage < .2);
    assert.ok(hoverPassage < .2);
    const oldBandwidth = 2 * .065;
    const reduction = 1 - 5 * WATER.clickSigma / oldBandwidth;
    assert.ok(reduction >= .6 && reduction <= .7);
});
