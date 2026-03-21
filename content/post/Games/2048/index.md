---
title: "2048"
date: 2026-03-21
draft: false
---

<div id="game-2048">
<style>
#game-2048 {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', 'Noto Sans SC', sans-serif;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    color: var(--card-text-color-main, #fff);
}
#game-2048 * { box-sizing: border-box; }

#game-2048 .g-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 420px;
    margin-bottom: 16px;
    gap: 12px;
    flex-wrap: wrap;
}
#game-2048 .g-title {
    font-size: 42px;
    font-weight: 800;
    background: linear-gradient(135deg, #edc850, #f2b179);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
}
#game-2048 .g-scores {
    display: flex;
    gap: 8px;
}
#game-2048 .g-score-box {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 6px 16px;
    text-align: center;
    min-width: 72px;
}
#game-2048 .g-score-box .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
    font-weight: 600;
}
#game-2048 .g-score-box .val {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
#game-2048 .g-score-add {
    position: absolute;
    top: -8px;
    right: -4px;
    font-size: 14px;
    font-weight: 700;
    color: #edc850;
    animation: g2048-score-fly 0.6s ease-out forwards;
    pointer-events: none;
}
@keyframes g2048-score-fly {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
}

#game-2048 .g-buttons {
    display: flex;
    gap: 8px;
    width: 100%;
    max-width: 420px;
    margin-bottom: 16px;
}
#game-2048 .g-btn {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    color: var(--card-text-color-main, #fff);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
}
#game-2048 .g-btn:hover {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.25);
}
#game-2048 .g-btn:active {
    transform: scale(0.96);
}
#game-2048 .g-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

#game-2048 .g-board {
    position: relative;
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 10px;
    width: 420px;
    height: 420px;
}
#game-2048 .g-grid {
    position: absolute;
    top: 10px; left: 10px; right: 10px; bottom: 10px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 8px;
}
#game-2048 .g-cell {
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
}

#game-2048 .g-tiles {
    position: absolute;
    top: 10px; left: 10px; right: 10px; bottom: 10px;
}
#game-2048 .g-tile {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-weight: 800;
    transition: top 0.12s ease, left 0.12s ease;
    z-index: 1;
}
#game-2048 .g-tile.merged {
    animation: g2048-pop 0.2s ease;
    z-index: 2;
}
#game-2048 .g-tile.new-tile {
    animation: g2048-appear 0.2s ease;
}
@keyframes g2048-appear {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
}
@keyframes g2048-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
}

/* Tile colors */
#game-2048 .g-tile[data-val="2"]    { background: #eee4da; color: #776e65; }
#game-2048 .g-tile[data-val="4"]    { background: #ede0c8; color: #776e65; }
#game-2048 .g-tile[data-val="8"]    { background: #f2b179; color: #f9f6f2; }
#game-2048 .g-tile[data-val="16"]   { background: #f59563; color: #f9f6f2; }
#game-2048 .g-tile[data-val="32"]   { background: #f67c5f; color: #f9f6f2; }
#game-2048 .g-tile[data-val="64"]   { background: #f65e3b; color: #f9f6f2; }
#game-2048 .g-tile[data-val="128"]  { background: #edcf72; color: #f9f6f2; box-shadow: 0 0 20px 4px rgba(237,207,114,0.3); }
#game-2048 .g-tile[data-val="256"]  { background: #edcc61; color: #f9f6f2; box-shadow: 0 0 24px 6px rgba(237,204,97,0.35); }
#game-2048 .g-tile[data-val="512"]  { background: #edc850; color: #f9f6f2; box-shadow: 0 0 28px 8px rgba(237,200,80,0.4); }
#game-2048 .g-tile[data-val="1024"] { background: #edc53f; color: #f9f6f2; box-shadow: 0 0 32px 10px rgba(237,197,63,0.45); }
#game-2048 .g-tile[data-val="2048"] { background: #edc22e; color: #f9f6f2; box-shadow: 0 0 40px 14px rgba(237,194,46,0.5); animation: g2048-glow 1.5s ease-in-out infinite alternate; }
#game-2048 .g-tile.super            { background: #3c3a32; color: #f9f6f2; box-shadow: 0 0 30px 8px rgba(60,58,50,0.4); }

@keyframes g2048-glow {
    0% { box-shadow: 0 0 40px 14px rgba(237,194,46,0.5); }
    100% { box-shadow: 0 0 60px 20px rgba(237,194,46,0.7); }
}

