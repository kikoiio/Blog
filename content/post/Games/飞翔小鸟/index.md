---
title: "飞翔小鸟"
date: 2026-03-21
draft: false
---

<div id="flappy-game">
<style>
#flappy-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#flappy-game .canvas-wrap {
    position: relative;
    display: inline-block;
}
#flappy-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    display: block;
    cursor: pointer;
}
#flappy-game .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #fff;
    font-size: 20px;
    font-weight: 600;
    gap: 10px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 10;
}
#flappy-game .overlay.hidden { display: none; }
#flappy-game .overlay h2 {
    margin: 0 0 4px 0;
    font-size: 28px;
    color: var(--accent-color, #5bb3b0);
    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
#flappy-game .overlay .score-line {
    font-size: 16px;
    color: rgba(255,255,255,0.85);
    font-weight: 400;
}
#flappy-game .overlay .best-line {
    font-size: 14px;
    color: rgba(255,255,255,0.6);
    font-weight: 400;
}
#flappy-game .btn {
    display: inline-block;
    padding: 10px 28px;
    border: none;
    border-radius: 6px;
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    font-size: 15px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 6px;
    transition: transform 0.15s, opacity 0.15s;
}
#flappy-game .btn:hover { transform: scale(1.05); opacity: 0.9; }
#flappy-game .btn:active { transform: scale(0.97); }
#flappy-game .hud {
    position: absolute;
    top: 16px; left: 0; right: 0;
    display: flex;
    justify-content: center;
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 2px 6px rgba(0,0,0,0.5), 0 0 12px rgba(0,0,0,0.3);
    pointer-events: none;
    z-index: 5;
}
#flappy-game .hint {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    font-weight: 400;
}
@media (max-width: 768px) {
    #flappy-game .overlay h2 { font-size: 22px; }
    #flappy-game .overlay { font-size: 16px; }
    #flappy-game .hud { font-size: 28px; top: 10px; }
    #flappy-game .btn { padding: 8px 22px; font-size: 14px; }
}
</style>

<div class="canvas-wrap">
    <canvas id="flappy-canvas"></canvas>
    <div class="hud"><span id="flappy-hud-score"></span></div>
    <div class="overlay" id="flappy-start-screen">
        <h2>飞翔小鸟</h2>
        <button class="btn" id="flappy-start-btn">开始游戏</button>
        <span class="hint">空格 / 点击 / 触屏</span>
    </div>
    <div class="overlay hidden" id="flappy-over-screen">
        <h2>游戏结束</h2>
        <span class="score-line" id="flappy-final-score">得分: 0</span>
        <span class="best-line" id="flappy-best-score">最佳: 0</span>
        <button class="btn" id="flappy-restart-btn">再来一次</button>
        <span class="hint">空格 / 点击 / 触屏</span>
    </div>
</div>

