---
title: "贪吃蛇"
date: 2026-03-21
draft: false
---

<div id="snake-game">
<style>
#snake-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', 'Noto Sans SC', sans-serif;
    user-select: none;
    -webkit-user-select: none;
    position: relative;
}
#snake-game .game-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}
#snake-game canvas {
    border: 2px solid var(--accent-color, #5bb3b0);
    border-radius: 10px;
    display: block;
    box-shadow: 0 0 20px rgba(91, 179, 176, 0.3), inset 0 0 30px rgba(0,0,0,0.3);
}
#snake-game .hud {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 402px;
    margin-bottom: 10px;
    gap: 8px;
}
#snake-game .hud-item {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 8px 14px;
    text-align: center;
    flex: 1;
    backdrop-filter: blur(4px);
}
#snake-game .hud-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--card-text-color-main, #aaa);
    opacity: 0.6;
    margin-bottom: 2px;
}
#snake-game .hud-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--accent-color, #5bb3b0);
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 8px rgba(91, 179, 176, 0.5);
}
#snake-game .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    backdrop-filter: blur(6px);
    z-index: 10;
    transition: opacity 0.3s;
}
#snake-game .overlay-title {
    font-size: 32px;
    font-weight: 800;
    color: var(--accent-color, #5bb3b0);
    margin-bottom: 8px;
    text-shadow: 0 0 20px rgba(91, 179, 176, 0.6);
    letter-spacing: 2px;
}
#snake-game .overlay-sub {
    font-size: 14px;
    color: var(--card-text-color-main, #ccc);
    opacity: 0.7;
    margin-bottom: 20px;
}
#snake-game .overlay-score {
    font-size: 48px;
    font-weight: 800;
    color: var(--accent-color, #5bb3b0);
    text-shadow: 0 0 25px rgba(91, 179, 176, 0.7);
    margin: 4px 0;
}
#snake-game .overlay-score-label {
    font-size: 13px;
    color: var(--card-text-color-main, #aaa);
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 2px;
}
#snake-game .overlay-best {
    font-size: 14px;
    color: #ffd700;
    margin-bottom: 20px;
    opacity: 0.8;
}
#snake-game .btn {
    display: inline-block;
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0.5px;
    box-shadow: 0 0 15px rgba(91, 179, 176, 0.4);
    transition: all 0.2s;
}
#snake-game .btn:hover {
    opacity: 0.85;
    transform: scale(1.03);
}
#snake-game .controls-hint {
    margin-top: 14px;
    font-size: 12px;
    color: var(--card-text-color-main, #999);
    opacity: 0.5;
    text-align: center;
    line-height: 1.8;
}
#snake-game .mobile-controls {
    display: none;
    margin-top: 16px;
    gap: 4px;
}
#snake-game .mobile-controls .dpad {
    display: grid;
    grid-template-columns: 52px 52px 52px;
    grid-template-rows: 52px 52px 52px;
    gap: 4px;
}
#snake-game .mobile-controls .dpad-btn {
    width: 52px;
    height: 52px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    color: var(--card-text-color-main, #ccc);
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.1s;
    -webkit-tap-highlight-color: transparent;
}
#snake-game .mobile-controls .dpad-btn:active {
    background: rgba(91, 179, 176, 0.3);
    border-color: var(--accent-color, #5bb3b0);
}
#snake-game .mobile-controls .dpad-empty {
    width: 52px;
    height: 52px;
}
@media (max-width: 768px) {
    #snake-game .hud { max-width: 322px; }
    #snake-game .hud-item { padding: 6px 8px; }
    #snake-game .hud-value { font-size: 17px; }
    #snake-game .hud-label { font-size: 10px; }
    #snake-game .overlay-title { font-size: 24px; }
    #snake-game .overlay-score { font-size: 36px; }
    #snake-game .controls-hint { display: none; }
    #snake-game .mobile-controls { display: flex; justify-content: center; }
}
</style>

<div class="hud">
    <div class="hud-item">
        <div class="hud-label">Score</div>
        <div class="hud-value" id="snake-score">0</div>
    </div>
    <div class="hud-item">
        <div class="hud-label">Best</div>
        <div class="hud-value" id="snake-best">0</div>
    </div>
    <div class="hud-item">
        <div class="hud-label">Length</div>
        <div class="hud-value" id="snake-length">3</div>
    </div>
