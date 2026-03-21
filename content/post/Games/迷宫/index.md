---
title: "迷宫"
date: 2026-03-21
draft: false
---

<div id="maze-game">
<canvas id="mz-canvas"></canvas>
<canvas id="mz-minimap"></canvas>
<div id="mz-hud">
    <div class="mz-hud-item"><span class="mz-hud-icon">&#x23F1;</span><span id="mz-timer">0:00</span></div>
    <div class="mz-hud-item"><span class="mz-hud-icon">&#x1F9ED;</span><span id="mz-moves">0</span></div>
    <div class="mz-hud-item"><span class="mz-hud-icon">&#x1F48E;</span><span id="mz-gems">0/0</span></div>
    <button id="mz-hint-btn" title="Show hint (-30s)">&#x1F4A1; Hint</button>
</div>
<div id="mz-start-screen">
    <h2>Maze Explorer</h2>
    <p>Navigate through the fog and find the exit portal!</p>
    <div class="mz-diff-group">
        <button class="mz-diff-btn mz-selected" data-size="11">Small 11x11</button>
        <button class="mz-diff-btn" data-size="21">Medium 21x21</button>
        <button class="mz-diff-btn" data-size="31">Large 31x31</button>
    </div>
    <button id="mz-start-btn">Enter the Maze</button>
    <div class="mz-controls-info">
        <p>WASD / Arrow Keys to move</p>
        <p>Swipe or use D-Pad on mobile</p>
    </div>
</div>
<div id="mz-complete-screen" style="display:none;">
    <h2>Maze Complete!</h2>
    <div id="mz-rating" class="mz-big-rating">S</div>
    <div id="mz-stats"></div>
    <button id="mz-next-btn">Next Maze &#x27A1;</button>
</div>
<div id="mz-dpad">
    <button class="mz-dpad-btn" data-dir="up">&#x25B2;</button>
    <button class="mz-dpad-btn" data-dir="left">&#x25C0;</button>
    <button class="mz-dpad-btn" data-dir="right">&#x25B6;</button>
    <button class="mz-dpad-btn" data-dir="down">&#x25BC;</button>
</div>
</div>

<style>
#maze-game {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    color: var(--card-text-color-main, #e0e0e0);
}
#maze-game * { box-sizing: border-box; }

