---
title: "跳一跳"
date: 2026-03-20
draft: false
---

<div id="jump-game">
<style>
#jump-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#jump-game .canvas-wrap {
    position: relative;
    display: inline-block;
}
#jump-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    display: block;
    cursor: pointer;
}
#jump-game .overlay {
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
#jump-game .btn {
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
#jump-game .btn:hover { opacity: 0.85; }
#jump-game .hud {
    position: absolute;
    top: 12px; left: 16px;
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}
#jump-game .hint {
    margin-top: 12px;
    font-size: 12px;
    color: var(--card-text-color-main, #999);
    opacity: 0.6;
}
#jump-game .power-bar-bg {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 8px;
    background: rgba(255,255,255,0.15);
    border-radius: 4px;
    overflow: hidden;
    display: none;
}
#jump-game .power-bar-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #00f0f0, #f0a000, #f00000);
    border-radius: 4px;
    transition: none;
}
</style>

<div class="canvas-wrap">
    <canvas id="jump-canvas"></canvas>
    <div class="hud" id="jump-hud">0</div>
    <div class="power-bar-bg" id="jump-power-bg">
        <div class="power-bar-fill" id="jump-power-fill"></div>
    </div>
    <div class="overlay" id="jump-overlay">
        <div>跳一跳</div>
        <div style="font-size:13px;opacity:0.6">按住蓄力，松开跳跃</div>
        <button class="btn" id="jump-start">开始游戏</button>
    </div>
</div>
<div class="hint">按住鼠标/触屏蓄力，松开跳跃到下一个平台</div>
</div>