/* Overlay */
#game-2048 .g-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    opacity: 0;
    animation: g2048-fade-in 0.3s ease forwards;
}
@keyframes g2048-fade-in {
    to { opacity: 1; }
}
#game-2048 .g-overlay .msg {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 16px;
}
#game-2048 .g-overlay .msg.win {
    background: linear-gradient(135deg, #edc850, #f2b179);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
#game-2048 .g-overlay .g-btn {
    flex: none;
    padding: 10px 24px;
    margin: 4px;
}

/* Mobile */
@media (max-width: 768px) {
    #game-2048 .g-board {
        width: calc(100vw - 48px);
        height: calc(100vw - 48px);
        max-width: 360px;
        max-height: 360px;
    }
    #game-2048 .g-header {
        max-width: calc(100vw - 48px);
    }
    #game-2048 .g-buttons {
        max-width: calc(100vw - 48px);
    }
    #game-2048 .g-title {
        font-size: 32px;
    }
    #game-2048 .g-score-box {
        padding: 4px 10px;
        min-width: 60px;
    }
    #game-2048 .g-score-box .val {
        font-size: 16px;
    }
}
</style>

<div class="g-header">
    <div class="g-title">2048</div>
    <div class="g-scores">
        <div class="g-score-box" style="position:relative;">
            <div class="label">Score</div>
            <div class="val" id="g2048-score">0</div>
        </div>
        <div class="g-score-box">
            <div class="label">Best</div>
            <div class="val" id="g2048-best">0</div>
        </div>
    </div>
</div>
<div class="g-buttons">
    <button class="g-btn" id="g2048-undo">&#8630; Undo</button>
    <button class="g-btn" id="g2048-new">New Game</button>
</div>
<div class="g-board" id="g2048-board">
    <div class="g-grid">
        <div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div>
        <div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div>
        <div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div>
        <div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div><div class="g-cell"></div>
    </div>
    <div class="g-tiles" id="g2048-tiles"></div>
</div>