#mz-canvas {
    display: block;
    width: 100%;
    max-width: 700px;
    border-radius: 12px;
    background: #0a0a12;
    touch-action: none;
}
#mz-minimap {
    position: absolute;
    top: 56px;
    right: 8px;
    width: 100px;
    height: 100px;
    border: 2px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: rgba(0,0,0,0.6);
    pointer-events: none;
    z-index: 5;
}
#mz-hud {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    width: 100%;
    padding: 10px 16px;
    margin-bottom: 8px;
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 15px;
    z-index: 2;
}
.mz-hud-item {
    display: flex;
    align-items: center;
    gap: 6px;
}
.mz-hud-icon { font-size: 18px; }
#mz-hint-btn {
    padding: 5px 14px;
    border: 1px solid var(--accent-color, #5bb3b0);
    border-radius: 8px;
    background: transparent;
    color: var(--accent-color, #5bb3b0);
    cursor: pointer;
    font-size: 13px;
    transition: background 0.2s;
}
#mz-hint-btn:hover { background: rgba(91,179,176,0.15); }
#mz-hint-btn:disabled { opacity: 0.4; cursor: default; }

#mz-start-screen, #mz-complete-screen {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(6,6,18,0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 12px;
    z-index: 10;
    padding: 24px;
    text-align: center;
}
#mz-start-screen h2, #mz-complete-screen h2 {
    font-size: 28px;
    margin: 0 0 8px;
    background: linear-gradient(135deg, var(--accent-color, #5bb3b0), #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
#mz-start-screen p { margin: 0 0 20px; opacity: 0.7; font-size: 14px; }
.mz-diff-group { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
.mz-diff-btn {
    padding: 8px 16px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    color: var(--card-text-color-main, #e0e0e0);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}
.mz-diff-btn.mz-selected {
    border-color: var(--accent-color, #5bb3b0);
    background: rgba(91,179,176,0.15);
    color: var(--accent-color, #5bb3b0);
}
#mz-start-btn, #mz-next-btn {
    padding: 12px 36px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent-color, #5bb3b0), #7c6ef0);
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s;
    letter-spacing: 0.5px;
}
#mz-start-btn:hover, #mz-next-btn:hover { transform: scale(1.04); box-shadow: 0 4px 24px rgba(91,179,176,0.3); }
.mz-controls-info { margin-top: 18px; opacity: 0.5; font-size: 12px; }
.mz-controls-info p { margin: 4px 0; }

.mz-big-rating {
    font-size: 64px;
    font-weight: 800;
    margin: 12px 0;
    text-shadow: 0 0 30px currentColor;
}
#mz-stats { margin-bottom: 20px; font-size: 15px; line-height: 2; }

#mz-dpad {
    display: none;
    position: relative;
    width: 140px;
    height: 140px;
    margin-top: 12px;
}
.mz-dpad-btn {
    position: absolute;
    width: 44px;
    height: 44px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    color: var(--card-text-color-main, #ccc);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s;
    -webkit-tap-highlight-color: transparent;
}
.mz-dpad-btn:active { background: rgba(91,179,176,0.25); }
.mz-dpad-btn[data-dir="up"] { top: 0; left: 50%; transform: translateX(-50%); }
.mz-dpad-btn[data-dir="down"] { bottom: 0; left: 50%; transform: translateX(-50%); }
.mz-dpad-btn[data-dir="left"] { top: 50%; left: 0; transform: translateY(-50%); }
.mz-dpad-btn[data-dir="right"] { top: 50%; right: 0; transform: translateY(-50%); }

@media (max-width: 768px) {
    #mz-dpad { display: block; }
    #mz-minimap { width: 70px; height: 70px; top: 50px; right: 4px; }
    #mz-hud { gap: 10px; font-size: 13px; padding: 8px 10px; }
    #mz-start-screen h2, #mz-complete-screen h2 { font-size: 22px; }
    .mz-diff-btn { padding: 6px 12px; font-size: 12px; }
}
</style>

<script>
(function(){
const G = document.getElementById('maze-game');
const C = document.getElementById('mz-canvas');
const ctx = C.getContext('2d');
const MM = document.getElementById('mz-minimap');
const mmCtx = MM.getContext('2d');
const timerEl = document.getElementById('mz-timer');
const movesEl = document.getElementById('mz-moves');
const gemsEl = document.getElementById('mz-gems');
const hintBtn = document.getElementById('mz-hint-btn');
const startScreen = document.getElementById('mz-start-screen');
const completeScreen = document.getElementById('mz-complete-screen');
const startBtn = document.getElementById('mz-start-btn');
const nextBtn = document.getElementById('mz-next-btn');
const ratingEl = document.getElementById('mz-rating');
const statsEl = document.getElementById('mz-stats');
const diffBtns = G.querySelectorAll('.mz-diff-btn');
const dpadBtns = G.querySelectorAll('.mz-dpad-btn');

let maze, W, H, cellSize, player, exit, gems, visited, path;
let moveCount, startTime, elapsed, penaltyTime, gemCount, totalGems;
let running = false, animFrame, selectedSize = 11;
let playerAnim = { x: 0, y: 0, tx: 0, ty: 0 };
let particles = [];
let hintPath = null, hintTimer = 0;
let portalAngle = 0;

const VIS_RADIUS = 5;
const VISITED_ALPHA = 0.18;

// Difficulty selection
diffBtns.forEach(b => {
    b.addEventListener('click', () => {
        diffBtns.forEach(x => x.classList.remove('mz-selected'));
        b.classList.add('mz-selected');
        selectedSize = parseInt(b.dataset.size);
    });
});

startBtn.addEventListener('click', () => { startScreen.style.display = 'none'; initGame(selectedSize); });
nextBtn.addEventListener('click', () => {
    completeScreen.style.display = 'none';
    let ns = selectedSize;
    if (ns === 11) ns = 21;
    else if (ns === 21) ns = 31;
    else ns = 31;
    selectedSize = ns;
    initGame(ns);
});

function generateMaze(w, h) {
    const grid = [];
    for (let y = 0; y < h; y++) {
        grid[y] = [];
        for (let x = 0; x < w; x++) grid[y][x] = 1;
    }
    function carve(cx, cy) {
        grid[cy][cx] = 0;
        const dirs = [[0,-2],[0,2],[-2,0],[2,0]];
        shuffle(dirs);
        for (const [dx, dy] of dirs) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny][nx] === 1) {
                grid[cy + dy/2][cx + dx/2] = 0;
                carve(nx, ny);
            }
        }
    }
    carve(1, 1);
    grid[1][1] = 0;
    grid[h-2][w-2] = 0;
    return grid;
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

function solveMaze(grid, sx, sy, ex, ey) {
    const w = grid[0].length, h = grid.length;
    const prev = Array.from({length: h}, () => new Array(w).fill(null));
    const q = [[sx, sy]];
    const seen = Array.from({length: h}, () => new Array(w).fill(false));
    seen[sy][sx] = true;
    while (q.length) {
        const [cx, cy] = q.shift();
        if (cx === ex && cy === ey) {
            const p = [];
            let x = ex, y = ey;
            while (x !== null) {
                p.push([x, y]);
                const pr = prev[y][x];
                if (!pr) break;
                x = pr[0]; y = pr[1];
            }
            return p.reverse();
        }
        for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
            const nx = cx+dx, ny = cy+dy;
            if (nx>=0&&nx<w&&ny>=0&&ny<h&&!seen[ny][nx]&&grid[ny][nx]===0) {
                seen[ny][nx] = true;
                prev[ny][nx] = [cx, cy];
                q.push([nx, ny]);
            }
        }
    }
    return [];
}

function placeGems(grid, count) {
    const openCells = [];
    for (let y = 1; y < grid.length-1; y++)
        for (let x = 1; x < grid[0].length-1; x++)
            if (grid[y][x] === 0 && !(x===1&&y===1) && !(x===grid[0].length-2&&y===grid.length-2))
                openCells.push([x,y]);
    shuffle(openCells);
    return openCells.slice(0, Math.min(count, openCells.length));
}

function initGame(size) {
    W = size; H = size;
    maze = generateMaze(W, H);
    player = { x: 1, y: 1 };
    exit = { x: W-2, y: H-2 };
    const gemCount_ = size === 11 ? 5 : size === 21 ? 10 : 15;
    gems = placeGems(maze, gemCount_);
    totalGems = gems.length;
    gemCount = 0;
    moveCount = 0;
    penaltyTime = 0;
    elapsed = 0;
    hintPath = null;
    hintTimer = 0;
    particles = [];
    visited = Array.from({length: H}, () => new Array(W).fill(false));
    markVisited(player.x, player.y);
    path = solveMaze(maze, 1, 1, exit.x, exit.y);

    resizeCanvas();
    playerAnim.x = player.x; playerAnim.y = player.y;
    playerAnim.tx = player.x; playerAnim.ty = player.y;
    startTime = performance.now();
    running = true;
    hintBtn.disabled = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
}

function resizeCanvas() {
    const maxW = Math.min(700, G.parentElement ? G.parentElement.clientWidth : 700);
    cellSize = Math.floor(maxW / W);
    if (cellSize < 8) cellSize = 8;
    const pw = cellSize * W;
    const ph = cellSize * H;
    C.width = pw; C.height = ph;
    C.style.width = pw + 'px'; C.style.height = ph + 'px';
    const mmSize = window.innerWidth <= 768 ? 70 : 100;
    MM.width = mmSize; MM.height = mmSize;
}

function markVisited(px, py) {
    for (let dy = -VIS_RADIUS; dy <= VIS_RADIUS; dy++)
        for (let dx = -VIS_RADIUS; dx <= VIS_RADIUS; dx++) {
            const d = Math.sqrt(dx*dx+dy*dy);
            if (d <= VIS_RADIUS) {
                const nx = px+dx, ny = py+dy;
                if (nx>=0&&nx<W&&ny>=0&&ny<H) visited[ny][nx] = true;
            }
        }
}

function movePlayer(dx, dy) {
    if (!running) return;
    const nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || nx >= W || ny < 0 || ny >= H || maze[ny][nx] === 1) return;
    player.x = nx; player.y = ny;
    playerAnim.tx = nx; playerAnim.ty = ny;
    moveCount++;
    markVisited(nx, ny);
    // Particle
    particles.push({ x: playerAnim.x, y: playerAnim.y, life: 1, dx: (Math.random()-0.5)*0.3, dy: (Math.random()-0.5)*0.3 });
    if (particles.length > 40) particles.shift();
    // Gem pickup
    gems = gems.filter(g => {
        if (g[0] === nx && g[1] === ny) { gemCount++; return false; }
        return true;
    });
    // Check exit
    if (nx === exit.x && ny === exit.y) { winGame(); }
}

function winGame() {
    running = false;
    const totalTime = elapsed + penaltyTime;
    const optimalMoves = path.length - 1;
    const efficiency = optimalMoves / Math.max(moveCount, 1);
    const gemBonus = totalGems > 0 ? gemCount / totalGems : 0;
    const score = efficiency * 0.6 + gemBonus * 0.4;
    let rating, rColor;
    if (score > 0.85) { rating = 'S'; rColor = '#ffd700'; }
    else if (score > 0.65) { rating = 'A'; rColor = '#5bb3b0'; }
    else if (score > 0.4) { rating = 'B'; rColor = '#a78bfa'; }
    else { rating = 'C'; rColor = '#f87171'; }
    ratingEl.textContent = rating;
    ratingEl.style.color = rColor;
    const m = Math.floor(totalTime/60), s = Math.floor(totalTime%60);
    statsEl.innerHTML =
        `Time: ${m}:${s.toString().padStart(2,'0')}${penaltyTime>0?' <span style="color:#f87171">(+'+penaltyTime+'s hint)</span>':''}<br>`+
        `Moves: ${moveCount} (optimal: ${optimalMoves})<br>`+
        `Gems: ${gemCount}/${totalGems}`;
    completeScreen.style.display = 'flex';
}

// Hint
hintBtn.addEventListener('click', () => {
    if (!running) return;
    hintPath = solveMaze(maze, player.x, player.y, exit.x, exit.y);
    hintTimer = 120; // frames
    penaltyTime += 30;
    hintBtn.disabled = true;
    setTimeout(() => { if(running) hintBtn.disabled = false; }, 5000);
});

// Drawing
function draw() {
    const cw = C.width, ch = C.height;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, cw, ch);

    const cs = cellSize;
    const px = playerAnim.x, py = playerAnim.y;

    // Draw maze cells
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dist = Math.sqrt((x-px)*(x-px)+(y-py)*(y-py));
            let alpha = 0;
            if (dist <= VIS_RADIUS) {
                alpha = 1 - (dist / VIS_RADIUS) * 0.6;
            } else if (visited[y][x]) {
                alpha = VISITED_ALPHA;
            }
            if (alpha <= 0) continue;

            const sx = x * cs, sy = y * cs;
            if (maze[y][x] === 1) {
                // Wall - 3D stone look
                ctx.globalAlpha = alpha;
                const grad = ctx.createLinearGradient(sx, sy, sx+cs, sy+cs);
                grad.addColorStop(0, '#3a3a50');
                grad.addColorStop(0.5, '#2a2a3a');
                grad.addColorStop(1, '#1a1a28');
                ctx.fillStyle = grad;
                ctx.fillRect(sx, sy, cs, cs);
                // Brick lines
                ctx.strokeStyle = 'rgba(80,80,110,'+alpha*0.4+')';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(sx+1, sy+1, cs-2, cs-2);
                // Top/left highlight
                ctx.fillStyle = 'rgba(100,100,140,'+alpha*0.25+')';
                ctx.fillRect(sx, sy, cs, 1.5);
                ctx.fillRect(sx, sy, 1.5, cs);
                ctx.globalAlpha = 1;
            } else {
                // Floor
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#14141f';
                ctx.fillRect(sx, sy, cs, cs);
                // Subtle floor pattern
                if ((x+y)%2===0) {
                    ctx.fillStyle = 'rgba(255,255,255,0.015)';
                    ctx.fillRect(sx, sy, cs, cs);
                }
                ctx.globalAlpha = 1;
            }
        }
    }

    // Hint path
    if (hintPath && hintTimer > 0) {
        hintTimer--;
        const a = Math.min(1, hintTimer / 30) * 0.5;
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = cs * 0.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < hintPath.length; i++) {
            const hx = hintPath[i][0]*cs + cs/2, hy = hintPath[i][1]*cs + cs/2;
            if (i===0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Gems
    const t = performance.now() / 1000;
    gems.forEach(([gx, gy]) => {
        const dist = Math.sqrt((gx-px)*(gx-px)+(gy-py)*(gy-py));
        let alpha = 0;
        if (dist <= VIS_RADIUS) alpha = 1 - (dist/VIS_RADIUS)*0.5;
        else if (visited[gy][gx]) alpha = VISITED_ALPHA * 1.5;
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        const gcx = gx*cs+cs/2, gcy = gy*cs+cs/2;
        const sparkle = 0.6 + Math.sin(t*4 + gx*3 + gy*7)*0.4;
        const r = cs*0.25*sparkle;
        // Diamond shape
        ctx.fillStyle = '#60d4f0';
        ctx.shadowColor = '#60d4f0';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(gcx, gcy-r);
        ctx.lineTo(gcx+r*0.7, gcy);
        ctx.lineTo(gcx, gcy+r*0.7);
        ctx.lineTo(gcx-r*0.7, gcy);
        ctx.closePath();
        ctx.fill();
        // Sparkle dots
        for (let i = 0; i < 3; i++) {
            const sa = t*3 + i*2.1 + gx;
            const sr = cs*0.4;
            const sdx = Math.cos(sa)*sr, sdy = Math.sin(sa)*sr;
            ctx.fillStyle = 'rgba(200,240,255,'+0.5*sparkle+')';
            ctx.beginPath();
            ctx.arc(gcx+sdx, gcy+sdy, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });

    // Exit portal
    {
        const ex_ = exit.x*cs+cs/2, ey_ = exit.y*cs+cs/2;
        const dist = Math.sqrt((exit.x-px)*(exit.x-px)+(exit.y-py)*(exit.y-py));
        let alpha = 0;
        if (dist <= VIS_RADIUS) alpha = 1 - (dist/VIS_RADIUS)*0.3;
        else if (visited[exit.y][exit.x]) alpha = VISITED_ALPHA * 2;
        if (alpha > 0) {
            ctx.globalAlpha = alpha;
            portalAngle += 0.03;
            const pr = cs*0.4;
            // Outer ring
            for (let i = 0; i < 3; i++) {
                ctx.strokeStyle = i===0?'#a78bfa':i===1?'#7c6ef0':'#5b4ec9';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const off = portalAngle + i*Math.PI*2/3;
                ctx.arc(ex_, ey_, pr - i*2, off, off + Math.PI*1.5);
                ctx.stroke();
            }
            // Center glow
            const grd = ctx.createRadialGradient(ex_, ey_, 0, ex_, ey_, pr);
            grd.addColorStop(0, 'rgba(167,139,250,0.6)');
            grd.addColorStop(1, 'rgba(167,139,250,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(ex_, ey_, pr, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Particles
    particles.forEach((p, i) => {
        p.life -= 0.025;
        p.x += p.dx;
        p.y += p.dy;
        if (p.life <= 0) return;
        ctx.globalAlpha = p.life * 0.6;
        ctx.fillStyle = 'var(--accent-color, #5bb3b0)';
        const pcx = p.x*cs+cs/2, pcy = p.y*cs+cs/2;
        ctx.beginPath();
        ctx.arc(pcx, pcy, cs*0.1*p.life, 0, Math.PI*2);
        ctx.fill();
    });
    particles = particles.filter(p => p.life > 0);
    ctx.globalAlpha = 1;

    // Player - glowing orb
    {
        const pcx = playerAnim.x*cs+cs/2, pcy = playerAnim.y*cs+cs/2;
        const pr = cs*0.3;
        // Outer glow
        const grd = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, cs*0.8);
        grd.addColorStop(0, 'rgba(91,179,176,0.35)');
        grd.addColorStop(1, 'rgba(91,179,176,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(pcx, pcy, cs*0.8, 0, Math.PI*2);
        ctx.fill();
        // Core
        const coreGrd = ctx.createRadialGradient(pcx-pr*0.2, pcy-pr*0.2, 0, pcx, pcy, pr);
        coreGrd.addColorStop(0, '#b8f0ed');
        coreGrd.addColorStop(0.6, '#5bb3b0');
        coreGrd.addColorStop(1, '#3a8a88');
        ctx.fillStyle = coreGrd;
        ctx.shadowColor = '#5bb3b0';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pcx, pcy, pr, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Vignette
    {
        const vg = ctx.createRadialGradient(cw/2, ch/2, cw*0.3, cw/2, ch/2, cw*0.7);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, cw, ch);
    }

    // Minimap
    drawMinimap();
}

function drawMinimap() {
    const mw = MM.width, mh = MM.height;
    mmCtx.fillStyle = 'rgba(0,0,0,0.8)';
    mmCtx.fillRect(0, 0, mw, mh);
    const cs = mw / W;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (!visited[y][x]) continue;
            if (maze[y][x] === 1) {
                mmCtx.fillStyle = 'rgba(60,60,80,0.7)';
            } else {
                mmCtx.fillStyle = 'rgba(40,40,55,0.9)';
            }
            mmCtx.fillRect(x*cs, y*cs, cs+0.5, cs+0.5);
        }
    }
    // Gems on minimap
    gems.forEach(([gx,gy]) => {
        if (!visited[gy][gx]) return;
        mmCtx.fillStyle = '#60d4f0';
        mmCtx.fillRect(gx*cs, gy*cs, cs+0.5, cs+0.5);
    });
    // Exit
    if (visited[exit.y][exit.x]) {
        mmCtx.fillStyle = '#a78bfa';
        mmCtx.fillRect(exit.x*cs, exit.y*cs, Math.max(cs,2)+0.5, Math.max(cs,2)+0.5);
    }
    // Player
    mmCtx.fillStyle = '#5bb3b0';
    mmCtx.fillRect(player.x*cs-0.5, player.y*cs-0.5, Math.max(cs,2)+1, Math.max(cs,2)+1);
}

function updateTimer() {
    if (!running) return;
    elapsed = (performance.now() - startTime) / 1000;
    const total = elapsed + penaltyTime;
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    timerEl.textContent = m + ':' + s.toString().padStart(2, '0');
    movesEl.textContent = moveCount;
    gemsEl.textContent = gemCount + '/' + totalGems;
}

function loop() {
    // Smooth player movement
    const speed = 0.25;
    playerAnim.x += (playerAnim.tx - playerAnim.x) * speed;
    playerAnim.y += (playerAnim.ty - playerAnim.y) * speed;
    if (Math.abs(playerAnim.x - playerAnim.tx) < 0.01) playerAnim.x = playerAnim.tx;
    if (Math.abs(playerAnim.y - playerAnim.ty) < 0.01) playerAnim.y = playerAnim.ty;

    updateTimer();
    draw();
    if (running) animFrame = requestAnimationFrame(loop);
}

// Input: Keyboard
document.addEventListener('keydown', e => {
    if (!running) return;
    switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': movePlayer(0,-1); e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': movePlayer(0,1); e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A': movePlayer(-1,0); e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': movePlayer(1,0); e.preventDefault(); break;
    }
});

// Input: D-Pad
dpadBtns.forEach(btn => {
    btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        const d = btn.dataset.dir;
        if (d==='up') movePlayer(0,-1);
        else if (d==='down') movePlayer(0,1);
        else if (d==='left') movePlayer(-1,0);
        else if (d==='right') movePlayer(1,0);
    });
});

// Input: Swipe
let touchStart = null;
C.addEventListener('touchstart', e => {
    if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
C.addEventListener('touchend', e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) { touchStart = null; return; }
    if (absDx > absDy) movePlayer(dx > 0 ? 1 : -1, 0);
    else movePlayer(0, dy > 0 ? 1 : -1);
    touchStart = null;
}, { passive: true });

// Resize handling
window.addEventListener('resize', () => { if (running) { resizeCanvas(); draw(); } });

// Initial draw of empty canvas
resizeCanvas();
ctx.fillStyle = '#0a0a12';
ctx.fillRect(0, 0, C.width, C.height);
})();
</script>
