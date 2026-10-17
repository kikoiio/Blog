import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as model from '../water-model.mjs';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8')
    .replace(/^import .*?;\s*/, '')
    .replace(/\}\)\(\);\s*$/, `
        globalThis.inspect = () => ({ drops: drops.length, trails: trails.map(p => ({...p})),
            impulses: impulses.length, floatMode, available, energy, frame });
    })();`);

function environment({ float = true, reduced = false, supported = true } = {}) {
    let now = 100, nextFrame = 0;
    const frames = new Map();
    function emitter(object = {}) {
        return Object.assign(object, {
            listeners: new Map(),
            addEventListener(type, listener) {
                if (!this.listeners.has(type)) this.listeners.set(type, []);
                this.listeners.get(type).push(listener);
            },
            dispatchEvent(event) {
                for (const listener of this.listeners.get(event.type) ?? []) listener(event);
            },
        });
    }
    function element(dataset = {}) {
        return emitter({ dataset, style: {}, textContent: '', firstElementChild: { textContent: '' },
            classList: { contains: () => false }, clientWidth: 800, clientHeight: 400,
            offsetWidth: 100, offsetHeight: 70, closest: () => null,
            getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 400, width: 800, height: 400 }),
            setAttribute() {}, setPointerCapture() {}, animate: () => ({ cancel() {} }),
        });
    }
    const gl = new Proxy({
        getShaderParameter: () => true,
        getProgramParameter: (_, key) => key === 'ACTIVE_UNIFORMS' ? 0 : true,
        getAttribLocation: () => 0, getExtension: () => float,
        checkFramebufferStatus: () => 'FRAMEBUFFER_COMPLETE',
        readPixels: (...args) => { args.at(-1)[0] = 0; },
    }, { get: (object, key) => object[key] ?? (/^[A-Z0-9_]+$/.test(key) ? key : () => ({})) });
    const canvas = element();
    canvas.getContext = () => supported ? gl : null;
    const context = new Proxy({}, { get: () => () => {}, set: () => true });
    const nodes = [element({ x: '.3', y: '.4' })];
    const elements = { '#webgl-canvas': canvas, '#engine-status': element(), '#graph': element(),
        '#theme-toggle': element(), '#motion-glow': element(), '#graph-links path': element(),
        '#ripple-button': element(), '.hero': element() };
    const motion = emitter({ matches: reduced }), coarse = emitter({ matches: false });
    const document = emitter({ hidden: false, documentElement: element({ theme: 'light' }),
        querySelector: selector => elements[selector],
        querySelectorAll: selector => selector === '.node' ? nodes : [],
        createElement: () => ({ getContext: () => context }),
    });
    const window = emitter();
    let collapsed = true;
    const sandbox = { ...model, window, document, innerWidth: 1200, innerHeight: 800, scrollY: 0, devicePixelRatio: 2,
        performance: { now: () => now },
        matchMedia: query => query.includes('reduced') ? motion : query.includes('coarse') ? coarse : { matches: false },
        getComputedStyle: () => ({ getPropertyValue: () => '#ebeff2' }),
        getSelection: () => ({ isCollapsed: collapsed }),
        requestAnimationFrame: callback => (frames.set(++nextFrame, callback), nextFrame),
        cancelAnimationFrame: id => frames.delete(id),
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
        console, Float32Array, Uint8Array,
    };
    vm.runInNewContext(source, sandbox);
    return { ...sandbox, elements, frames, motion,
        move(x, y, ms = 16, buttons = 0, target = element()) {
            now += ms;
            window.dispatchEvent({ type: 'pointermove', isPrimary: true, pointerId: 1,
                clientX: x, clientY: y, buttons, target });
        },
        select(value) { collapsed = !value; document.dispatchEvent({ type: 'selectionchange' }); },
        advance(ms) {
            const end = now + ms;
            while (now < end) {
                now += 1000 / 60;
                const pending = [...frames.values()]; frames.clear();
                pending.forEach(callback => callback(now));
            }
        },
    };
}

for (const float of [true, false]) {
    test(`passive hover wakes and fully sleeps (${float ? 'float' : 'analytical'} path)`, () => {
        const env = environment({ float });
        assert.equal(env.frames.size, 0);
        env.move(10, 20);
        env.move(12, 20, 60);
        assert.ok(env.inspect().trails.length > 0);
        assert.equal(env.inspect().drops, 0);
        assert.equal(env.frames.size, 1);
        env.advance(1700);
        assert.equal(env.frames.size, 0);
        assert.equal(env.inspect().energy, 0);
        assert.equal(env.elements['#webgl-canvas'].style.visibility, 'hidden');
    });
}

test('first contact creates no line from a stale origin; fast hover stays continuous', () => {
    const env = environment();
    env.move(100, 100); assert.equal(env.inspect().trails.length, 0);
    env.move(1100, 500);
    const trails = env.inspect().trails;
    assert.ok(trails.length <= model.WATER.maxTrails);
    assert.equal(trails[0].startX, 100 / 1200);
    assert.equal(trails.at(-1).x, 1100 / 1200);
    for (let i = 1; i < trails.length; i++) assert.equal(trails[i].startX, trails[i - 1].x);
});

test('hover works over reading text until the user starts selecting', () => {
    const env = environment();
    const paragraph = { closest: selector => selector === '[data-reading]' ? {} : null };
    env.move(100, 100, 16, 0, paragraph); env.move(110, 100, 16, 0, paragraph);
    assert.ok(env.inspect().trails.length > 0);
    const count = env.inspect().trails.length;
    env.select(true); env.move(500, 100, 16, 1, paragraph);
    assert.equal(env.inspect().trails.length, count);
});

test('click shockwaves remain separate and stronger than hover', () => {
    const env = environment();
    env.move(100, 100); env.move(200, 100);
    assert.equal(env.inspect().drops, 0);
    env.window.dispatchEvent({ type: 'pointerdown', isPrimary: true, button: 0, pointerId: 1,
        clientX: 200, clientY: 100, target: { closest: () => null } });
    assert.equal(env.inspect().drops, 1);
    env.advance(1700); assert.equal(env.frames.size, 0);
});

test('leaving the page does not connect the next entry to the previous stroke', () => {
    const env = environment();
    env.move(100, 100); env.move(200, 100);
    env.document.documentElement.dispatchEvent({ type: 'pointerleave' });
    env.move(1000, 600);
    assert.ok(env.inspect().trails.every(p => p.x <= 200 / 1200));
});

test('motion preference and backgrounding stop rendering', () => {
    const env = environment(); env.move(100, 100); env.move(200, 100);
    env.document.hidden = true; env.document.dispatchEvent({ type: 'visibilitychange' });
    assert.equal(env.frames.size, 0);
    env.document.hidden = false; env.document.dispatchEvent({ type: 'visibilitychange' });
    env.motion.matches = true; env.motion.dispatchEvent({ type: 'change' });
    env.move(100, 100); env.move(200, 100); assert.equal(env.frames.size, 0);
});

test('no WebGL retains controls without starting an animation loop', () => {
    const env = environment({ supported: false });
    env.elements['#theme-toggle'].dispatchEvent({ type: 'click' });
    assert.equal(env.document.documentElement.dataset.theme, 'dark');
    env.move(100, 100); env.move(200, 100); assert.equal(env.frames.size, 0);
});
