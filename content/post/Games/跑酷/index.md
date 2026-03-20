---
title: "跑酷"
date: 2026-03-20
draft: false
---

<div id="runner-game">
<style>
#runner-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#runner-game .canvas-wrap {
    position: relative;
    display: inline-block;
}
#runner-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    display: block;
    cursor: pointer;
}
#runner-game .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #fff;
    font-size: 20px;
    font-weight: 600;
    gap: 10px;
}
#runner-game .btn {
    display: inline-block;
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
}
#runner-game .btn:hover { opacity: 0.85; }
#runner-game .hud {
    position: absolute;
    top: 12px; right: 16px;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    text-align: right;
}
#runner-game .hint {
    margin-top: 12px;
    font-size: 12px;
    color: var(--card-text-color-main, #999);
    opacity: 0.6;
}
@media (max-width: 768px) {
    #runner-game canvas { max-width: 100%; height: auto; }
}
</style>

<div class="canvas-wrap">
    <canvas id="runner-canvas"></canvas>
    <div class="hud" id="runner-hud">0m</div>
    <div class="overlay" id="runner-overlay">
        <div>跑酷</div>
        <div style="font-size:13px;opacity:0.6">点击/空格 跳跃，双击 二段跳</div>
        <button class="btn" id="runner-start">开始游戏</button>
    </div>
</div>
<div class="hint">点击屏幕或按空格跳跃，支持二段跳</div>
</div>

