---
title: "涂鸦跳跃"
date: 2026-03-21
draft: false
---

<div id="doodle-game">
<style>
#doodle-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#doodle-game .canvas-wrap {
    position: relative;
    display: inline-block;
}
#doodle-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    display: block;
    cursor: pointer;
}
#doodle-game .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255,250,240,0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #333;
    font-size: 20px;
    font-weight: 600;
    gap: 8px;
    z-index: 10;
}
#doodle-game .overlay .title {
    font-size: 32px;
    font-weight: 800;
    color: var(--accent-color, #5bb3b0);
    margin-bottom: 4px;
    letter-spacing: -0.5px;
}
#doodle-game .overlay .subtitle {
    font-size: 14px;
    color: #888;
    font-weight: 400;
    margin-bottom: 8px;
}
#doodle-game .btn {
    display: inline-block;
    padding: 10px 28px;
    border: 2px dashed var(--accent-color, #5bb3b0);
    border-radius: 12px;
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
    transition: transform 0.1s;
}
#doodle-game .btn:hover { transform: scale(1.05); }
#doodle-game .btn:active { transform: scale(0.97); }
#doodle-game .hud {
    position: absolute;
    top: 10px; left: 14px;
    color: #555;
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    z-index: 5;
}
#doodle-game .hud-best {
    position: absolute;
    top: 10px; right: 14px;
    color: #aaa;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    z-index: 5;
}
#doodle-game .score-display {
    font-size: 48px;
    font-weight: 800;
    color: var(--accent-color, #5bb3b0);
    margin: 4px 0;
}
#doodle-game .best-label {
    font-size: 14px;
    color: #aaa;
    font-weight: 400;
}
#doodle-game .hint {
    margin-top: 10px;
    font-size: 12px;
    color: var(--card-text-color-main, #999);
    opacity: 0.6;
}
@media (max-width: 768px) {
    #doodle-game .overlay .title { font-size: 26px; }
    #doodle-game .score-display { font-size: 38px; }
    #doodle-game .hud { font-size: 14px; }
}
</style>

<div class="canvas-wrap">
    <canvas id="doodle-canvas"></canvas>
    <div class="hud" id="doodle-hud" style="display:none;">Height: <span id="doodle-height">0</span>m</div>
    <div class="hud-best" id="doodle-hud-best" style="display:none;">Best: <span id="doodle-best-hud">0</span>m</div>
    <div class="overlay" id="doodle-start-screen">
        <div class="title">Doodle Jump</div>
        <div class="subtitle">Jump as high as you can!</div>
        <button class="btn" id="doodle-start-btn">START</button>
        <div class="hint">Arrow keys / Touch / Mouse</div>
    </div>
    <div class="overlay" id="doodle-over-screen" style="display:none;">
        <div style="font-size:18px; color:#999;">Game Over</div>
        <div class="score-display" id="doodle-final-score">0</div>
        <div style="font-size:14px; color:#666;">meters</div>
        <div class="best-label" id="doodle-best-label">Best: 0m</div>
        <button class="btn" id="doodle-restart-btn">RETRY</button>
    </div>
</div>