</div>

<div class="game-container">
    <canvas id="snake-canvas" width="400" height="400"></canvas>
    <div class="overlay" id="snake-start-overlay">
        <div class="overlay-title">SNAKE</div>
        <div class="overlay-sub">Use arrow keys or swipe to play</div>
        <button class="btn" id="snake-start-btn">Start Game</button>
    </div>
    <div class="overlay" id="snake-over-overlay" style="display:none;">
        <div class="overlay-title">GAME OVER</div>
        <div class="overlay-score-label">Final Score</div>
        <div class="overlay-score" id="snake-final-score">0</div>
        <div class="overlay-best" id="snake-best-msg"></div>
        <button class="btn" id="snake-restart-btn">Play Again</button>
    </div>
</div>

<div class="controls-hint">
    Arrow Keys to move &middot; Space to pause
</div>

<div class="mobile-controls">
    <div class="dpad">
        <div class="dpad-empty"></div>
        <div class="dpad-btn" data-dir="up">&uarr;</div>
        <div class="dpad-empty"></div>
        <div class="dpad-btn" data-dir="left">&larr;</div>
        <div class="dpad-empty"></div>
        <div class="dpad-btn" data-dir="right">&rarr;</div>
        <div class="dpad-empty"></div>
        <div class="dpad-btn" data-dir="down">&darr;</div>
        <div class="dpad-empty"></div>
    </div>
</div>