<script>
(function() {
    const canvas = document.getElementById('runner-canvas');
    const ctx = canvas.getContext('2d');
    const W = 700, H = 300;
    canvas.width = W;
    canvas.height = H;

    const GROUND_Y = H - 50;
    const GRAVITY = 0.6;
    const JUMP_FORCE = -11;
    const BASE_SPEED = 5;

    let player, obstacles, particles, distance, speed, gameOver, animId, lastObstacle;
    let stars = [];

    // Generate stars once
    for (let i = 0; i < 60; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * (GROUND_Y - 30), r: Math.random() * 1.5 + 0.5, s: Math.random() * 0.3 + 0.1 });
    }

    function init() {
        player = {
            x: 80, y: GROUND_Y - 36, w: 24, h: 36,
            vy: 0, onGround: true, jumps: 0,
            frame: 0, frameTimer: 0,
            // Running animation legs
            legAngle: 0
        };
        obstacles = [];
        particles = [];
        distance = 0;
        speed = BASE_SPEED;
        gameOver = false;
        lastObstacle = 0;
    }

    const OBS_TYPES = [
        // Small spike
        { w: 16, h: 30, draw: function(ctx, x, y, w, h) {
            ctx.fillStyle = '#e06c75';
            ctx.beginPath();
            ctx.moveTo(x, y + h); ctx.lineTo(x + w/2, y); ctx.lineTo(x + w, y + h);
            ctx.closePath(); ctx.fill();
        }},
        // Tall spike
        { w: 16, h: 48, draw: function(ctx, x, y, w, h) {
            ctx.fillStyle = '#e5c07b';
            ctx.beginPath();
            ctx.moveTo(x, y + h); ctx.lineTo(x + w/2, y); ctx.lineTo(x + w, y + h);
            ctx.closePath(); ctx.fill();
        }},
        // Box
        { w: 24, h: 24, draw: function(ctx, x, y, w, h) {
            ctx.fillStyle = '#c678dd';
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 4);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x+2, y+2, w-4, 4);
        }},
        // Double spike
        { w: 32, h: 30, draw: function(ctx, x, y, w, h) {
            ctx.fillStyle = '#61afef';
            ctx.beginPath();
            ctx.moveTo(x, y+h); ctx.lineTo(x+8, y); ctx.lineTo(x+16, y+h);
            ctx.moveTo(x+16, y+h); ctx.lineTo(x+24, y); ctx.lineTo(x+32, y+h);
            ctx.fill();
        }},
    ];

    function spawnObstacle() {
        const type = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)];
        obstacles.push({
            x: W + 20,
            y: GROUND_Y - type.h,
            w: type.w, h: type.h,
            draw: type.draw
        });
    }

    function addParticle(x, y) {
        for (let i = 0; i < 4; i++) {
            particles.push({
                x, y, vx: -Math.random() * 2 - 1, vy: -Math.random() * 2,
                life: 20 + Math.random() * 10, r: Math.random() * 3 + 1
            });
        }
    }

    function jump() {
        if (gameOver) return;
        if (player.jumps < 2) {
            player.vy = JUMP_FORCE * (player.jumps === 1 ? 0.85 : 1);
            player.onGround = false;
            player.jumps++;
        }
    }

    function drawBackground() {
        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0d1117');
        grad.addColorStop(0.7, '#161b22');
        grad.addColorStop(1, '#1c2333');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (const s of stars) {
            const sx = ((s.x - distance * s.s) % W + W) % W;
            ctx.beginPath();
            ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mountains silhouette
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        for (let x = 0; x <= W; x += 40) {
            const h = Math.sin((x + distance * 0.2) * 0.01) * 40 + Math.sin((x + distance * 0.2) * 0.025) * 25;
            ctx.lineTo(x, GROUND_Y - 60 - h);
        }
        ctx.lineTo(W, GROUND_Y);
        ctx.fill();

        // Ground
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(W, GROUND_Y);
        ctx.stroke();

        // Ground dashes
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < W + 40; i += 40) {
            const dx = ((i - distance * speed * 0.3) % (W + 40) + W + 40) % (W + 40);
            ctx.beginPath();
            ctx.moveTo(dx, GROUND_Y + 15);
            ctx.lineTo(dx + 20, GROUND_Y + 15);
            ctx.stroke();
        }
    }

    function drawPlayer() {
        const p = player;
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h);

        // Body
        ctx.fillStyle = '#5bb3b0';
        ctx.beginPath();
        ctx.roundRect(-p.w/2, -p.h, p.w, p.h * 0.65, 6);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -p.h + 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#0d1117';
        ctx.beginPath();
        ctx.arc(3, -p.h + 1, 2, 0, Math.PI * 2);
        ctx.fill();

        // Legs animation
        if (p.onGround) {
            p.legAngle += speed * 0.15;
            const la = Math.sin(p.legAngle) * 20 * Math.PI / 180;
            // Left leg
            ctx.strokeStyle = '#5bb3b0';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-4, -p.h * 0.35);
            ctx.lineTo(-4 + Math.sin(la) * 12, 0);
            ctx.stroke();
            // Right leg
            ctx.beginPath();
            ctx.moveTo(4, -p.h * 0.35);
            ctx.lineTo(4 + Math.sin(-la) * 12, 0);
            ctx.stroke();
        } else {
            // In air - legs together
            ctx.strokeStyle = '#5bb3b0';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-2, -p.h * 0.35);
            ctx.lineTo(-4, -2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(2, -p.h * 0.35);
            ctx.lineTo(4, -2);
            ctx.stroke();
        }

        ctx.restore();

        // Trail particles when running
        if (p.onGround && Math.random() > 0.5) {
            addParticle(p.x, p.y + p.h);
        }
    }

    function update() {
        if (gameOver) return;

        speed = BASE_SPEED + distance * 0.0003;
        distance += speed * 0.1;

        // Player physics
        if (!player.onGround) {
            player.vy += GRAVITY;
            player.y += player.vy;
            if (player.y >= GROUND_Y - player.h) {
                player.y = GROUND_Y - player.h;
                player.vy = 0;
                player.onGround = true;
                player.jumps = 0;
            }
        }

        // Spawn obstacles
        lastObstacle += speed;
        const minGap = Math.max(120, 200 - distance * 0.02);
        if (lastObstacle > minGap + Math.random() * 100) {
            spawnObstacle();
            lastObstacle = 0;
        }

        // Move obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= speed;
            if (obstacles[i].x + obstacles[i].w < 0) {
                obstacles.splice(i, 1);
                continue;
            }
            // Collision
            const o = obstacles[i];
            const p = player;
            const margin = 4;
            if (p.x + p.w - margin > o.x + margin &&
                p.x + margin < o.x + o.w - margin &&
                p.y + p.h - margin > o.y + margin &&
                p.y + margin < o.y + o.h - margin) {
                gameOver = true;
                showOverlay('游戏结束', '距离: ' + Math.floor(distance) + 'm');
                return;
            }
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life--;
            if (pt.life <= 0) particles.splice(i, 1);
        }

        document.getElementById('runner-hud').textContent = Math.floor(distance) + 'm';
    }

    function draw() {
        drawBackground();

        // Obstacles
        for (const o of obstacles) {
            o.draw(ctx, o.x, o.y, o.w, o.h);
        }

        // Particles
        for (const pt of particles) {
            ctx.globalAlpha = pt.life / 30;
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        drawPlayer();
    }

    function loop() {
        update();
        draw();
        if (!gameOver) animId = requestAnimationFrame(loop);
    }

    function showOverlay(title, sub) {
        const o = document.getElementById('runner-overlay');
        o.style.display = 'flex';
        o.innerHTML = '<div>' + title + '</div>' + (sub ? '<div style="font-size:14px;opacity:0.7">' + sub + '</div>' : '') + '<button class="btn" id="runner-start">再来一局</button>';
        document.getElementById('runner-start').onclick = startGame;
    }

    function startGame() {
        document.getElementById('runner-overlay').style.display = 'none';
        init();
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(loop);
    }

    document.getElementById('runner-start').onclick = startGame;

    // Controls
    document.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump(); }
    });
    canvas.addEventListener('click', function(e) { if (!gameOver) jump(); });
    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); if (!gameOver) jump(); }, { passive: false });

    // Initial draw
    init();
    draw();
})();
</script>
