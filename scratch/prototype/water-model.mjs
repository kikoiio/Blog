export const WATER = Object.freeze({
    maxDrops: 8,
    maxTrails: 8,
    clickLife: 1.2,
    trailLife: .55,
    clickStrength: .4,
    clickSigma: .009,
    clickSigmaGrowth: .0015,
    clickSpeed: .34,
    clickWavelength: .018,
    trailSigma: .0045,
    trailSpeed: .16,
    trailWavelength: .012,
    maxSegments: 8,
    normalScale: .006,
    warpAmplitude: .0014,
    warpSpeed: 2.4,
    radialCore: .003,
    waterIOR: 1.333,
    causticDistance: .0028,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Each interpolated segment covers its whole length in the shader, including
// fast jumps that would leave holes with point splats at a fixed sample count.
export function glideSegments(previous, current, pressed = false) {
    if (!previous || !current || ![previous.x, previous.y, previous.time, current.x, current.y, current.time].every(Number.isFinite)) return [];
    const dt = current.time - previous.time;
    const dx = current.x - previous.x, dy = current.y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (dt <= 0 || dt > 120 || distance <= 0) return [];
    const speed = distance * 1000 / dt;
    const strength = WATER.clickStrength * (pressed ? .30 : .15 + .05 * speed / (speed + 700))
        * Math.min(1, distance / 4);
    const count = Math.min(WATER.maxSegments, Math.max(1, Math.ceil(distance / 18)));
    return Array.from({ length: count }, (_, index) => {
        const a = index / count, b = (index + 1) / count;
        return {
            startX: previous.x + dx * a, startY: previous.y + dy * a,
            x: previous.x + dx * b, y: previous.y + dy * b,
            time: previous.time + dt * b, duration: dt / count / 1000,
            strength, radius: pressed ? .014 : .010,
            vx: clamp(dx * 1000 / dt, -1500, 1500),
            vy: clamp(dy * 1000 / dt, -1500, 1500),
        };
    });
}

export function appendTrail(queue, segment, limit = WATER.maxTrails) {
    queue.push(segment);
    while (queue.length > limit) {
        // Prefer joining contiguous pieces of the same stroke. Separate gestures
        // must never create a connecting line across an untouched part of the page.
        const index = queue.findIndex((a, i) => {
            const b = queue[i + 1];
            return b && a.stroke === b.stroke && Math.hypot(a.x - b.startX, a.y - b.startY) < .001;
        });
        if (index < 0) { queue.shift(); continue; }
        const a = queue[index], b = queue[index + 1];
        queue.splice(index, 2, { ...b, startX: a.startX, startY: a.startY,
            duration: Math.max(0, (b.time - a.time) / 1000 + a.duration),
            strength: Math.max(a.strength, b.strength) });
    }
    return queue;
}

// Shared analytic definition for CPU checks and GLSL. The compact support makes
// the optical recovery time finite, instead of leaving Gaussian tails on text.
export function packetProfile(distance, sigma, wavelength) {
    const q = Math.abs(distance) / sigma;
    if (q >= 2.5) return { height: 0, slope: 0, curvature: 0 };
    const t = clamp((q - 2) * 2, 0, 1);
    const edge = t * t * t * (t * (t * 6 - 15) + 10);
    const edgeDerivative = 30 * t * t * (t - 1) ** 2 * 2 / sigma * Math.sign(distance);
    const edgeSecond = 240 * t * (2 * t * t - 3 * t + 1) / (sigma * sigma);
    const envelope = Math.exp(-.5 * q * q);
    const k = 2 * Math.PI / wavelength;
    const carrier = Math.cos(k * distance);
    const baseSlope = -distance / (sigma * sigma) * carrier - k * Math.sin(k * distance);
    const baseSecond = (distance * distance / sigma ** 4 - 1 / (sigma * sigma) - k * k) * carrier
        + 2 * distance * k / (sigma * sigma) * Math.sin(k * distance);
    return {
        height: envelope * carrier * (1 - edge),
        slope: envelope * ((-distance / (sigma * sigma) * carrier - k * Math.sin(k * distance))
            * (1 - edge) - carrier * edgeDerivative),
        curvature: envelope * (baseSecond * (1 - edge) - 2 * baseSlope * edgeDerivative - carrier * edgeSecond),
    };
}

function smoother(t) {
    const x = clamp(t, 0, 1);
    return [x ** 3 * (x * (x * 6 - 15) + 10),
        30 * x * x * (x - 1) ** 2, 60 * x * (2 * x * x - 3 * x + 1)];
}

export function clickSurfaceAt(x, y, age, phase = 0) {
    if (age < 0 || age >= WATER.clickLife) return { height: 0, gradient: [0, 0], curvature: 0 };
    const core = WATER.radialCore, rho2 = x * x + y * y;
    const radial = Math.sqrt(rho2 + core * core), r = radial - core;
    const theta = Math.atan2(y, x);
    const a = 3 * theta + WATER.warpSpeed * age + phase;
    const b = 5 * theta - WATER.warpSpeed * age * .7 - phase;
    const flow = .6 * Math.sin(a) + .4 * Math.cos(b);
    const angular = 1.8 * Math.cos(a) - 2 * Math.sin(b);
    const angularSecond = -5.4 * Math.sin(a) - 10 * Math.cos(b);
    const [g, g1, g2] = smoother((r - .02) / .04);
    const gp = g1 / .04, gpp = g2 / (.04 * .04), e = WATER.warpAmplitude;
    const gradR = [x / radial, y / radial];
    const radialLap = 1 / radial + core * core / radial ** 3;
    const gradTheta = [-y / Math.max(rho2, 1e-8), x / Math.max(rho2, 1e-8)];
    const gradD = gradR.map((v, i) => v * (1 + e * gp * flow) + gradTheta[i] * e * g * angular);
    const lapD = radialLap * (1 + e * gp * flow) + e * gpp * rho2 / (radial * radial) * flow
        + e * g * angularSecond / Math.max(rho2, 1e-8);
    const sigma = WATER.clickSigma + WATER.clickSigmaGrowth * age / WATER.clickLife;
    const wave = packetProfile(r + e * g * flow - .018 - age * WATER.clickSpeed, sigma, WATER.clickWavelength);
    const t = clamp((age - .85) / (WATER.clickLife - .85), 0, 1);
    const scale = WATER.clickStrength * WATER.normalScale * Math.exp(-age * 2.8) * (1 - t * t * (3 - 2 * t));
    return { height: wave.height * scale, gradient: gradD.map(v => v * wave.slope * scale),
        curvature: (wave.curvature * (gradD[0] ** 2 + gradD[1] ** 2) + wave.slope * lapD) * scale };
}

export function causticResponse(curvature) {
    const jacobian = 1 + clamp(curvature * WATER.causticDistance, -.7, 1.5);
    const intensity = 1 / jacobian;
    return { focus: clamp((intensity - 1) * .5, 0, 1), shadow: clamp(1 - intensity, 0, .6) };
}

export function waterTransmittance(path) {
    const distance = clamp(path, 0, .22);
    return [1.8, .20, .04].map(absorption => Math.exp(-absorption * distance));
}

export function waterFresnel(cosTheta) {
    const f0 = ((WATER.waterIOR - 1) / (WATER.waterIOR + 1)) ** 2;
    return f0 + (1 - f0) * (1 - clamp(cosTheta, 0, 1)) ** 5;
}

const f = value => value.toFixed(8);
export const packetGLSL = `
    vec3 packet(float d, float sigma, float wavelength) {
        float q = abs(d) / sigma;
        if (q >= 2.5) return vec3(0.);
        float t = clamp((q - 2.) * 2., 0., 1.);
        float edge = t * t * t * (t * (t * 6. - 15.) + 10.);
        float edgeDerivative = 60. * t * t * (t - 1.) * (t - 1.) / sigma * sign(d);
        float edgeSecond = 240. * t * (2. * t * t - 3. * t + 1.) / (sigma * sigma);
        float envelope = exp(-.5 * q * q);
        float k = 6.28318530718 / wavelength;
        float carrier = cos(k * d);
        float baseSlope = -d / (sigma * sigma) * carrier - k * sin(k * d);
        float baseSecond = (d * d / pow(sigma, 4.) - 1. / (sigma * sigma) - k * k) * carrier
            + 2. * d * k / (sigma * sigma) * sin(k * d);
        return envelope * vec3(carrier * (1. - edge),
            baseSlope * (1. - edge) - carrier * edgeDerivative,
            baseSecond * (1. - edge) - 2. * baseSlope * edgeDerivative - carrier * edgeSecond);
    }
    // XY = height gradient, Z = Laplacian curvature, W = optical height.
    vec4 rippleSurface(vec2 uv) {
        vec4 field = vec4(0.);
        vec2 metric = u_view / min(u_view.x, u_view.y);
        for (int i = 0; i < ${WATER.maxDrops}; i++) {
            if (u_drops[i].w == 0.) continue;
            float age = -u_drops[i].z;
            vec2 p = (uv - u_drops[i].xy) * metric;
            float rho2 = dot(p, p);
            float radial = sqrt(rho2 + ${f(WATER.radialCore ** 2)});
            float r = radial - ${f(WATER.radialCore)};
            float theta = 0.;
            if (rho2 > .000000000001) theta = atan(p.y, p.x);
            float phase = (sin(u_drops[i].x * 53.) + cos(u_drops[i].y * 97.)) * 3.1;
            float a = 3. * theta + ${f(WATER.warpSpeed)} * age + phase;
            float b = 5. * theta - ${f(WATER.warpSpeed * .7)} * age - phase;
            float flow = .6 * sin(a) + .4 * cos(b);
            float angular = 1.8 * cos(a) - 2. * sin(b);
            float angularSecond = -5.4 * sin(a) - 10. * cos(b);
            float t = clamp((r - .02) / .04, 0., 1.);
            float g = t * t * t * (t * (t * 6. - 15.) + 10.);
            float gp = 30. * t * t * (t - 1.) * (t - 1.) / .04;
            float gpp = 60. * t * (2. * t * t - 3. * t + 1.) / (.04 * .04);
            float e = ${f(WATER.warpAmplitude)};
            vec2 gradR = p / radial;
            vec2 gradTheta = vec2(-p.y, p.x) / max(rho2, .00000001);
            vec2 gradD = gradR * (1. + e * gp * flow) + gradTheta * e * g * angular;
            float lapR = 1. / radial + ${f(WATER.radialCore ** 2)} / (radial * radial * radial);
            float lapD = lapR * (1. + e * gp * flow) + e * gpp * dot(gradR, gradR) * flow
                + e * g * angularSecond / max(rho2, .00000001);
            float radius = .018 + age * ${f(WATER.clickSpeed)};
            float sigma = ${f(WATER.clickSigma)} + ${f(WATER.clickSigmaGrowth)} * age / ${f(WATER.clickLife)};
            vec3 wave = packet(r + e * g * flow - radius, sigma, ${f(WATER.clickWavelength)});
            float decay = exp(-age * 2.8) * (1. - smoothstep(.85, ${f(WATER.clickLife)}, age));
            float scale = u_drops[i].w * decay * ${f(WATER.normalScale)};
            field += vec4(gradD * wave.y, wave.z * dot(gradD, gradD) + wave.y * lapD, wave.x) * scale;
        }
        for (int i = 0; i < ${WATER.maxTrails}; i++) {
            if (u_trails[i].w == 0.) continue;
            vec2 a = u_trailStarts[i].xy * metric;
            vec2 b = u_trails[i].xy * metric;
            vec2 line = b - a;
            vec2 p = uv * metric;
            float along = clamp(dot(p - a, line) / max(dot(line, line), .000001), 0., 1.);
            vec2 delta = p - mix(a, b, along);
            float radial = sqrt(dot(delta, delta) + ${f(WATER.radialCore ** 2)});
            float age = -u_trails[i].z + u_trailStarts[i].z * (1. - along);
            float radius = .004 + age * ${f(WATER.trailSpeed)};
            vec3 wave = packet(radial - ${f(WATER.radialCore)} - radius,
                ${f(WATER.trailSigma)}, ${f(WATER.trailWavelength)});
            float decay = exp(-age * 6.) * (1. - smoothstep(.35, ${f(WATER.trailLife)}, age));
            vec2 gradD = delta / radial;
            float cap = along <= 0. || along >= 1. ? 1. : 0.;
            // Capsule curvature; optical convergence is bounded in the lighting pass.
            float lapD = cap / radial + ${f(WATER.radialCore ** 2)} / (radial * radial * radial);
            field += vec4(gradD * wave.y, wave.z * dot(gradD, gradD) + wave.y * lapD, wave.x)
                * u_trails[i].w * decay * ${f(WATER.normalScale)};
        }
        return field;
    }
`;

export const opticsGLSL = `
    vec3 waterLighting(vec3 refracted, vec4 field, float theme, float readingMask) {
        vec3 N = normalize(vec3(-field.xy * 2.2, 1.));
        float f0 = pow((${f(WATER.waterIOR)} - 1.) / (${f(WATER.waterIOR)} + 1.), 2.);
        float fresnel = f0 + (1. - f0) * pow(1. - N.z, 5.);
        float activity = smoothstep(.002, .02, max(length(field.xy), abs(field.z) * .002));
        float opticalGain = mix(1., .32, readingMask);
        float path = clamp(abs(field.w) * 40. + length(field.xy) * .025, 0., .22);
        vec3 transmittance = exp(-vec3(1.8, .20, .04) * path);
        vec3 zima = vec3(0., .765, 1.);
        vec3 color = refracted * transmittance + zima * (1. - transmittance) * .08;
        color = mix(refracted, color, opticalGain);
        // Signed ray convergence: a flat surface has neither focus nor shadow.
        float jacobian = 1. + clamp(field.z * ${f(WATER.causticDistance)}, -.7, 1.5);
        float intensity = 1. / jacobian;
        float focus = clamp((intensity - 1.) * .5, 0., 1.);
        float shadow = clamp(1. - intensity, 0., .6);
        color *= 1. - shadow * .10 * opticalGain;
        color += mix(vec3(.94, .98, 1.), vec3(.65, .91, 1.), theme)
            * focus * mix(.22, .32, theme) * opticalGain;
        // Broad procedural softboxes reflected in the water; no reflection texture.
        vec3 R = reflect(vec3(0., 0., -1.), N);
        float softbox = exp(-pow((R.x + .3) / .9, 2.) - pow((R.y - .55) / .28, 2.));
        float fill = exp(-pow((R.x - .65) / .45, 2.) - pow((R.y + .15) / .65, 2.));
        float sky = smoothstep(0., .3, R.z);
        color += mix(vec3(1.), vec3(.65, .85, 1.), theme) * (softbox + .25 * fill) * sky
            * fresnel * 2.5 * activity * opticalGain;
        float phase = dot(field.xy, vec2(.65, .35)) + N.z * 1.4;
        vec3 spectrum = .5 + .5 * cos(6.283185 * (phase + vec3(0., .3333, .6667)));
        color += spectrum * fresnel * .05 * activity * opticalGain;
        return clamp(color, 0., 1.);
    }
`;