<script>
(function() {
    const canvas = document.getElementById('jump-canvas');
    const ctx = canvas.getContext('2d');
    const W = 400, H = 600;
    canvas.width = W;
    canvas.height = H;

    const PLATFORM_COLORS = ['#5bb3b0','#e06c75','#d19a66','#98c379','#c678dd','#61afef','#e5c07b'];
    const GRAVITY = 0.4;
    const MAX_POWER = 50;

    let platforms, player, score, bestScore = 0, gameOver, charging, chargeStart, power;
    let cameraX = 0;
    let animId;

    function randRange(a, b) { return a + Math.random() * (b - a); }
    function randColor() { return PLATFORM_COLORS[Math.floor(Math.random() * PLATFORM_COLORS.length)]; }

    function createPlatform(x, y, w) {
        return { x, y: y || (H - 80), w: w || randRange(50, 90), h: 20, color: randColor() };
    }

    function init() {
        platforms = [];
        // First platform
        platforms.push(createPlatform(80, H - 100, 80));
        // Generate initial platforms
        for (let i = 0; i < 6; i++) {
            const last = platforms[platforms.length - 1];
            const gap = randRange(80, 160);
            const pw = randRange(45, 85);
            const py = last.y + randRange(-30, 30);
            platforms.push(createPlatform(last.x + last.w / 2 + gap, Math.min(Math.max(py, H - 200), H - 60), pw));
        }
        player = {
            x: platforms[0].x + platforms[0].w / 2,
            y: platforms[0].y - 20,
            w: 20, h: 20,
            vx: 0, vy: 0,
            onGround: true,
            currentPlatform: 0
        };
        score = 0;
        gameOver = false;
        charging = false;
        power = 0;
        cameraX = 0;
        updateHud();
    }

    function updateHud() {
        document.getElementById('jump-hud').textContent = score;
    }

    function addPlatform() {
        const last = platforms[platforms.length - 1];
        const gap = randRange(80, 160);
        const pw = randRange(45, 85);
        const py = last.y + randRange(-30, 30);
        platforms.push(createPlatform(last.x + last.w / 2 + gap, Math.min(Math.max(py, H - 200), H - 60), pw));
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.translate(-cameraX, 0);

        // Platforms
        for (const p of platforms) {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(p.x + p.w / 2, p.y + p.h + 4, p.w / 2 + 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Platform body
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.roundRect(p.x, p.y, p.w, p.h, 6);
            ctx.fill();
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.roundRect(p.x + 2, p.y + 2, p.w - 4, 6, 3);
            ctx.fill();
        }

        // Player
        const squash = charging ? Math.max(0.6, 1 - power / MAX_POWER * 0.4) : 1;
        const stretch = charging ? 1 + power / MAX_POWER * 0.2 : 1;
        ctx.save();
        ctx.translate(player.x, player.y + player.h / 2);
        ctx.scale(stretch, squash);
        // Body
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(-player.w / 2, -player.h / 2 - (1 - squash) * player.h, player.w, player.h, 5);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(-4, -player.h / 4 - (1 - squash) * player.h + 2, 2.5, 0, Math.PI * 2);
        ctx.arc(4, -player.h / 4 - (1 - squash) * player.h + 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    function update() {
        if (gameOver) return;

        if (!player.onGround) {
            player.vy += GRAVITY;
            player.x += player.vx;
            player.y += player.vy;

            // Check landing
            for (let i = 0; i < platforms.length; i++) {
                const p = platforms[i];
                if (player.vy > 0 &&
                    player.x >= p.x && player.x <= p.x + p.w &&
                    player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 8) {
                    player.y = p.y - player.h;
                    player.vy = 0;
                    player.vx = 0;
                    player.onGround = true;
                    if (i > player.currentPlatform) {
                        score += (i - player.currentPlatform);
                        // Bonus for center landing
                        const center = p.x + p.w / 2;
                        if (Math.abs(player.x - center) < 8) score += 1;
                        player.currentPlatform = i;
                        updateHud();
                        // Add more platforms
                        while (platforms.length - i < 6) addPlatform();
                    }
                    break;
                }
            }

            // Fall off
            if (player.y > H + 50) {
                gameOver = true;
                if (score > bestScore) bestScore = score;
                showOverlay('游戏结束', '分数: ' + score + (bestScore > score ? '' : ' (新纪录!)'));
                return;
            }
        }

        // Camera follows player
        const targetCam = player.x - W * 0.35;
        cameraX += (targetCam - cameraX) * 0.08;
        if (cameraX < 0) cameraX = 0;
    }

    function gameLoop() {
        update();
        draw();
        if (!gameOver) animId = requestAnimationFrame(gameLoop);
    }

    function showOverlay(title, sub) {
        const o = document.getElementById('jump-overlay');
        o.style.display = 'flex';
        o.innerHTML = '<div>' + title + '</div>' + (sub ? '<div style="font-size:14px;opacity:0.7">' + sub + '</div>' : '') + '<button class="btn" id="jump-start">再来一局</button>';
        document.getElementById('jump-start').onclick = startGame;
    }

    function startGame() {
        document.getElementById('jump-overlay').style.display = 'none';
        document.getElementById('jump-power-bg').style.display = 'none';
        init();
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(gameLoop);
    }

    function startCharge(e) {
        e.preventDefault();
        if (gameOver || !player.onGround) return;
        charging = true;
        chargeStart = performance.now();
        power = 0;
        document.getElementById('jump-power-bg').style.display = 'block';
        chargeLoop();
    }

    function chargeLoop() {
        if (!charging) return;
        power = Math.min(MAX_POWER, (performance.now() - chargeStart) / 30);
        document.getElementById('jump-power-fill').style.width = (power / MAX_POWER * 100) + '%';
        draw();
        requestAnimationFrame(chargeLoop);
    }

    function releaseCharge(e) {
        e.preventDefault();
        if (!charging) return;
        charging = false;
        document.getElementById('jump-power-bg').style.display = 'none';
        // Jump
        const jumpPower = Math.min(MAX_POWER, (performance.now() - chargeStart) / 30);
        player.vx = jumpPower * 0.32;
        player.vy = -(jumpPower * 0.28 + 5);
        player.onGround = false;
    }

    canvas.addEventListener('mousedown', startCharge);
    canvas.addEventListener('mouseup', releaseCharge);
    canvas.addEventListener('touchstart', startCharge, { passive: false });
    canvas.addEventListener('touchend', releaseCharge, { passive: false });

    // Prevent scrolling on touch
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });

    document.getElementById('jump-start').onclick = startGame;
    draw();
})();
</script>