<script>
(function() {
    const SIZE = 4;
    const board = document.getElementById('g2048-board');
    const tilesEl = document.getElementById('g2048-tiles');
    const scoreEl = document.getElementById('g2048-score');
    const bestEl = document.getElementById('g2048-best');
    const undoBtn = document.getElementById('g2048-undo');
    const newBtn = document.getElementById('g2048-new');

    let grid, score, best, won, over, keepPlaying, prevState, moving;

    function init() {
        grid = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
        score = 0;
        won = false;
        over = false;
        keepPlaying = false;
        prevState = null;
        moving = false;
        best = parseInt(localStorage.getItem('g2048-best') || '0');
        undoBtn.disabled = true;
        addTile();
        addTile();
        render();
    }

    function savePrev() {
        prevState = {
            grid: grid.map(r => [...r]),
            score: score
        };
        undoBtn.disabled = false;
    }

    function undo() {
        if (!prevState) return;
        grid = prevState.grid;
        score = prevState.score;
        prevState = null;
        won = false;
        over = false;
        keepPlaying = false;
        undoBtn.disabled = true;
        removeOverlay();
        render();
    }

    function addTile() {
        const empty = [];
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                if (grid[r][c] === 0) empty.push([r, c]);
        if (!empty.length) return;
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        return [r, c];
    }

    function getPos(r, c) {
        const gap = 8;
        const pad = 0;
        const boardW = tilesEl.clientWidth;
        const cellW = (boardW - gap * (SIZE - 1)) / SIZE;
        return {
            left: pad + c * (cellW + gap),
            top: pad + r * (cellW + gap),
            size: cellW
        };
    }

    function render(newTile, mergedCells) {
        tilesEl.innerHTML = '';
        const fontSize = (sz) => {
            if (sz > 70) return sz * 0.42;
            if (sz > 50) return sz * 0.38;
            return sz * 0.34;
        };
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) continue;
                const val = grid[r][c];
                const pos = getPos(r, c);
                const tile = document.createElement('div');
                tile.className = 'g-tile';
                if (val > 2048) tile.classList.add('super');
                tile.setAttribute('data-val', Math.min(val, 2048));
                if (newTile && newTile[0] === r && newTile[1] === c) {
                    tile.classList.add('new-tile');
                }
                if (mergedCells && mergedCells.some(m => m[0] === r && m[1] === c)) {
                    tile.classList.add('merged');
                }
                tile.style.width = pos.size + 'px';
                tile.style.height = pos.size + 'px';
                tile.style.left = pos.left + 'px';
                tile.style.top = pos.top + 'px';
                tile.style.fontSize = fontSize(pos.size) + 'px';
                tile.textContent = val;
                tilesEl.appendChild(tile);
            }
        }
        scoreEl.textContent = score;
        if (score > best) {
            best = score;
            localStorage.setItem('g2048-best', best);
        }
        bestEl.textContent = best;
    }

    function slide(row) {
        let arr = row.filter(v => v !== 0);
        const merged = [];
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                score += arr[i];
                merged.push(i);
                arr[i + 1] = 0;
            }
        }
        arr = arr.filter(v => v !== 0);
        while (arr.length < SIZE) arr.push(0);
        return { result: arr, merged };
    }

    function move(dir) {
        if (moving || over || (won && !keepPlaying)) return;
        moving = true;
        savePrev();
        let moved = false;
        const mergedCells = [];

        if (dir === 'left' || dir === 'right') {
            for (let r = 0; r < SIZE; r++) {
                let row = [...grid[r]];
                if (dir === 'right') row.reverse();
                const { result, merged } = slide(row);
                if (dir === 'right') result.reverse();
                if (row.join(',') !== (dir === 'right' ? [...grid[r]].reverse().join(',') : grid[r].join(','))) {
                    // check if actually changed
                }
                if (result.join(',') !== grid[r].join(',')) moved = true;
                for (const mi of merged) {
                    const actualC = dir === 'right' ? SIZE - 1 - mi : mi;
                    mergedCells.push([r, actualC]);
                }
                grid[r] = result;
            }
        } else {
            for (let c = 0; c < SIZE; c++) {
                let col = [];
                for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
                const origCol = [...col];
                if (dir === 'down') col.reverse();
                const { result, merged } = slide(col);
                if (dir === 'down') result.reverse();
                if (result.join(',') !== origCol.join(',')) moved = true;
                for (const mi of merged) {
                    const actualR = dir === 'down' ? SIZE - 1 - mi : mi;
                    mergedCells.push([actualR, c]);
                }
                for (let r = 0; r < SIZE; r++) grid[r][c] = result[r];
            }
        }

        if (!moved) {
            prevState = null;
            undoBtn.disabled = !prevState;
            moving = false;
            return;
        }

        // Show score pop
        if (score > prevState.score) {
            showScoreAdd(score - prevState.score);
        }

        const nt = addTile();
        render(nt, mergedCells);

        // Check win
        if (!won && !keepPlaying) {
            for (let r = 0; r < SIZE; r++)
                for (let c = 0; c < SIZE; c++)
                    if (grid[r][c] === 2048) { won = true; showWin(); moving = false; return; }
        }

        // Check game over
        if (isGameOver()) {
            over = true;
            setTimeout(() => showGameOver(), 300);
        }

        setTimeout(() => { moving = false; }, 130);
    }

    function showScoreAdd(pts) {
        const box = scoreEl.parentElement;
        const pop = document.createElement('div');
        pop.className = 'g-score-add';
        pop.textContent = '+' + pts;
        box.appendChild(pop);
        setTimeout(() => pop.remove(), 600);
    }

    function isGameOver() {
        for (let r = 0; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) return false;
                if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
                if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
            }
        return true;
    }

    function removeOverlay() {
        const old = board.querySelector('.g-overlay');
        if (old) old.remove();
    }

    function showWin() {
        removeOverlay();
        const ov = document.createElement('div');
        ov.className = 'g-overlay';
        ov.innerHTML = `
            <div class="msg win">You Win!</div>
            <div>
                <button class="g-btn" id="g2048-continue">Keep Going</button>
                <button class="g-btn" id="g2048-restart-win">New Game</button>
            </div>
        `;
        board.appendChild(ov);
        ov.querySelector('#g2048-continue').onclick = () => { keepPlaying = true; removeOverlay(); };
        ov.querySelector('#g2048-restart-win').onclick = () => { removeOverlay(); init(); };
    }

    function showGameOver() {
        removeOverlay();
        const ov = document.createElement('div');
        ov.className = 'g-overlay';
        ov.innerHTML = `
            <div class="msg">Game Over</div>
            <div>
                <button class="g-btn" id="g2048-retry">Try Again</button>
            </div>
        `;
        board.appendChild(ov);
        ov.querySelector('#g2048-retry').onclick = () => { removeOverlay(); init(); };
    }

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (!board.closest('body')) return;
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
        if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    });

    // Touch / Swipe
    let touchX, touchY;
    board.addEventListener('touchstart', (e) => {
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
    }, { passive: true });
    board.addEventListener('touchend', (e) => {
        if (touchX == null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) < 30) return;
        if (absDx > absDy) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
        touchX = touchY = null;
    }, { passive: true });

    // Buttons
    undoBtn.addEventListener('click', undo);
    newBtn.addEventListener('click', () => { removeOverlay(); init(); });

    // Handle resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => render(), 100);
    });

    init();
})();
</script>
</div>
