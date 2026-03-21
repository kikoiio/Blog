---
title: "钢琴块"
date: 2026-03-21
draft: false
---

<div id="piano-game">
<style>
#piano-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#piano-game .canvas-wrap {
    position: relative;
    display: inline-block;
}
#piano-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    background: #0a0a12;
    display: block;
    cursor: pointer;
}
#piano-game .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(5,5,15,0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #fff;
    gap: 12px;
    z-index: 10;
}
#piano-game .overlay-title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 2px;
    background: linear-gradient(135deg, #5bb3b0, #7dd3d0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
#piano-game .overlay-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin-bottom: 4px;
}
#piano-game .overlay-score {
    font-size: 48px;
    font-weight: 900;
    color: var(--accent-color, #5bb3b0);
    font-variant-numeric: tabular-nums;
}
#piano-game .overlay-best {
    font-size: 14px;
    color: rgba(255,255,255,0.45);
}
#piano-game .btn {
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
    letter-spacing: 1px;
    transition: opacity 0.2s;
    margin-top: 6px;
}
#piano-game .btn:hover { opacity: 0.85; }
#piano-game .hud {
    position: absolute;
    top: 10px; left: 14px; right: 14px;
    display: flex;
    justify-content: space-between;
    color: rgba(255,255,255,0.85);
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    pointer-events: none;
    z-index: 5;
}
#piano-game .combo-display {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(1);
    font-size: 36px;
    font-weight: 900;
    color: var(--accent-color, #5bb3b0);
    text-shadow: 0 0 20px rgba(91,179,176,0.6);
    pointer-events: none;
    opacity: 0;
    transition: none;
    z-index: 5;
}
#piano-game .combo-display.show {
    opacity: 1;
    animation: pg-combo-pop 0.6s ease-out forwards;
}
@keyframes pg-combo-pop {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
    100% { transform: translate(-50%, -70%) scale(1); opacity: 0; }
}
#piano-game .hint {
    margin-top: 12px;
    font-size: 12px;
    color: var(--card-text-color-main, #999);
    opacity: 0.5;
}
@media (max-width: 768px) {
    #piano-game .overlay-title { font-size: 22px; }
    #piano-game .overlay-score { font-size: 36px; }
    #piano-game .hud { font-size: 13px; }
    #piano-game .btn { padding: 8px 22px; font-size: 14px; }
}
</style>

<div class="canvas-wrap">
    <canvas id="pg-canvas"></canvas>
    <div class="hud" id="pg-hud" style="display:none;">
        <span id="pg-score-display">0</span>
        <span id="pg-speed-display">Speed: 1x</span>
    </div>
    <div class="combo-display" id="pg-combo"></div>
    <div class="overlay" id="pg-start-overlay">
        <div class="overlay-title">PIANO TILES</div>
        <div class="overlay-subtitle">Tap the black tiles</div>
        <button class="btn" id="pg-start-btn">START</button>
    </div>
    <div class="overlay" id="pg-over-overlay" style="display:none;">
        <div class="overlay-title">GAME OVER</div>
        <div class="overlay-score" id="pg-final-score">0</div>
        <div class="overlay-best" id="pg-best-score">Best: 0</div>
        <button class="btn" id="pg-restart-btn">RETRY</button>
    </div>
</div>
<div class="hint">Click or tap the black tiles</div>

