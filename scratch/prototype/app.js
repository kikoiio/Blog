import { WATER, glideSegments, appendTrail, packetGLSL, opticsGLSL } from './water-model.mjs';

(() => {
    'use strict';

    const canvas = document.querySelector('#webgl-canvas');
    const status = document.querySelector('#engine-status');
    const root = document.documentElement;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)');
    const scene = document.createElement('canvas');
    const ctx = scene.getContext('2d');
    const graph = document.querySelector('#graph');
    const nodes = [...document.querySelectorAll('.node')];
    const themeButton = document.querySelector('#theme-toggle');
    const glow = document.querySelector('#motion-glow');
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const MAX_DROPS = WATER.maxDrops;
    const MAX_TRAILS = WATER.maxTrails;
    const LIFE = WATER.clickLife;
    let width = innerWidth, height = innerHeight, pixelRatio = 1;
    let frame = 0, lastFrame = 0, accumulator = 0;
    let dirty = true, layoutDirty = true, selecting = false, drag = null;
    let theme = 0, themeTarget = 0;
    let energy = 0, lastInput = 0, scrollImpulse = 0;
    let drops = [], trails = [], impulses = [], textCache = new Map();
    let stroke = 0;
    let hidden = document.hidden;
    let glowAnimation;

    function setStatus(text) {
        if (status.textContent !== text) {
            status.textContent = text;
            textCache.delete(status);
            dirty = true;
        }
    }

    // DOM remains the interactive, selectable source. Only this small gallery's
    // explicit paint primitives are mirrored; this is not a generic DOM capture.
    function textRuns(element) {
        if (textCache.has(element)) return textCache.get(element);
        const origin = element.getBoundingClientRect();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const runs = [];
        let node;
        while ((node = walker.nextNode())) {
            const style = getComputedStyle(node.parentElement);
            if (style.display === 'none') continue;
            const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            const range = document.createRange();
            let line = null;
            for (let i = 0; i < node.length; i++) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const rect = range.getBoundingClientRect();
                if (!rect.height || (!rect.width && /\s/.test(node.data[i]))) continue;
                if (!line || Math.abs(line.top - rect.top) > 2) {
                    line = { top: rect.top, x: rect.left - origin.left, y: rect.top - origin.top,
                        text: '', font, color: style.color, spacing: style.letterSpacing };
                    runs.push(line);
                }
                line.text += node.data[i];
            }
        }
        textCache.set(element, runs);
        return runs;
    }

    function paintSurface(element, rect) {
        const style = getComputedStyle(element);
        const radius = style.borderTopLeftRadius.includes('%')
            ? Math.min(rect.width, rect.height) / 2 : parseFloat(style.borderTopLeftRadius);
        ctx.save();
        ctx.beginPath();
        if (element.classList.contains('node')) {
            ctx.ellipse(rect.left + rect.width / 2, rect.top + rect.height / 2,
                rect.width / 2, rect.height / 2, 0, 0, Math.PI * 2);
            ctx.shadowColor = '#07121e26';
            ctx.shadowBlur = 32;
            ctx.shadowOffsetY = 20;
        } else {
            ctx.roundRect(rect.left, rect.top, rect.width, rect.height, radius || 0);
        }
        ctx.fillStyle = style.backgroundColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        if (parseFloat(style.borderTopWidth)) {
            ctx.strokeStyle = style.borderTopColor;
            ctx.lineWidth = parseFloat(style.borderTopWidth);
            ctx.stroke();
        }
        if (element.classList.contains('node')) {
            ctx.clip();
            const light = ctx.createLinearGradient(0, rect.top, 0, rect.bottom);
            light.addColorStop(0, '#ffffff38');
            light.addColorStop(.4, '#ffffff00');
            ctx.fillStyle = light;
            ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        }
        ctx.restore();
    }

    function nodePoints() {
        return nodes.map(node => ({ x: Number(node.dataset.x) * graph.clientWidth,
            y: Number(node.dataset.y) * graph.clientHeight }));
    }

    function updateLinks() {
        const points = nodePoints();
        nodes.forEach((node, i) => {
            node.style.left = points[i].x + 'px';
            node.style.top = points[i].y + 'px';
        });
        document.querySelector('#graph-links path').setAttribute('d',
            points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ') + ' Z');
    }

    function paintScene() {
        if (layoutDirty) { textCache.clear(); layoutDirty = false; }
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.fillStyle = getComputedStyle(root).getPropertyValue('--paper');
        ctx.fillRect(0, 0, width, height);
        for (const element of document.querySelectorAll('[data-paint]')) {
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > height) continue;
            if (element.dataset.paint === 'surface') paintSurface(element, rect);
            if (element.dataset.paint === 'links') {
                ctx.beginPath();
                nodePoints().forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](rect.left + p.x, rect.top + p.y));
                ctx.closePath();
                ctx.strokeStyle = getComputedStyle(root).getPropertyValue('--muted');
                ctx.globalAlpha = .26;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            if (element.dataset.paint === 'text') {
                for (const run of textRuns(element)) {
                    ctx.font = run.font;
                    ctx.fillStyle = run.color;
                    ctx.letterSpacing = run.spacing === 'normal' ? '0px' : run.spacing;
                    ctx.textBaseline = 'alphabetic';
                    const metrics = ctx.measureText(run.text);
                    ctx.fillText(run.text, rect.left + run.x,
                        rect.top + run.y + (metrics.fontBoundingBoxAscent || parseFloat(getComputedStyle(element).fontSize) * .85));
                }
                ctx.letterSpacing = '0px';
            }
        }
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
        dirty = false;
    }

    let gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false,
        stencil: false, powerPreference: 'low-power', premultipliedAlpha: false });
    const webgl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false,
        stencil: false, powerPreference: 'low-power', premultipliedAlpha: false });
    let available = !!gl, floatMode = false, lost = false;
    let renderProgram, simProgram, normalProgram, energyProgram, quad, sceneTexture;
    let buffers = [], normalBuffer, energyBuffers = [], simWidth = 1, simHeight = 1;
    let lastEnergyRead = 0;
    const energyPixel = new Float32Array(4);

    const vertex = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
    `;
    const simulation = `
        precision highp float;
        varying vec2 v_uv;
        uniform sampler2D u_water;
        uniform vec2 u_texel;
        uniform vec2 u_view;
        uniform vec4 u_impulses[${MAX_DROPS}];
        uniform vec2 u_velocity[${MAX_DROPS}];
        uniform vec2 u_starts[${MAX_DROPS}];
        uniform float u_scroll;
        void main() {
            vec2 center = texture2D(u_water, v_uv).rg;
            vec2 l = texture2D(u_water, v_uv - vec2(u_texel.x, 0.)).rg;
            vec2 r = texture2D(u_water, v_uv + vec2(u_texel.x, 0.)).rg;
            vec2 b = texture2D(u_water, v_uv - vec2(0., u_texel.y)).rg;
            vec2 t = texture2D(u_water, v_uv + vec2(0., u_texel.y)).rg;
            vec2 lap = l + r + b + t - 4. * center;
            float velocity = (center.r - center.g) * .90 + .055 * (lap.r - lap.g);
            float next = (center.r + velocity + .2304 * lap.r) * .982;
            next += (t.r - b.r) * u_scroll;
            for (int i = 0; i < ${MAX_DROPS}; i++) {
                vec2 p = (v_uv - u_impulses[i].xy) * u_view / min(u_view.x, u_view.y);
                vec2 start = (u_starts[i] - u_impulses[i].xy) * u_view / min(u_view.x, u_view.y);
                float along = clamp(dot(p, start) / max(dot(start, start), .000001), 0., 1.);
                p -= start * along;
                float radius = max(u_impulses[i].w, .001);
                float bell = exp(-dot(p, p) / (radius * radius));
                next += bell * u_impulses[i].z * (1. + dot(p / radius, u_velocity[i]));
            }
            vec2 edge = min(v_uv, 1. - v_uv) / u_texel;
            float absorb = smoothstep(0., 10., min(edge.x, edge.y));
            gl_FragColor = vec4(clamp(next, -1., 1.) * absorb, center.r * absorb, 0., 1.);
        }
    `;
    const normals = `
        precision highp float;
        varying vec2 v_uv;
        uniform sampler2D u_water;
        uniform vec2 u_texel;
        uniform vec2 u_view;
        // Separable 1-2-1 Gaussian: smooth the height before differentiation.
        float smoothHeight(vec2 uv) {
            float h = 0.;
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    float w = (x == 0 ? 2. : 1.) * (y == 0 ? 2. : 1.);
                    h += texture2D(u_water, uv + vec2(float(x), float(y)) * u_texel).r * w;
                }
            }
            return h / 16.;
        }
        void main() {
            float center = smoothHeight(v_uv);
            float left = smoothHeight(v_uv - vec2(u_texel.x, 0.));
            float right = smoothHeight(v_uv + vec2(u_texel.x, 0.));
            float bottom = smoothHeight(v_uv - vec2(0., u_texel.y));
            float top = smoothHeight(v_uv + vec2(0., u_texel.y));
            vec2 stepSize = u_texel * u_view / min(u_view.x, u_view.y);
            vec2 gradient = vec2(right - left, top - bottom) / (2. * stepSize);
            float curvature = (right + left - 2. * center) / (stepSize.x * stepSize.x)
                + (top + bottom - 2. * center) / (stepSize.y * stepSize.y);
            gl_FragColor = vec4(gradient, curvature, center) * .002;
        }
    `;
    const reduction = `
        precision highp float;
        varying vec2 v_uv;
        uniform sampler2D u_water;
        uniform vec2 u_size;
        uniform float u_first;
        void main() {
            vec2 start = floor(gl_FragCoord.xy) * 2.;
            float total = 0.;
            for (int y = 0; y < 2; y++) {
                for (int x = 0; x < 2; x++) {
                    vec2 p = start + vec2(float(x), float(y));
                    if (p.x < u_size.x && p.y < u_size.y) {
                        vec2 h = texture2D(u_water, (p + .5) / u_size).rg;
                        float v = h.r - h.g;
                        total += mix(h.r, v * v + .025 * h.r * h.r, u_first);
                    }
                }
            }
            gl_FragColor = vec4(total, 0., 0., 1.);
        }
    `;
    const fragment = `
        precision highp float;
        varying vec2 v_uv;
        uniform sampler2D u_scene;
        uniform sampler2D u_normal;
        uniform vec2 u_view;
        uniform vec4 u_drops[${MAX_DROPS}];
        uniform vec4 u_trails[${MAX_TRAILS}];
        uniform vec4 u_trailStarts[${MAX_TRAILS}];
        uniform vec4 u_reading[4];
        uniform float u_theme;
        uniform float u_float;
        uniform float u_selecting;
        uniform float u_fade;
        uniform vec4 u_focus;
        ${packetGLSL}
        ${opticsGLSL}
        void main() {
            vec4 analytical = rippleSurface(v_uv);
            float readingMask = 0.;
            float zoning = 1.;
            float selected = 0.;
            for (int i = 0; i < 4; i++) {
                vec4 box = u_reading[i];
                vec2 inside = min(v_uv - box.xy, box.zw - v_uv) * u_view;
                float mask = smoothstep(-16., 0., min(inside.x, inside.y));
                readingMask = max(readingMask, mask);
                zoning = min(zoning, mix(1., .4, mask));
                selected = max(selected, step(-2., min(inside.x, inside.y)) * u_selecting);
            }
            vec2 focusInside = min(v_uv - u_focus.xy, u_focus.zw - v_uv);
            selected = max(selected, step(0., min(focusInside.x, focusInside.y)));
            // Reading uses compact wave packets only, so solver residue cannot
            // keep bending letters after the moving crest has passed.
            vec4 field = analytical + texture2D(u_normal, v_uv) * u_float * .35 * (1. - readingMask);
            field *= zoning * (1. - selected) * u_fade;
            vec2 n = field.xy;
            vec2 offsetPixels = n * .035 * min(u_view.x, u_view.y);
            float limit = mix(14., 2.5, readingMask);
            offsetPixels *= limit / max(limit, length(offsetPixels));
            vec2 offset = offsetPixels / u_view;
            // Canvas source has a top-left origin; flip both the UV and normal Y.
            vec2 uv = vec2(v_uv.x, 1. - v_uv.y);
            offset.y = -offset.y;
            vec2 margin = .5 / u_view;
            vec3 color = vec3(
                texture2D(u_scene, clamp(uv + offset * 1.06, margin, 1. - margin)).r,
                texture2D(u_scene, clamp(uv + offset, margin, 1. - margin)).g,
                texture2D(u_scene, clamp(uv + offset * .94, margin, 1. - margin)).b);
            color = waterLighting(color, field, u_theme, readingMask);
            // Curvature exposes the focused crest even where its slope is zero.
            // Untouched pixels stay transparent, preserving the original DOM.
            float coverage = smoothstep(.002, .02, max(length(n), abs(field.z) * .002));
            gl_FragColor = vec4(color, coverage * (1. - selected));
        }
    `;

    function program(fs) {
        function compile(type, source) {
            if (webgl2) {
                source = '#version 300 es\n' + source.replace(/attribute/g, 'in')
                    .replace(/varying/g, type === gl.VERTEX_SHADER ? 'out' : 'in')
                    .replace(/texture2D/g, 'texture');
                if (type === gl.FRAGMENT_SHADER) source = source.replace('void main()', 'out vec4 outColor;\nvoid main()').replace(/gl_FragColor/g, 'outColor');
            }
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const message = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(message);
            }
            return shader;
        }
        const shaders = [];
        const p = gl.createProgram();
        try {
            shaders.push(compile(gl.VERTEX_SHADER, vertex));
            shaders.push(compile(gl.FRAGMENT_SHADER, fs));
            shaders.forEach(s => gl.attachShader(p, s));
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
            const uniforms = {};
            for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
                const name = gl.getActiveUniform(p, i).name;
                uniforms[name.replace('[0]', '')] = gl.getUniformLocation(p, name);
            }
            return { program: p, uniforms, position: gl.getAttribLocation(p, 'a_position') };
        } catch (error) {
            gl.deleteProgram(p);
            throw error;
        } finally { shaders.forEach(s => gl.deleteShader(s)); }
    }

    function texture() {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    function target(w = simWidth, h = simHeight, fullFloat = false) {
        const tex = texture();
        gl.texImage2D(gl.TEXTURE_2D, 0, fullFloat ? gl.RGBA32F : gl.RGBA16F, w, h, 0, gl.RGBA, fullFloat ? gl.FLOAT : gl.HALF_FLOAT, null);
        if (fullFloat) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteFramebuffer(fbo);
            gl.deleteTexture(tex);
            throw new Error('Half-float framebuffer unavailable');
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return { tex, fbo, w, h };
    }

    function use(p, fbo, w, h) {
        gl.useProgram(p.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, w, h);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(p.position);
        gl.vertexAttribPointer(p.position, 2, gl.FLOAT, false, 0, 0);
        return p.uniforms;
    }

    function clearTargets() {
        if (!floatMode) return;
        for (const target of [...buffers, normalBuffer]) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        energy = 0;
    }

    function deleteTargets() {
        for (const target of [...buffers, normalBuffer, ...energyBuffers].filter(Boolean)) {
            gl.deleteTexture(target.tex);
            gl.deleteFramebuffer(target.fbo);
        }
        buffers = []; energyBuffers = [];
        normalBuffer = null;
    }

    function resize() {
        width = innerWidth; height = innerHeight;
        // Coarse pointers use half the capped native resolution, including the solver.
        pixelRatio = Math.min(devicePixelRatio || 1, 2) * (coarse.matches ? .5 : .75);
        pixelRatio = Math.min(pixelRatio, 2048 / Math.max(width, height));
        canvas.width = scene.width = Math.max(1, Math.round(width * pixelRatio));
        canvas.height = scene.height = Math.max(1, Math.round(height * pixelRatio));
        if (available && !lost) {
            deleteTargets();
            const scale = (coarse.matches ? 192 : 384) / Math.max(width, height);
            simWidth = Math.max(32, Math.round(width * scale));
            simHeight = Math.max(32, Math.round(height * scale));
            if (floatMode) {
                try {
                    buffers.push(target()); buffers.push(target()); normalBuffer = target();
                    let w = simWidth, h = simHeight;
                    do {
                        w = Math.max(1, Math.ceil(w / 2)); h = Math.max(1, Math.ceil(h / 2));
                        energyBuffers.push(target(w, h, true));
                    } while (w > 1 || h > 1);
                }
                catch (error) { console.warn('Using smooth analytical lenses:', error); deleteTargets(); floatMode = false; }
            }
            if (!floatMode) {
                const tex = texture();
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
                normalBuffer = { tex, fbo: null };
            }
        }
        updateLinks();
        layoutDirty = dirty = true;
        drops = []; trails = []; impulses = []; energy = 0;
        pointer = null; stroke++;
        wake();
    }

    function initialize() {
        if (!gl) return;
        try {
            renderProgram = program(fragment);
            quad = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
            sceneTexture = texture();
            floatMode = webgl2 && !!gl.getExtension('EXT_color_buffer_float');
            if (floatMode) {
                try { simProgram = program(simulation); normalProgram = program(normals); energyProgram = program(reduction); }
                catch (error) { floatMode = false; console.warn('Using smooth analytical lenses:', error); }
            }
        } catch (error) {
            available = false;
            console.warn('Liquid layer unavailable; the gallery remains interactive.', error);
        }
    }

    function step() {
        if (!floatMode) { impulses = []; energy = 0; return; }
        const u = use(simProgram, buffers[1].fbo, simWidth, simHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, buffers[0].tex);
        gl.uniform1i(u.u_water, 0);
        gl.uniform2f(u.u_texel, 1 / simWidth, 1 / simHeight);
        gl.uniform2f(u.u_view, width, height);
        const positions = new Float32Array(MAX_DROPS * 4);
        const velocities = new Float32Array(MAX_DROPS * 2);
        const starts = new Float32Array(MAX_DROPS * 2);
        impulses.splice(0, MAX_DROPS).forEach((p, i) => {
            positions.set([p.x, p.y, p.strength, p.radius], i * 4);
            velocities.set([p.vx, p.vy], i * 2);
            starts.set([p.startX, p.startY], i * 2);
        });
        gl.uniform4fv(u.u_impulses, positions);
        gl.uniform2fv(u.u_velocity, velocities);
        gl.uniform2fv(u.u_starts, starts);
        gl.uniform1f(u.u_scroll, scrollImpulse);
        scrollImpulse *= .8;
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        buffers.reverse();
    }

    function measureEnergy(now) {
        if (!floatMode || now - lastEnergyRead < 150) return;
        lastEnergyRead = now;
        let source = buffers[0];
        for (let i = 0; i < energyBuffers.length; i++) {
            const target = energyBuffers[i];
            const u = use(energyProgram, target.fbo, target.w, target.h);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, source.tex);
            gl.uniform1i(u.u_water, 0);
            gl.uniform2f(u.u_size, source.w, source.h);
            gl.uniform1f(u.u_first, i === 0 ? 1 : 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            source = target;
        }
        // Only one pixel crosses the GPU/CPU boundary, and only while active.
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, energyPixel);
        energy = energyPixel[0] / (simWidth * simHeight);
    }

    function draw(now) {
        if (dirty) paintScene();
        if (floatMode) {
            const u = use(normalProgram, normalBuffer.fbo, simWidth, simHeight);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, buffers[0].tex);
            gl.uniform1i(u.u_water, 0);
            gl.uniform2f(u.u_texel, 1 / simWidth, 1 / simHeight);
            gl.uniform2f(u.u_view, width, height);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        const u = use(renderProgram, null, canvas.width, canvas.height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, normalBuffer.tex);
        gl.uniform1i(u.u_normal, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
        gl.uniform1i(u.u_scene, 1);
        gl.uniform2f(u.u_view, width, height);
        const rings = new Float32Array(MAX_DROPS * 4);
        // Times are relative to this frame, avoiding long-running mediump clocks.
        drops.forEach((p, i) => rings.set([p.x, p.y, -(now - p.time) / 1000, p.strength], i * 4));
        gl.uniform4fv(u.u_drops, rings);
        const trailData = new Float32Array(MAX_TRAILS * 4);
        const trailStarts = new Float32Array(MAX_TRAILS * 4);
        trails.forEach((p, i) => {
            trailData.set([p.x, p.y, -(now - p.time) / 1000, p.strength], i * 4);
            trailStarts.set([p.startX, p.startY, p.duration, 0], i * 4);
        });
        gl.uniform4fv(u.u_trails, trailData);
        gl.uniform4fv(u.u_trailStarts, trailStarts);
        const boxes = new Float32Array(16).fill(-10);
        document.querySelectorAll('[data-reading]').forEach((p, i) => {
            if (i >= 4) return;
            const r = p.getBoundingClientRect();
            boxes.set([r.left / width, 1 - r.bottom / height, r.right / width, 1 - r.top / height], i * 4);
        });
        gl.uniform4fv(u.u_reading, boxes);
        const focus = document.activeElement;
        if (focus?.matches(':focus-visible')) {
            const r = focus.getBoundingClientRect();
            gl.uniform4f(u.u_focus, (r.left - 10) / width, 1 - (r.bottom + 10) / height,
                (r.right + 10) / width, 1 - (r.top - 10) / height);
        } else gl.uniform4f(u.u_focus, -10, -10, -9, -9);
        gl.uniform1f(u.u_theme, theme);
        gl.uniform1f(u.u_float, floatMode ? 1 : 0);
        gl.uniform1f(u.u_selecting, selecting ? 1 : 0);
        // Clear the final tiny solver residue smoothly before stopping all RAF work.
        gl.uniform1f(u.u_fade, 1 - clamp((now - lastInput - 850) / 400, 0, 1));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        canvas.style.visibility = 'visible';
    }

    function tick(now) {
        frame = 0;
        if (hidden || !available || lost || motion.matches) return sleep();
        const dt = Math.min((now - lastFrame) / 1000 || 1 / 60, .05);
        lastFrame = now;
        theme += (themeTarget - theme) * Math.min(1, dt * 18);
        drops = drops.filter(p => now - p.time < LIFE * 1000);
        trails = trails.filter(p => now - p.time < WATER.trailLife * 1000);
        accumulator = Math.min(accumulator + dt, .05);
        while (accumulator >= 1 / 60) { step(); accumulator -= 1 / 60; }
        measureEnergy(now);
        const fade = 1 - clamp((now - lastInput - 850) / 400, 0, 1);
        const active = drops.length || trails.length || energy * fade * fade > .0000001 || Math.abs(theme - themeTarget) > .002;
        if (!active) { sleep(); return; }
        draw(now);
        frame = requestAnimationFrame(tick);
    }

    function sleep() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        canvas.style.visibility = 'hidden';
        if (!lost && available) clearTargets();
        drops = []; trails = []; impulses = []; scrollImpulse = 0;
        setStatus(!available || lost ? '静态画廊 · 流体不可用' : motion.matches ? '静态光晕 · 减少动态' : '水面静止');
    }

    function wake() {
        if (hidden || !available || lost || motion.matches || frame) return;
        lastFrame = performance.now(); accumulator = 0;
        frame = requestAnimationFrame(tick);
    }

    function flash(x, y) {
        glow.style.left = (x - 75) + 'px'; glow.style.top = (y - 75) + 'px';
        glowAnimation?.cancel();
        glowAnimation = glow.animate([{ opacity: .8 }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
    }

    function queueImpulse(point) {
        if (!floatMode) return;
        appendTrail(impulses, point, MAX_DROPS);
        energy = Math.min(1, energy + point.strength * point.strength);
    }

    function disturb(x, y, strength = .06, radius = .012, vx = 0, vy = 0, ring = false) {
        if (hidden || selecting) return;
        if (motion.matches || !available || lost) { flash(x, y); return; }
        const now = performance.now();
        lastInput = now;
        const point = { x: x / width, y: 1 - y / height, startX: x / width, startY: 1 - y / height,
            strength, radius, vx, vy: -vy, time: now, duration: 0, stroke: ++stroke };
        if (ring) {
            if (drops.length >= MAX_DROPS) drops.shift();
            drops.push(point);
        } else appendTrail(trails, point, MAX_TRAILS);
        queueImpulse({ ...point, strength: strength * .25 });
        setStatus('水面流动');
        wake();
    }

    function glide(previous, current, pressed = false) {
        const segments = glideSegments(previous, current, pressed);
        if (!segments.length || hidden || selecting) return;
        if (motion.matches || !available || lost) { flash(current.x, current.y); return; }
        lastInput = current.time;
        for (const segment of segments) {
            const point = { ...segment, x: segment.x / width, y: 1 - segment.y / height,
                startX: segment.startX / width, startY: 1 - segment.startY / height,
                vx: segment.vx / 1500, vy: -segment.vy / 1500, stroke };
            appendTrail(trails, point, MAX_TRAILS);
            queueImpulse({ ...point, strength: point.strength * .25 });
        }
        setStatus('水面流动');
        wake();
    }

    function setTheme(dark) {
        root.dataset.theme = dark ? 'dark' : 'light';
        themeTarget = dark ? 1 : 0;
        themeButton.setAttribute('aria-pressed', String(dark));
        themeButton.firstElementChild.textContent = dark ? '冷灰模式 ↗' : '深海模式 ↗';
        layoutDirty = dirty = true;
        wake();
    }

    themeButton.addEventListener('click', () => {
        setTheme(root.dataset.theme !== 'dark');
        window.dispatchEvent(new CustomEvent('onColorSchemeChange', { detail: { colorScheme: root.dataset.theme } }));
    });
    window.addEventListener('onColorSchemeChange', event => {
        const detail = event.detail;
        const scheme = typeof detail === 'string' ? detail : detail?.colorScheme ?? detail?.scheme;
        if (scheme) setTheme(/dark|obsidian/.test(scheme));
    });
    document.querySelector('#ripple-button').addEventListener('click', () => {
        const r = document.querySelector('.hero').getBoundingClientRect();
        disturb(r.left + r.width * .54, clamp(r.top + r.height * .56, 50, height - 50), WATER.clickStrength, .022, 0, 0, true);
    });

    // This adapter accepts intentional graph motion only; layout/cooling is silent.
    window.addEventListener('zima:node-motion', event => {
        const p = event.detail;
        if (!p || !['drag', 'hover', 'keyboard'].includes(p.source)) return;
        const values = [p.x, p.y, p.vx, p.vy];
        if (!values.every(Number.isFinite)) return;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 70) return;
        if (Number.isFinite(p.startX) && Number.isFinite(p.startY)) {
            const now = performance.now();
            const duration = clamp(Math.hypot(p.x - p.startX, p.y - p.startY) / speed * 1000, 1, 120);
            glide({ x: p.startX, y: p.startY, time: now - duration }, { x: p.x, y: p.y, time: now }, true);
        } else disturb(p.x, p.y, clamp(speed / 7000, .025, .10), .012,
            clamp(p.vx / 500, -1, 1), clamp(p.vy / 500, -1, 1));
    });

    function moveNode(node, x, y, vx, vy, source) {
        const r = graph.getBoundingClientRect();
        const halfW = node.offsetWidth / 2, halfH = node.offsetHeight / 2;
        const cx = clamp(x - r.left, halfW, r.width - halfW);
        const cy = clamp(y - r.top, halfH, r.height - halfH);
        const startX = r.left + Number(node.dataset.x) * r.width;
        const startY = r.top + Number(node.dataset.y) * r.height;
        node.dataset.x = cx / r.width; node.dataset.y = cy / r.height;
        updateLinks(); dirty = true;
        window.dispatchEvent(new CustomEvent('zima:node-motion', { detail: { x: r.left + cx,
            y: r.top + cy, startX, startY, vx, vy, source } }));
        wake();
    }

    nodes.forEach(node => {
        node.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !event.isPrimary) return;
            const r = node.getBoundingClientRect();
            drag = { node, id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(),
                offsetX: r.left + r.width / 2 - event.clientX, offsetY: r.top + r.height / 2 - event.clientY };
            node.setPointerCapture(event.pointerId);
        });
        node.addEventListener('keydown', event => {
            const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
            if (!direction) return;
            event.preventDefault();
            const r = node.getBoundingClientRect();
            moveNode(node, r.left + r.width / 2 + direction[0] * 16,
                r.top + r.height / 2 + direction[1] * 16, direction[0] * 240, direction[1] * 240, 'keyboard');
        });
        node.addEventListener('lostpointercapture', () => { drag = null; });
    });

    let pointer = null;
    window.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0) return;
        stroke++;
        pointer = { x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId };
        if (event.target.closest('[data-reading]')) { selecting = true; dirty = true; wake(); return; }
        if (event.target.closest('button, a')) return;
        disturb(event.clientX, event.clientY, WATER.clickStrength, .022, 0, 0, true);
    });
    window.addEventListener('pointermove', event => {
        if (!event.isPrimary) return;
        const now = performance.now();
        if (drag && event.pointerId === drag.id) {
            const dt = Math.max(now - drag.time, 8) / 1000;
            moveNode(drag.node, event.clientX + drag.offsetX, event.clientY + drag.offsetY,
                (event.clientX - drag.x) / dt, (event.clientY - drag.y) / dt, 'drag');
            Object.assign(drag, { x: event.clientX, y: event.clientY, time: now });
            pointer = null;
            return;
        }
        const current = { x: event.clientX, y: event.clientY, time: now, id: event.pointerId };
        if (selecting) { pointer = null; return; }
        if (!pointer || pointer.id !== current.id || now - pointer.time > 120) stroke++;
        else glide(pointer, current, !!event.buttons);
        pointer = current;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer = null; stroke++; });
    function release() { drag = null; pointer = null; stroke++; selecting = !getSelection().isCollapsed; dirty = true; wake(); }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', () => { release(); pointer = null; sleep(); });
    document.addEventListener('focusin', () => { dirty = true; wake(); });
    document.addEventListener('selectionchange', () => {
        selecting = !getSelection().isCollapsed;
        dirty = true; wake();
    });

    let scrollYBefore = scrollY, scrollTime = performance.now();
    window.addEventListener('scroll', () => {
        const now = performance.now();
        const speed = (scrollY - scrollYBefore) / Math.max(now - scrollTime, 16);
        scrollYBefore = scrollY; scrollTime = now;
        dirty = true;
        if (Math.abs(speed) > .35 && !selecting) {
            scrollImpulse = clamp(speed * .025, -.12, .12);
            disturb(width * .5, height * .65, .018, .04, 0, clamp(speed * .1, -.5, .5));
        }
        wake();
    }, { passive: true });
    window.addEventListener('resize', resize);
    coarse.addEventListener('change', resize);
    motion.addEventListener('change', () => { sleep(); glowAnimation?.cancel(); });
    document.addEventListener('visibilitychange', () => {
        hidden = document.hidden;
        if (hidden) { sleep(); glowAnimation?.cancel(); drag = null; pointer = null; }
        else { dirty = true; wake(); }
    });
    canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault(); lost = true; sleep();
        buffers = []; energyBuffers = []; normalBuffer = null;
    });
    canvas.addEventListener('webglcontextrestored', () => {
        lost = false; available = true; initialize(); resize();
    });
    window.addEventListener('pagehide', () => { sleep(); glowAnimation?.cancel(); });
    window.addEventListener('pageshow', () => { dirty = true; wake(); });
    document.fonts?.ready.then(() => { layoutDirty = dirty = true; wake(); });

    initialize();
    setTheme(matchMedia('(prefers-color-scheme: dark)').matches);
    resize();
    sleep();
})();