<script>
(function() {
    const canvas = document.getElementById('doodle-canvas');
    const ctx = canvas.getContext('2d');
    const hudEl = document.getElementById('doodle-hud');
    const hudBestEl = document.getElementById('doodle-hud-best');
    const heightEl = document.getElementById('doodle-height');
    const bestHudEl = document.getElementById('doodle-best-hud');
    const startScreen = document.getElementById('doodle-start-screen');
    const overScreen = document.getElementById('doodle-over-screen');
    const finalScoreEl = document.getElementById('doodle-final-score');
    const bestLabelEl = document.getElementById('doodle-best-label');
    const startBtn = document.getElementById('doodle-start-btn');
    const restartBtn = document.getElementById('doodle-restart-btn');

    const LS_KEY = 'doodle_jump_best_v1';
    let W, H;
    let bestScore = parseInt(localStorage.getItem(LS_KEY)) || 0;

    function resize() {
        const wrap = canvas.parentElement;
        const maxW = Math.min(420, wrap.parentElement.clientWidth - 20);
        W = maxW;
        H = Math.min(640, window.innerHeight - 120);
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    // Game state
    let running = false;
    let player, platforms, monsters, decorations, camera, score, gameTime;
    let keys = { left: false, right: false };

    // Constants
    const GRAVITY = 0.35;
    const JUMP_VEL = -10;
    const SPRING_VEL = -16;
    const MOVE_SPEED = 5;
    const PLAT_W = 68;
    const PLAT_H = 14;
    const PLAYER_R = 16;

    // Seeded random for decorations
    function rand(a, b) { return a + Math.random() * (b - a); }

    // Draw notebook background
    function drawBackground() {
        // Paper color
        ctx.fillStyle = '#fffcf5';
        ctx.fillRect(0, 0, W, H);
        // Grid lines
        ctx.strokeStyle = 'rgba(180,200,220,0.25)';
        ctx.lineWidth = 0.5;
        const gridSize = 24;
        const offy = camera % gridSize;
        for (let y = -offy; y < H; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        for (let x = 0; x < W; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        // Left margin line (notebook style)
        ctx.strokeStyle = 'rgba(220,120,120,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(36, 0); ctx.lineTo(36, H); ctx.stroke();
    }

    // Wobbly line helper
    function wobbleLine(x1, y1, x2, y2, wobble) {
        const steps = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * wobble;
            const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * wobble;
            ctx.lineTo(x, y);
        }
    }

    // Draw wobbly rect (platform)
    function wobbleRect(x, y, w, h, wobble) {
        ctx.beginPath();
        const pts = [];
        // top edge
        for (let i = 0; i <= 5; i++) pts.push([x + w * i / 5 + (Math.random()-0.5)*wobble, y + (Math.random()-0.5)*wobble]);
        // right edge
        for (let i = 0; i <= 2; i++) pts.push([x + w + (Math.random()-0.5)*wobble, y + h * i / 2 + (Math.random()-0.5)*wobble]);
        // bottom edge
        for (let i = 5; i >= 0; i--) pts.push([x + w * i / 5 + (Math.random()-0.5)*wobble, y + h + (Math.random()-0.5)*wobble]);
        // left edge
        for (let i = 2; i >= 0; i--) pts.push([x + (Math.random()-0.5)*wobble, y + h * i / 2 + (Math.random()-0.5)*wobble]);
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
    }

    // Decoration types
    function createDecoration(y) {
        const type = Math.random();
        if (type < 0.5) {
            return { type: 'star', x: rand(50, W - 50), y: y - rand(20, 80), size: rand(6, 14), rot: rand(0, Math.PI * 2) };
        } else {
            return { type: 'cloud', x: rand(60, W - 60), y: y - rand(30, 100), w: rand(40, 70) };
        }
    }

    function drawStar(cx, cy, r, rot) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(200,180,120,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    function drawCloud(cx, cy, w) {
        ctx.strokeStyle = 'rgba(180,200,220,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.5, w * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx - w * 0.2, cy - w * 0.1, w * 0.25, w * 0.18, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + w * 0.15, cy - w * 0.08, w * 0.2, w * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawDecorations() {
        for (const d of decorations) {
            const sy = d.y - camera;
            if (sy < -50 || sy > H + 50) continue;
            if (d.type === 'star') drawStar(d.x, sy, d.size, d.rot);
            else drawCloud(d.x, sy, d.w);
        }
    }

    // Platform class
    function makePlatform(x, y, type) {
        return {
            x, y, w: PLAT_W, h: PLAT_H, type,
            // moving
            moveDir: type === 'moving' ? (Math.random() < 0.5 ? 1 : -1) : 0,
            moveSpeed: rand(1, 2.5),
            // breaking
            broken: false, breakTime: 0,
            // disappearing
            alpha: 1, disappearing: false, disappearTime: 0,
            // spring
            springAnim: 0,
            // wobble seed
            wobbleSeed: Math.random() * 1000
        };
    }

    function getPlatColor(type) {
        switch (type) {
            case 'normal': return { fill: '#7ec87e', stroke: '#4a9e4a' };
            case 'moving': return { fill: '#6eb5e8', stroke: '#3a8bc2' };
            case 'breaking': return { fill: '#f0d96e', stroke: '#c4a832' };
            case 'disappearing': return { fill: '#e8e8e8', stroke: '#b0b0b0' };
            case 'spring': return { fill: '#e86e6e', stroke: '#c23a3a' };
        }
    }

    function drawPlatform(p) {
        const sy = p.y - camera;
        if (sy < -30 || sy > H + 30) return;
        if (p.broken) {
            // Draw crumbling pieces
            const t = p.breakTime;
            ctx.globalAlpha = Math.max(0, 1 - t / 30);
            const cols = getPlatColor('breaking');
            for (let i = 0; i < 4; i++) {
                const px = p.x + (i * p.w / 4) + Math.sin(t * 0.3 + i) * t * 0.5;
                const py = sy + t * t * 0.08 + Math.cos(t * 0.2 + i * 2) * 3;
                ctx.fillStyle = cols.fill;
                ctx.fillRect(px, py, p.w / 5, p.h * 0.6);
            }
            ctx.globalAlpha = 1;
            return;
        }
        ctx.globalAlpha = p.alpha;
        const cols = getPlatColor(p.type);
        // Wobbly platform
        Math.random = (function() {
            let s = p.wobbleSeed;
            return function() { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        })();
        ctx.fillStyle = cols.fill;
        ctx.strokeStyle = cols.stroke;
        ctx.lineWidth = 2;
        wobbleRect(p.x, sy, p.w, p.h, 2);
        ctx.fill();
        ctx.stroke();
        // Reset random
        Math.random = Math.random.__proto__.constructor.bind(Math)();
        // Spring coil on spring platforms
        if (p.type === 'spring') {
            const sx = p.x + p.w / 2;
            const springH = 12 + p.springAnim * 6;
            ctx.strokeStyle = '#c23a3a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                const xx = sx + Math.sin(t * Math.PI * 4) * 6;
                const yy = sy - t * springH;
                if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
            // Spring top
            ctx.fillStyle = '#ff5555';
            ctx.beginPath();
            ctx.arc(sx, sy - springH, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Fix the Math.random override issue - use a simpler approach
    const origRandom = Math.random;

    function drawPlatformClean(p) {
        const sy = p.y - camera;
        if (sy < -30 || sy > H + 30) return;
        if (p.broken) {
            const t = p.breakTime;
            ctx.globalAlpha = Math.max(0, 1 - t / 30);
            const cols = getPlatColor('breaking');
            for (let i = 0; i < 4; i++) {
                const px = p.x + (i * p.w / 4) + Math.sin(t * 0.3 + i) * t * 0.5;
                const py = sy + t * t * 0.08 + Math.cos(t * 0.2 + i * 2) * 3;
                ctx.fillStyle = cols.fill;
                ctx.fillRect(px, py, p.w / 5, p.h * 0.6);
            }
            ctx.globalAlpha = 1;
            return;
        }
        ctx.globalAlpha = p.alpha;
        const cols = getPlatColor(p.type);
        // Draw with seeded wobble
        let s = p.wobbleSeed;
        function srand() { s = (s * 9301 + 49297) % 233280; return s / 233280; }

        ctx.fillStyle = cols.fill;
        ctx.strokeStyle = cols.stroke;
        ctx.lineWidth = 2;
        // Custom wobble rect with seeded random
        const x = p.x, y2 = sy, w = p.w, h = p.h, wb = 2;
        const pts = [];
        for (let i = 0; i <= 5; i++) pts.push([x + w * i / 5 + (srand()-0.5)*wb, y2 + (srand()-0.5)*wb]);
        for (let i = 0; i <= 2; i++) pts.push([x + w + (srand()-0.5)*wb, y2 + h * i / 2 + (srand()-0.5)*wb]);
        for (let i = 5; i >= 0; i--) pts.push([x + w * i / 5 + (srand()-0.5)*wb, y2 + h + (srand()-0.5)*wb]);
        for (let i = 2; i >= 0; i--) pts.push([x + (srand()-0.5)*wb, y2 + h * i / 2 + (srand()-0.5)*wb]);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Spring coil
        if (p.type === 'spring') {
            const sx = p.x + p.w / 2;
            const springH = 12 + p.springAnim * 6;
            ctx.strokeStyle = '#c23a3a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                const xx = sx + Math.sin(t * Math.PI * 4) * 6;
                const yy = sy - t * springH;
                if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
            ctx.fillStyle = '#ff5555';
            ctx.beginPath();
            ctx.arc(sx, sy - springH, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Player drawing
    function drawPlayer() {
        const sx = player.x;
        const sy = player.y - camera;
        const squash = player.vy > 0 ? 1 + Math.min(player.vy * 0.02, 0.3) : 1 - Math.min(Math.abs(player.vy) * 0.015, 0.2);
        const stretch = 1 / squash;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(squash, stretch);

        // Body
        ctx.fillStyle = '#6ec46e';
        ctx.strokeStyle = '#3a8a3a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Belly highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.ellipse(-3, -4, 8, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const dir = player.facing;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-6 + dir * 2, -4, 6, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(6 + dir * 2, -4, 6, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-5 + dir * 4, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(7 + dir * 4, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-4 + dir * 3, -6, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(8 + dir * 3, -6, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Nose/mouth
        ctx.strokeStyle = '#3a8a3a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(dir * 2, 3, 4, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // Feet when going down
        if (player.vy > 2) {
            ctx.fillStyle = '#5ab55a';
            ctx.beginPath();
            ctx.ellipse(-7, PLAYER_R + 2, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(7, PLAYER_R + 2, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Monster
    function makeMonster(x, y) {
        return {
            x, y, w: 30, h: 30,
            moveDir: Math.random() < 0.5 ? 1 : -1,
            moveSpeed: rand(0.5, 1.5),
            frame: 0
        };
    }

    function drawMonster(m) {
        const sy = m.y - camera;
        if (sy < -40 || sy > H + 40) return;
        const cx = m.x + m.w / 2;
        const cy = sy + m.h / 2;
        m.frame++;

        ctx.save();
        ctx.translate(cx, cy);

        // Body (spiky blob)
        ctx.fillStyle = '#8855aa';
        ctx.strokeStyle = '#663388';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const spikes = 8;
        for (let i = 0; i < spikes; i++) {
            const a = (i / spikes) * Math.PI * 2;
            const r1 = 14 + Math.sin(m.frame * 0.1 + i) * 2;
            const r2 = 20 + Math.sin(m.frame * 0.15 + i * 2) * 3;
            const mid = ((i + 0.5) / spikes) * Math.PI * 2;
            if (i === 0) ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(mid) * r2, Math.sin(mid) * r2);
            const next = ((i + 1) / spikes) * Math.PI * 2;
            ctx.lineTo(Math.cos(next) * r1, Math.sin(next) * r1);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, -3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff2222';
        ctx.beginPath();
        ctx.arc(-5, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Angry mouth
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, 5);
        ctx.lineTo(-2, 3);
        ctx.lineTo(2, 6);
        ctx.lineTo(5, 3);
        ctx.stroke();

        ctx.restore();
    }

    // Generate platforms
    function generatePlatforms(fromY, toY) {
        const heightLevel = Math.abs(toY) / 1000;
        let gap = Math.min(55 + heightLevel * 3, 90);
        let y = fromY;
        while (y > toY) {
            y -= rand(gap * 0.7, gap * 1.3);
            const x = rand(10, W - PLAT_W - 10);
            // Platform type based on difficulty
            let type = 'normal';
            const r = Math.random();
            if (heightLevel > 0.5) {
                if (r < 0.08 + heightLevel * 0.01) type = 'spring';
                else if (r < 0.18 + heightLevel * 0.03) type = 'breaking';
                else if (r < 0.28 + heightLevel * 0.02) type = 'disappearing';
                else if (r < 0.42 + heightLevel * 0.04) type = 'moving';
            } else {
                if (r < 0.05) type = 'spring';
                else if (r < 0.1) type = 'breaking';
                else if (r < 0.2) type = 'moving';
            }
            platforms.push(makePlatform(x, y, type));

            // Maybe add monster (rare)
            if (heightLevel > 1 && Math.random() < 0.03 + heightLevel * 0.005) {
                monsters.push(makeMonster(rand(20, W - 50), y - rand(40, 80)));
            }

            // Maybe add decoration
            if (Math.random() < 0.3) {
                decorations.push(createDecoration(y));
            }
        }
        return y;
    }

    let lastGenY;

    function initGame() {
        player = {
            x: W / 2, y: H - 80,
            vx: 0, vy: 0,
            facing: 0, // -1 left, 0 center, 1 right
            alive: true
        };
        platforms = [];
        monsters = [];
        decorations = [];
        camera = 0;
        score = 0;
        gameTime = 0;

        // Floor platform
        platforms.push(makePlatform(W / 2 - PLAT_W / 2, H - 50, 'normal'));

        // Generate initial platforms
        lastGenY = generatePlatforms(H - 100, -H);

        bestHudEl.textContent = bestScore;
    }

    function updateGame() {
        gameTime++;

        // Player horizontal movement
        if (keys.left) { player.vx = -MOVE_SPEED; player.facing = -1; }
        else if (keys.right) { player.vx = MOVE_SPEED; player.facing = 1; }
        else { player.vx *= 0.85; }

        player.x += player.vx;
        player.vy += GRAVITY;
        player.y += player.vy;

        // Wrap horizontally
        if (player.x < -PLAYER_R) player.x = W + PLAYER_R;
        if (player.x > W + PLAYER_R) player.x = -PLAYER_R;

        // Platform collision (only when falling)
        if (player.vy > 0) {
            for (const p of platforms) {
                if (p.broken) continue;
                if (p.type === 'disappearing' && p.alpha <= 0) continue;
                const py = player.y + PLAYER_R;
                const prevPy = py - player.vy;
                if (py >= p.y && prevPy <= p.y + 4 &&
                    player.x + PLAYER_R * 0.6 > p.x && player.x - PLAYER_R * 0.6 < p.x + p.w) {
                    // Land!
                    if (p.type === 'breaking') {
                        p.broken = true;
                        player.vy = JUMP_VEL * 0.6;
                    } else if (p.type === 'spring') {
                        player.vy = SPRING_VEL;
                        p.springAnim = 1;
                    } else {
                        player.vy = JUMP_VEL;
                    }
                    if (p.type === 'disappearing' && !p.disappearing) {
                        p.disappearing = true;
                    }
                }
            }
        }

        // Camera follow
        const targetCam = player.y - H * 0.4;
        if (targetCam < camera) {
            camera = targetCam;
        }

        // Score
        const height = Math.floor(Math.max(0, (H - 80 - player.y) / 10));
        if (height > score) score = height;
        heightEl.textContent = score;

        // Generate more platforms as we go up
        if (camera < lastGenY + H) {
            lastGenY = generatePlatforms(lastGenY, lastGenY - H * 2);
        }

        // Update moving platforms
        for (const p of platforms) {
            if (p.type === 'moving') {
                p.x += p.moveSpeed * p.moveDir;
                if (p.x <= 5 || p.x + p.w >= W - 5) p.moveDir *= -1;
            }
            if (p.broken) p.breakTime++;
            if (p.disappearing) {
                p.disappearTime++;
                p.alpha = Math.max(0, 1 - p.disappearTime / 60);
            }
            if (p.springAnim > 0) p.springAnim = Math.max(0, p.springAnim - 0.05);
        }

        // Update monsters
        for (const m of monsters) {
            m.x += m.moveSpeed * m.moveDir;
            if (m.x <= 5 || m.x + m.w >= W - 5) m.moveDir *= -1;
        }

        // Monster collision
        for (const m of monsters) {
            const dx = player.x - (m.x + m.w / 2);
            const dy = player.y - (m.y + m.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < PLAYER_R + 15) {
                player.alive = false;
            }
        }

        // Cleanup off-screen items
        platforms = platforms.filter(p => p.y - camera < H + 100 && !(p.broken && p.breakTime > 40));
        monsters = monsters.filter(m => m.y - camera < H + 100);
        decorations = decorations.filter(d => d.y - camera < H + 100);

        // Fall off bottom = game over
        if (player.y - camera > H + 50) {
            player.alive = false;
        }

        if (!player.alive) {
            endGame();
        }
    }

    function render() {
        drawBackground();
        drawDecorations();
        for (const p of platforms) drawPlatformClean(p);
        for (const m of monsters) drawMonster(m);
        if (player.alive) drawPlayer();
    }

    let rafId = null;
    function loop() {
        if (!running) return;
        updateGame();
        render();
        rafId = requestAnimationFrame(loop);
    }

    function startGame() {
        startScreen.style.display = 'none';
        overScreen.style.display = 'none';
        hudEl.style.display = 'block';
        hudBestEl.style.display = 'block';
        initGame();
        running = true;
        loop();
    }

    function endGame() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem(LS_KEY, bestScore);
        }
        finalScoreEl.textContent = score;
        bestLabelEl.textContent = 'Best: ' + bestScore + 'm';
        hudEl.style.display = 'none';
        hudBestEl.style.display = 'none';
        overScreen.style.display = 'flex';
    }

    // Controls - Keyboard
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
        if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    });

    // Controls - Touch
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        handleTouch(e.touches[0]);
    }, { passive: false });
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        handleTouch(e.touches[0]);
    }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
        keys.left = false;
        keys.right = false;
    });

    function handleTouch(touch) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        if (x < rect.width / 2) { keys.left = true; keys.right = false; }
        else { keys.right = true; keys.left = false; }
    }

    // Controls - Mouse
    let mouseDown = false;
    canvas.addEventListener('mousedown', function(e) {
        mouseDown = true;
        handleMouse(e);
    });
    canvas.addEventListener('mousemove', function(e) {
        if (mouseDown) handleMouse(e);
    });
    document.addEventListener('mouseup', function() {
        mouseDown = false;
        keys.left = false;
        keys.right = false;
    });

    function handleMouse(e) {
        if (!running) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) { keys.left = true; keys.right = false; }
        else { keys.right = true; keys.left = false; }
    }

    // Device orientation (tilt)
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', function(e) {
            if (!running) return;
            const gamma = e.gamma || 0; // -90 to 90
            if (gamma < -8) { keys.left = true; keys.right = false; }
            else if (gamma > 8) { keys.right = true; keys.left = false; }
            else { keys.left = false; keys.right = false; }
        });
    }

    // Buttons
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    // Draw initial state
    resize();
    drawBackground();

    // Update best score display
    bestHudEl.textContent = bestScore;
})();
</script>
</div>