<script>
(function() {
    const canvas = document.getElementById('pg-canvas');
    const ctx = canvas.getContext('2d');
    const hud = document.getElementById('pg-hud');
    const scoreDisplay = document.getElementById('pg-score-display');
    const speedDisplay = document.getElementById('pg-speed-display');
    const comboEl = document.getElementById('pg-combo');
    const startOverlay = document.getElementById('pg-start-overlay');
    const overOverlay = document.getElementById('pg-over-overlay');
    const finalScoreEl = document.getElementById('pg-final-score');
    const bestScoreEl = document.getElementById('pg-best-score');
    const startBtn = document.getElementById('pg-start-btn');
    const restartBtn = document.getElementById('pg-restart-btn');

    const COLS = 4;
    const LS_KEY = 'piano-tiles-best';
    let W, H, TILE_W, TILE_H, VISIBLE_ROWS;
    let rows, scrollY, score, speed, combo, comboTimer;
    let running, gameOver, animId, lastTime;
    let ripples = [];
    let speedLines = [];
    let audioCtx = null;

    /* --- Audio --- */
    const NOTES = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playNote(col) {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = NOTES[col];
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } catch(e) {}
    }

    function playError() {
        if (!audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = 150;
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } catch(e) {}
    }

    /* --- Sizing --- */
    function resize() {
        const maxW = Math.min(400, window.innerWidth - 40);
        W = maxW;
        H = Math.round(W * 1.6);
        canvas.width = W;
        canvas.height = H;
        TILE_W = W / COLS;
        VISIBLE_ROWS = 5;
        TILE_H = H / VISIBLE_ROWS;
    }

    /* --- Row Generation --- */
    function makeRow() {
        const blackCol = Math.floor(Math.random() * COLS);
        return { blackCol, tapped: false };
    }

    /* --- Init --- */
    function init() {
        resize();
        score = 0;
        speed = 2.0;
        combo = 0;
        scrollY = 0;
        running = false;
        gameOver = false;
        ripples = [];
        speedLines = [];
        rows = [];
        // pre-fill rows: enough to fill screen + buffer
        for (let i = 0; i < VISIBLE_ROWS + 4; i++) {
            rows.push(makeRow());
        }
        updateHUD();
    }

    function updateHUD() {
        scoreDisplay.textContent = score;
        const sp = Math.max(1, speed / 2).toFixed(1);
        speedDisplay.textContent = 'Speed: ' + sp + 'x';
    }

    function showCombo(c) {
        comboEl.textContent = c + 'x COMBO';
        comboEl.classList.remove('show');
        void comboEl.offsetWidth;
        comboEl.classList.add('show');
        clearTimeout(comboTimer);
        comboTimer = setTimeout(() => comboEl.classList.remove('show'), 600);
    }

    /* --- Drawing --- */
    function drawTile(x, y, w, h, isBlack, tapped) {
        if (isBlack && tapped) return; // tapped tiles handled by ripple

        ctx.save();
        if (isBlack) {
            const grd = ctx.createLinearGradient(x, y, x, y + h);
            grd.addColorStop(0, '#1a1a2e');
            grd.addColorStop(0.5, '#0f0f1a');
            grd.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, w, h);
            // subtle shine
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(x + 2, y + 2, w * 0.3, h - 4);
        } else {
            ctx.fillStyle = 'rgba(200,200,210,0.08)';
            ctx.fillRect(x, y, w, h);
        }
        // grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    function drawRipples() {
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.t += 0.04;
            if (r.t >= 1) { ripples.splice(i, 1); continue; }
            const alpha = 1 - r.t;
            const radius = r.t * Math.max(TILE_W, TILE_H) * 0.8;
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            const grd = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, radius);
            if (r.type === 'good') {
                grd.addColorStop(0, 'rgba(91,179,176,0.8)');
                grd.addColorStop(0.5, 'rgba(91,179,176,0.3)');
                grd.addColorStop(1, 'rgba(91,179,176,0)');
            } else {
                grd.addColorStop(0, 'rgba(255,60,60,0.8)');
                grd.addColorStop(0.5, 'rgba(255,60,60,0.3)');
                grd.addColorStop(1, 'rgba(255,60,60,0)');
            }
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawSpeedLines() {
        if (speed < 5) return;
        const intensity = Math.min(1, (speed - 5) / 10);
        // occasionally add new lines
        if (Math.random() < intensity * 0.4) {
            const side = Math.random() < 0.5 ? 0 : 1;
            speedLines.push({
                x: side === 0 ? Math.random() * 15 : W - Math.random() * 15,
                y: -20,
                len: 30 + Math.random() * 60,
                speed: 8 + Math.random() * 6,
                alpha: 0.15 + Math.random() * 0.2
            });
        }
        for (let i = speedLines.length - 1; i >= 0; i--) {
            const l = speedLines[i];
            l.y += l.speed;
            if (l.y > H + l.len) { speedLines.splice(i, 1); continue; }
            ctx.save();
            ctx.strokeStyle = 'rgba(91,179,176,' + l.alpha + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x, l.y - l.len);
            ctx.stroke();
            ctx.restore();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        // background
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#08080f');
        bg.addColorStop(1, '#0d0d18');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // draw tiles
        const baseOffset = scrollY % TILE_H;
        const startRowIdx = Math.floor(scrollY / TILE_H);

        for (let vi = -1; vi <= VISIBLE_ROWS + 1; vi++) {
            const rowIdx = startRowIdx + (VISIBLE_ROWS - vi);
            if (rowIdx < 0 || rowIdx >= rows.length) continue;
            const row = rows[rowIdx];
            const y = vi * TILE_H - baseOffset;
            if (y > H + TILE_H || y < -TILE_H) continue;

            for (let c = 0; c < COLS; c++) {
                const isBlack = c === row.blackCol;
                drawTile(c * TILE_W, y, TILE_W, TILE_H, isBlack, row.tapped);
            }
        }

        // top deadline line
        ctx.save();
        ctx.strokeStyle = 'rgba(255,60,60,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, TILE_H * 0.5);
        ctx.lineTo(W, TILE_H * 0.5);
        ctx.stroke();
        ctx.restore();

        drawSpeedLines();
        drawRipples();
    }

    /* --- Game Loop --- */
    function update(dt) {
        if (!running || gameOver) return;

        scrollY += speed * dt * 60;
        speed = 2.0 + score * 0.08;
        if (speed > 18) speed = 18;

        // ensure enough rows ahead
        const neededRows = Math.ceil(scrollY / TILE_H) + VISIBLE_ROWS + 3;
        while (rows.length < neededRows) {
            rows.push(makeRow());
        }

        // check if a black tile passed the top
        const topRowIdx = Math.floor(scrollY / TILE_H) + VISIBLE_ROWS;
        if (topRowIdx >= 0 && topRowIdx < rows.length) {
            // check rows that have scrolled past top
            for (let r = topRowIdx; r < rows.length; r++) {
                const rowScreenY = (VISIBLE_ROWS - (r - Math.floor(scrollY / TILE_H))) * TILE_H - (scrollY % TILE_H);
                if (rowScreenY < -TILE_H && !rows[r].tapped) {
                    endGame();
                    return;
                }
                if (rowScreenY >= 0) break;
            }
        }

        updateHUD();
    }

    function loop(ts) {
        if (!running) return;
        if (!lastTime) lastTime = ts;
        const dt = Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;
        update(dt);
        draw();
        animId = requestAnimationFrame(loop);
    }

    /* --- Input --- */
    function getClickPos(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        return { x: x * (W / rect.width), y: y * (H / rect.height) };
    }

    function handleTap(e) {
        e.preventDefault();
        if (gameOver || !running) return;

        const pos = getClickPos(e);
        const col = Math.floor(pos.x / TILE_W);
        if (col < 0 || col >= COLS) return;

        // find which row was clicked
        const baseOffset = scrollY % TILE_H;
        const startRowIdx = Math.floor(scrollY / TILE_H);

        for (let vi = -1; vi <= VISIBLE_ROWS + 1; vi++) {
            const rowIdx = startRowIdx + (VISIBLE_ROWS - vi);
            if (rowIdx < 0 || rowIdx >= rows.length) continue;
            const y = vi * TILE_H - baseOffset;
            if (pos.y >= y && pos.y < y + TILE_H) {
                const row = rows[rowIdx];
                if (row.tapped) return; // already tapped

                if (col === row.blackCol) {
                    // correct!
                    row.tapped = true;
                    score++;
                    combo++;
                    if (combo >= 5) showCombo(combo);
                    playNote(col);
                    ripples.push({ x: col * TILE_W + TILE_W / 2, y: y + TILE_H / 2, t: 0, type: 'good' });
                } else {
                    // wrong tile!
                    combo = 0;
                    ripples.push({ x: pos.x, y: pos.y, t: 0, type: 'bad' });
                    playError();
                    endGame();
                }
                return;
            }
        }
    }

    /* --- Game State --- */
    function startGame() {
        initAudio();
        init();
        running = true;
        lastTime = null;
        startOverlay.style.display = 'none';
        overOverlay.style.display = 'none';
        hud.style.display = 'flex';
        animId = requestAnimationFrame(loop);
    }

    function endGame() {
        gameOver = true;
        running = false;
        cancelAnimationFrame(animId);

        let best = parseInt(localStorage.getItem(LS_KEY)) || 0;
        if (score > best) {
            best = score;
            localStorage.setItem(LS_KEY, best);
        }

        finalScoreEl.textContent = score;
        bestScoreEl.textContent = 'Best: ' + best;
        hud.style.display = 'none';
        overOverlay.style.display = 'flex';
    }

    /* --- Events --- */
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    canvas.addEventListener('mousedown', handleTap);
    canvas.addEventListener('touchstart', handleTap, { passive: false });
    window.addEventListener('resize', () => {
        if (!gameOver) resize();
    });

    // initial draw
    init();
    draw();
})();
</script>
</div>