<script>
(function() {
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    const lengthEl = document.getElementById('snake-length');
    const startOverlay = document.getElementById('snake-start-overlay');
    const overOverlay = document.getElementById('snake-over-overlay');
    const finalScoreEl = document.getElementById('snake-final-score');
    const bestMsgEl = document.getElementById('snake-best-msg');

    const isMobile = window.innerWidth <= 768;
    const GRID = isMobile ? 16 : 20;
    const CELL = Math.floor(canvas.width / GRID);

    if (isMobile) {
        canvas.width = 320;
        canvas.height = 320;
    }
    const CELL_SIZE = canvas.width / GRID;

    let snake, direction, nextDirection, food, goldenFood, score, best, speed;
    let gameLoop, running, paused, goldenTimer, particles, animFrame;

    best = parseInt(localStorage.getItem('snake-best') || '0');
    bestEl.textContent = best;

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#5bb3b0';

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    const [ar, ag, ab] = hexToRgb(accentColor);

    function init() {
        const mid = Math.floor(GRID / 2);
        snake = [
            { x: mid, y: mid },
            { x: mid - 1, y: mid },
            { x: mid - 2, y: mid }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        speed = 150;
        food = null;
        goldenFood = null;
        particles = [];
        paused = false;
        placeFood();
        scheduleGolden();
        updateHUD();
    }

    function placeFood() {
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
        } while (isOccupied(pos));
        food = pos;
    }

    function placeGoldenFood() {
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
        } while (isOccupied(pos) || (food && pos.x === food.x && pos.y === food.y));
        goldenFood = { x: pos.x, y: pos.y, ttl: 80, maxTtl: 80 };
    }

    function scheduleGolden() {
        clearTimeout(goldenTimer);
        goldenTimer = setTimeout(() => {
            if (running && !paused) {
                placeGoldenFood();
            }
            scheduleGolden();
        }, 8000 + Math.random() * 7000);
    }

    function isOccupied(pos) {
        return snake.some(s => s.x === pos.x && s.y === pos.y);
    }

    function updateHUD() {
        scoreEl.textContent = score;
        lengthEl.textContent = snake.length;
    }

    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: (x + 0.5) * CELL_SIZE,
                y: (y + 0.5) * CELL_SIZE,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1,
                decay: 0.02 + Math.random() * 0.03,
                size: 2 + Math.random() * 3,
                color: color
            });
        }
    }

    function step() {
        if (paused) return;

        direction = { ...nextDirection };
        const head = {
            x: (snake[0].x + direction.x + GRID) % GRID,
            y: (snake[0].y + direction.y + GRID) % GRID
        };

        // Self collision
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            gameOver();
            return;
        }

        snake.unshift(head);

        let ate = false;
        if (food && head.x === food.x && head.y === food.y) {
            score += 10;
            spawnParticles(head.x, head.y, `rgb(${ar},${ag},${ab})`, 12);
            placeFood();
            ate = true;
        } else if (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y) {
            score += 50;
            spawnParticles(head.x, head.y, '#ffd700', 20);
            goldenFood = null;
            ate = true;
        }

        if (!ate) {
            snake.pop();
        } else {
            // Increase speed
            speed = Math.max(60, 150 - snake.length * 2);
            clearInterval(gameLoop);
            gameLoop = setInterval(step, speed);
        }

        if (goldenFood) {
            goldenFood.ttl--;
            if (goldenFood.ttl <= 0) goldenFood = null;
        }

        updateHUD();
    }

    function gameOver() {
        running = false;
        clearInterval(gameLoop);
        clearTimeout(goldenTimer);
        if (score > best) {
            best = score;
            localStorage.setItem('snake-best', best);
            bestEl.textContent = best;
            bestMsgEl.textContent = 'New Best!';
        } else {
            bestMsgEl.textContent = 'Best: ' + best;
        }
        finalScoreEl.textContent = score;
        overOverlay.style.display = 'flex';
    }

    function drawBackground() {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#0a0e17');
        grad.addColorStop(0.5, '#0f1923');
        grad.addColorStop(1, '#0a0e17');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= GRID; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(canvas.width, i * CELL_SIZE);
            ctx.stroke();
        }
    }

    function drawSnake() {
        snake.forEach((seg, i) => {
            const x = seg.x * CELL_SIZE;
            const y = seg.y * CELL_SIZE;
            const p = CELL_SIZE * 0.1;

            if (i === 0) {
                // Head - bright glow
                ctx.shadowColor = `rgba(${ar},${ag},${ab},0.8)`;
                ctx.shadowBlur = 15;
                ctx.fillStyle = accentColor;
                ctx.beginPath();
                ctx.roundRect(x + p * 0.5, y + p * 0.5, CELL_SIZE - p, CELL_SIZE - p, 4);
                ctx.fill();

                // Eyes
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff';
                const eyeSize = CELL_SIZE * 0.15;
                let ex1, ey1, ex2, ey2;
                if (direction.x === 1) { ex1 = x + CELL_SIZE * 0.6; ey1 = y + CELL_SIZE * 0.25; ex2 = x + CELL_SIZE * 0.6; ey2 = y + CELL_SIZE * 0.65; }
                else if (direction.x === -1) { ex1 = x + CELL_SIZE * 0.25; ey1 = y + CELL_SIZE * 0.25; ex2 = x + CELL_SIZE * 0.25; ey2 = y + CELL_SIZE * 0.65; }
                else if (direction.y === -1) { ex1 = x + CELL_SIZE * 0.25; ey1 = y + CELL_SIZE * 0.25; ex2 = x + CELL_SIZE * 0.65; ey2 = y + CELL_SIZE * 0.25; }
                else { ex1 = x + CELL_SIZE * 0.25; ey1 = y + CELL_SIZE * 0.65; ex2 = x + CELL_SIZE * 0.65; ey2 = y + CELL_SIZE * 0.65; }
                ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#111';
                const pupil = eyeSize * 0.5;
                ctx.beginPath(); ctx.arc(ex1, ey1, pupil, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(ex2, ey2, pupil, 0, Math.PI * 2); ctx.fill();
            } else {
                // Body - gradient fade
                const t = i / snake.length;
                const alpha = 1 - t * 0.6;
                ctx.shadowColor = `rgba(${ar},${ag},${ab},${0.3 * alpha})`;
                ctx.shadowBlur = 8;
                ctx.fillStyle = `rgba(${ar},${ag},${ab},${alpha})`;
                ctx.beginPath();
                ctx.roundRect(x + p, y + p, CELL_SIZE - p * 2, CELL_SIZE - p * 2, 3);
                ctx.fill();
            }
        });
        ctx.shadowBlur = 0;
    }

    function drawFood(time) {
        if (!food) return;
        const x = food.x * CELL_SIZE;
        const y = food.y * CELL_SIZE;
        const pulse = 0.8 + Math.sin(time * 0.005) * 0.2;
        const r = CELL_SIZE * 0.35 * pulse;

        ctx.shadowColor = `rgba(${ar},${ag},${ab},0.9)`;
        ctx.shadowBlur = 20;
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE / 2 - r * 0.2, y + CELL_SIZE / 2 - r * 0.2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawGoldenFood(time) {
        if (!goldenFood) return;
        const x = goldenFood.x * CELL_SIZE;
        const y = goldenFood.y * CELL_SIZE;
        const fade = goldenFood.ttl < 20 ? goldenFood.ttl / 20 : 1;
        const pulse = 0.7 + Math.sin(time * 0.008) * 0.3;
        const r = CELL_SIZE * 0.4 * pulse;
        const blink = goldenFood.ttl < 20 && Math.floor(time * 0.01) % 2 === 0;

        if (blink) return;

        ctx.shadowColor = 'rgba(255,215,0,0.9)';
        ctx.shadowBlur = 25;
        ctx.fillStyle = `rgba(255,215,0,${fade})`;
        ctx.beginPath();

        // Star shape
        const cx = x + CELL_SIZE / 2, cy = y + CELL_SIZE / 2;
        const spikes = 5;
        const outerR = r, innerR = r * 0.5;
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            const rot = (i * Math.PI * 2 / spikes) - Math.PI / 2;
            const rot2 = rot + Math.PI / spikes;
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            ctx.lineTo(cx + Math.cos(rot2) * innerR, cy + Math.sin(rot2) * innerR);
        }
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,215,0,${fade * 0.7})`;
        ctx.font = `bold ${CELL_SIZE * 0.35}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('5x', cx, cy + CELL_SIZE * 0.7);
    }

    function drawParticles() {
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) { particles.splice(i, 1); return; }
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function drawPaused() {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }

    function render(time) {
        drawBackground();
        drawFood(time);
        drawGoldenFood(time);
        drawSnake();
        drawParticles();
        if (paused) drawPaused();
        if (running) animFrame = requestAnimationFrame(render);
    }

    function startGame() {
        init();
        running = true;
        startOverlay.style.display = 'none';
        overOverlay.style.display = 'none';
        gameLoop = setInterval(step, speed);
        animFrame = requestAnimationFrame(render);
    }

    // Controls
    document.addEventListener('keydown', function(e) {
        if (!running) return;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
                e.preventDefault(); break;
            case 'ArrowDown': case 's': case 'S':
                if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
                e.preventDefault(); break;
            case 'ArrowLeft': case 'a': case 'A':
                if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
                e.preventDefault(); break;
            case 'ArrowRight': case 'd': case 'D':
                if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
                e.preventDefault(); break;
            case ' ':
                paused = !paused;
                e.preventDefault(); break;
        }
    });

    // Touch swipe
    let touchStart = null;
    canvas.addEventListener('touchstart', function(e) {
        const t = e.touches[0];
        touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
        if (!touchStart || !running) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        const min = 20;
        if (Math.abs(dx) < min && Math.abs(dy) < min) return;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
            else if (dx < 0 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
        } else {
            if (dy > 0 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
            else if (dy < 0 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
        }
        touchStart = null;
    }, { passive: true });

    // D-pad buttons
    document.querySelectorAll('#snake-game .dpad-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!running) return;
            const d = this.getAttribute('data-dir');
            if (d === 'up' && direction.y !== 1) nextDirection = { x: 0, y: -1 };
            if (d === 'down' && direction.y !== -1) nextDirection = { x: 0, y: 1 };
            if (d === 'left' && direction.x !== 1) nextDirection = { x: -1, y: 0 };
            if (d === 'right' && direction.x !== -1) nextDirection = { x: 1, y: 0 };
        });
    });

    document.getElementById('snake-start-btn').addEventListener('click', startGame);
    document.getElementById('snake-restart-btn').addEventListener('click', startGame);

    // Initial draw
    init();
    drawBackground();
    drawFood(0);
    drawSnake();
})();
</script>
</div>