<script>
(function() {
    const canvas = document.getElementById('flappy-canvas');
    const ctx = canvas.getContext('2d');
    const hudScore = document.getElementById('flappy-hud-score');
    const startScreen = document.getElementById('flappy-start-screen');
    const overScreen = document.getElementById('flappy-over-screen');
    const finalScoreEl = document.getElementById('flappy-final-score');
    const bestScoreEl = document.getElementById('flappy-best-score');
    const startBtn = document.getElementById('flappy-start-btn');
    const restartBtn = document.getElementById('flappy-restart-btn');

    const LS_KEY = 'flappy_bird_best_v1';
    let W, H, dpr;
    let state = 'start'; // start | play | dead
    let score = 0;
    let bestScore = parseInt(localStorage.getItem(LS_KEY)) || 0;
    let frameCount = 0;

    // Bird
    let bx, by, bv, bAngle, bFlapFrame;
    const BIRD_R = 12;
    const GRAVITY = 0.45;
    const FLAP_VEL = -7;
    const MAX_FALL = 8;

    // Pipes
    let pipes = [];
    const PIPE_W = 52;
    const PIPE_SPEED = 2.5;
    const PIPE_SPACING = 180;
    let pipeGap = 130;
    const MIN_GAP = 95;
    const PIPE_MIN_H = 60;

    // Ground
    const GROUND_H = 60;
    let groundX = 0;

    // Clouds
    let clouds = [];

    // Screen shake
    let shakeTimer = 0;
    let shakeX = 0, shakeY = 0;

    function resize() {
        const wrap = canvas.parentElement;
        const maxW = Math.min(400, wrap.parentElement.clientWidth - 20);
        const maxH = Math.min(600, window.innerHeight - 120);
        W = maxW;
        H = maxH;
        dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initClouds() {
        clouds = [];
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * W * 1.5,
                y: 30 + Math.random() * (H * 0.35),
                w: 40 + Math.random() * 60,
                h: 15 + Math.random() * 20,
                speed: 0.15 + Math.random() * 0.3,
                opacity: 0.15 + Math.random() * 0.2
            });
        }
    }

    function resetGame() {
        bx = W * 0.28;
        by = H * 0.4;
        bv = 0;
        bAngle = 0;
        bFlapFrame = 0;
        pipes = [];
        score = 0;
        pipeGap = 130;
        frameCount = 0;
        shakeTimer = 0;
        groundX = 0;
        hudScore.textContent = '';
    }

    function flap() {
        if (state === 'start') {
            state = 'play';
            startScreen.classList.add('hidden');
            resetGame();
            bv = FLAP_VEL;
            bFlapFrame = 8;
            hudScore.textContent = '0';
            return;
        }
        if (state === 'dead') {
            if (shakeTimer > 0) return;
            state = 'play';
            overScreen.classList.add('hidden');
            resetGame();
            bv = FLAP_VEL;
            bFlapFrame = 8;
            hudScore.textContent = '0';
            return;
        }
        bv = FLAP_VEL;
        bFlapFrame = 8;
    }

    function die() {
        if (state === 'dead') return;
        state = 'dead';
        shakeTimer = 12;
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem(LS_KEY, bestScore);
        }
        finalScoreEl.textContent = '得分: ' + score;
        bestScoreEl.textContent = '最佳: ' + bestScore;
        setTimeout(function() {
            overScreen.classList.remove('hidden');
        }, 500);
    }

    function spawnPipe() {
        const topH = PIPE_MIN_H + Math.random() * (H - GROUND_H - pipeGap - PIPE_MIN_H * 2);
        pipes.push({ x: W + 10, topH: topH, scored: false });
    }

    // Sky gradient based on score (day to dusk to night)
    function getSkyColors() {
        const t = Math.min(score / 40, 1);
        if (t < 0.5) {
            const s = t * 2;
            return {
                top: lerpColor([70, 180, 220], [45, 30, 80], s),
                bot: lerpColor([180, 230, 250], [120, 80, 140], s)
            };
        } else {
            const s = (t - 0.5) * 2;
            return {
                top: lerpColor([45, 30, 80], [10, 10, 30], s),
                bot: lerpColor([120, 80, 140], [30, 20, 50], s)
            };
        }
    }
    function lerpColor(a, b, t) {
        return 'rgb(' + Math.round(a[0]+(b[0]-a[0])*t) + ',' + Math.round(a[1]+(b[1]-a[1])*t) + ',' + Math.round(a[2]+(b[2]-a[2])*t) + ')';
    }

    function drawSky() {
        const c = getSkyColors();
        const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
        grad.addColorStop(0, c.top);
        grad.addColorStop(1, c.bot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H - GROUND_H);
    }

    function drawClouds() {
        clouds.forEach(function(cl) {
            ctx.save();
            ctx.globalAlpha = cl.opacity;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(cl.x, cl.y, cl.w * 0.5, cl.h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cl.x - cl.w * 0.25, cl.y + cl.h * 0.1, cl.w * 0.3, cl.h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cl.x + cl.w * 0.28, cl.y + cl.h * 0.08, cl.w * 0.35, cl.h * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function updateClouds() {
        clouds.forEach(function(cl) {
            cl.x -= cl.speed;
            if (cl.x + cl.w < -20) {
                cl.x = W + cl.w + Math.random() * 80;
                cl.y = 30 + Math.random() * (H * 0.35);
            }
        });
    }

    function drawPipe(p) {
        const topH = p.topH;
        const botY = topH + pipeGap;
        const botH = H - GROUND_H - botY;
        // Top pipe
        const tGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        tGrad.addColorStop(0, '#2e8b57');
        tGrad.addColorStop(0.3, '#3cb371');
        tGrad.addColorStop(0.7, '#3cb371');
        tGrad.addColorStop(1, '#1f6b3f');
        ctx.fillStyle = tGrad;
        ctx.fillRect(p.x, 0, PIPE_W, topH);
        // Top pipe cap
        ctx.fillStyle = '#2d8650';
        ctx.fillRect(p.x - 4, topH - 20, PIPE_W + 8, 22);
        ctx.fillStyle = '#3ec97a';
        ctx.fillRect(p.x - 2, topH - 18, PIPE_W + 4, 18);
        // Highlight on top pipe
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(p.x + 4, 0, 6, topH - 20);

        // Bottom pipe
        ctx.fillStyle = tGrad;
        ctx.fillRect(p.x, botY, PIPE_W, botH);
        // Bottom pipe cap
        ctx.fillStyle = '#2d8650';
        ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 22);
        ctx.fillStyle = '#3ec97a';
        ctx.fillRect(p.x - 2, botY + 2, PIPE_W + 4, 18);
        // Highlight on bottom pipe
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(p.x + 4, botY + 22, 6, botH - 22);
    }

    function drawGround() {
        // Dirt
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
        // Grass top
        const grassGrad = ctx.createLinearGradient(0, H - GROUND_H, 0, H - GROUND_H + 18);
        grassGrad.addColorStop(0, '#4CAF50');
        grassGrad.addColorStop(1, '#388E3C');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, H - GROUND_H, W, 18);
        // Grass blades
        ctx.fillStyle = '#66BB6A';
        for (let i = 0; i < W; i += 12) {
            const gx = (i + groundX % 12 + 12) % (W + 24) - 12;
            ctx.fillRect(gx, H - GROUND_H - 3, 3, 6);
            ctx.fillRect(gx + 6, H - GROUND_H - 1, 2, 4);
        }
        // Dirt texture dots
        ctx.fillStyle = '#7A5C10';
        for (let i = 0; i < 15; i++) {
            const dx = ((i * 31 + Math.floor(groundX * 0.3)) % W + W) % W;
            const dy = H - GROUND_H + 22 + (i * 7 % 30);
            ctx.fillRect(dx, dy, 3, 2);
        }
    }

    function drawBird() {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(bAngle);

        // Body
        ctx.fillStyle = '#FFD740';
        ctx.beginPath();
        ctx.ellipse(0, 0, BIRD_R, BIRD_R * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Belly
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.ellipse(2, 3, BIRD_R * 0.55, BIRD_R * 0.5, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Wing
        ctx.fillStyle = '#FFC107';
        const wingY = bFlapFrame > 0 ? -6 : 2;
        ctx.beginPath();
        ctx.ellipse(-4, wingY, 8, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eye (white)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(6, -4, 5, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(7.5, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8.5, -5.5, 1, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#FF7043';
        ctx.beginPath();
        ctx.moveTo(10, -1);
        ctx.lineTo(18, 1);
        ctx.lineTo(10, 4);
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, BIRD_R, BIRD_R * 0.85, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    function checkCollision() {
        const br = BIRD_R - 2;
        // Ground / ceiling
        if (by + br > H - GROUND_H || by - br < 0) return true;
        // Pipes
        for (let i = 0; i < pipes.length; i++) {
            const p = pipes[i];
            if (bx + br > p.x && bx - br < p.x + PIPE_W) {
                if (by - br < p.topH || by + br > p.topH + pipeGap) {
                    return true;
                }
            }
        }
        return false;
    }

    function update() {
        frameCount++;
        if (state === 'play') {
            // Bird physics
            bv += GRAVITY;
            if (bv > MAX_FALL) bv = MAX_FALL;
            by += bv;
            if (bFlapFrame > 0) bFlapFrame--;

            // Bird rotation
            const targetAngle = bv < 0 ? -0.45 : Math.min(bv * 0.08, 1.2);
            bAngle += (targetAngle - bAngle) * 0.15;

            // Pipes
            if (pipes.length === 0 || pipes[pipes.length - 1].x < W - PIPE_SPACING) {
                spawnPipe();
            }
            for (let i = pipes.length - 1; i >= 0; i--) {
                pipes[i].x -= PIPE_SPEED;
                if (!pipes[i].scored && pipes[i].x + PIPE_W < bx) {
                    pipes[i].scored = true;
                    score++;
                    hudScore.textContent = score;
                    // Difficulty increase
                    pipeGap = Math.max(MIN_GAP, 130 - score * 1.5);
                }
                if (pipes[i].x + PIPE_W < -10) {
                    pipes.splice(i, 1);
                }
            }

            // Ground scroll
            groundX -= PIPE_SPEED;

            // Clouds
            updateClouds();

            // Collision
            if (checkCollision()) {
                die();
            }
        } else if (state === 'dead') {
            // Bird falls after death
            if (by < H - GROUND_H - BIRD_R) {
                bv += GRAVITY;
                if (bv > MAX_FALL) bv = MAX_FALL;
                by += bv;
                const targetAngle = Math.min(bv * 0.1, 1.5);
                bAngle += (targetAngle - bAngle) * 0.1;
            }
            if (shakeTimer > 0) {
                shakeTimer--;
                shakeX = (Math.random() - 0.5) * 6;
                shakeY = (Math.random() - 0.5) * 6;
            } else {
                shakeX = 0;
                shakeY = 0;
            }
            updateClouds();
        } else {
            // Idle state - bob the bird
            updateClouds();
        }
    }

    function draw() {
        ctx.save();
        if (shakeTimer > 0) {
            ctx.translate(shakeX, shakeY);
        }
        drawSky();
        drawClouds();

        // Draw pipes
        pipes.forEach(drawPipe);

        drawGround();
        drawBird();

        ctx.restore();
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    // Input
    function handleInput(e) {
        if (e) e.preventDefault();
        flap();
    }

    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        flap();
    }, { passive: false });
    startBtn.addEventListener('click', function(e) { e.stopPropagation(); flap(); });
    restartBtn.addEventListener('click', function(e) { e.stopPropagation(); flap(); });

    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            // Only handle if the game is visible in viewport
            const rect = canvas.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                e.preventDefault();
                flap();
            }
        }
    });

    // Init
    resize();
    initClouds();
    resetGame();
    // Idle bird position for start screen
    bx = W * 0.28;
    by = H * 0.4;
    bestScoreEl.textContent = '最佳: ' + bestScore;

    window.addEventListener('resize', function() {
        resize();
        if (state === 'start') {
            bx = W * 0.28;
            by = H * 0.4;
        }
    });

    loop();
})();
</script>
</div>
