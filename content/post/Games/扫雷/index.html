---
title: "扫雷"
date: 2026-03-21
draft: false
---

<div id="mine-game">
<style>
#mine-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
}
#mine-game * { box-sizing: border-box; }
#mine-game .mg-hud {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 600px;
    padding: 10px 16px;
    margin-bottom: 12px;
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--card-text-color-main, #ddd);
    font-variant-numeric: tabular-nums;
}
#mine-game .mg-counter {
    font-size: 1.4em;
    font-weight: 700;
    min-width: 50px;
    text-align: center;
    color: var(--accent-color, #5bb3b0);
}
#mine-game .mg-smiley {
    font-size: 1.8em;
    cursor: pointer;
    transition: transform 0.15s;
    line-height: 1;
}
#mine-game .mg-smiley:hover { transform: scale(1.2); }
#mine-game .mg-smiley:active { transform: scale(0.9); }
#mine-game .mg-difficulty {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
    flex-wrap: wrap;
    justify-content: center;
}
#mine-game .mg-diff-btn {
    padding: 6px 16px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    color: var(--card-text-color-main, #ccc);
    cursor: pointer;
    font-size: 0.85em;
    transition: all 0.2s;
}
#mine-game .mg-diff-btn:hover {
    background: rgba(255,255,255,0.12);
}
#mine-game .mg-diff-btn.active {
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    border-color: var(--accent-color, #5bb3b0);
}
#mine-game .mg-board {
    display: inline-grid;
    gap: 2px;
    padding: 8px;
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
}
#mine-game .mg-cell {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 0.9em;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.3s;
    position: relative;
}
#mine-game .mg-cell.covered {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.12);
}
#mine-game .mg-cell.covered:hover {
    background: rgba(255,255,255,0.18);
    transform: scale(1.05);
}
#mine-game .mg-cell.revealed {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    cursor: default;
    animation: mgReveal 0.25s ease-out;
}
#mine-game .mg-cell.flagged {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.12);
}
#mine-game .mg-cell.mine-hit {
    background: rgba(255,60,60,0.35) !important;
    border-color: rgba(255,60,60,0.5) !important;
    animation: mgExplode 0.4s ease-out;
}
#mine-game .mg-cell.mine-show {
    animation: mgMineReveal 0.3s ease-out both;
}
#mine-game .mg-cell .num-1 { color: #5b9bd5; }
#mine-game .mg-cell .num-2 { color: #6abf69; }
#mine-game .mg-cell .num-3 { color: #e74c3c; }
#mine-game .mg-cell .num-4 { color: #9b59b6; }
#mine-game .mg-cell .num-5 { color: #e67e22; }
#mine-game .mg-cell .num-6 { color: #1abc9c; }
#mine-game .mg-cell .num-7 { color: #34495e; }
#mine-game .mg-cell .num-8 { color: #95a5a6; }
#mine-game .mg-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: 12px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
    z-index: 10;
}
#mine-game .mg-overlay.show {
    opacity: 1;
    pointer-events: auto;
}
#mine-game .mg-overlay-text {
    font-size: 1.6em;
    font-weight: 700;
    color: #fff;
    text-align: center;
    line-height: 1.4;
}
#mine-game .mg-board-wrap {
    position: relative;
    display: inline-block;
}
@keyframes mgReveal {
    from { transform: scale(0.8); opacity: 0.3; }
    to { transform: scale(1); opacity: 1; }
}
@keyframes mgExplode {
    0% { transform: scale(1); }
    30% { transform: scale(1.3); }
    100% { transform: scale(1); }
}
@keyframes mgMineReveal {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
@media (max-width: 768px) {
    #mine-game .mg-cell {
        width: 26px;
        height: 26px;
        font-size: 0.75em;
        border-radius: 4px;
    }
    #mine-game .mg-board { gap: 1.5px; padding: 6px; }
    #mine-game .mg-hud { padding: 8px 12px; }
    #mine-game .mg-counter { font-size: 1.1em; }
    #mine-game .mg-smiley { font-size: 1.5em; }
    #mine-game .mg-diff-btn { padding: 5px 10px; font-size: 0.8em; }
}
</style>

<div class="mg-difficulty">
    <button class="mg-diff-btn active" data-diff="easy">Easy 9×9</button>
    <button class="mg-diff-btn" data-diff="medium">Medium 16×16</button>
    <button class="mg-diff-btn" data-diff="hard">Hard 16×30</button>
</div>
<div class="mg-hud">
    <div class="mg-counter" id="mg-mine-count">10</div>
    <div class="mg-smiley" id="mg-smiley">😊</div>
    <div class="mg-counter" id="mg-timer">000</div>
</div>
<div class="mg-board-wrap">
    <div class="mg-board" id="mg-board"></div>
    <div class="mg-overlay" id="mg-overlay">
        <div class="mg-overlay-text" id="mg-overlay-text"></div>
    </div>
</div>

<script>
(function() {
    const DIFFS = {
        easy:   { rows: 9,  cols: 9,  mines: 10 },
        medium: { rows: 16, cols: 16, mines: 40 },
        hard:   { rows: 16, cols: 30, mines: 99 }
    };

    let diff = 'easy', rows, cols, totalMines;
    let board, revealed, flagged, mineMap;
    let gameOver, gameWon, firstClick, minesLeft, timer, timerInterval;
    let longPressTimer = null, longPressTriggered = false;

    const boardEl = document.getElementById('mg-board');
    const mineCountEl = document.getElementById('mg-mine-count');
    const timerEl = document.getElementById('mg-timer');
    const smileyEl = document.getElementById('mg-smiley');
    const overlayEl = document.getElementById('mg-overlay');
    const overlayTextEl = document.getElementById('mg-overlay-text');
    const diffBtns = document.querySelectorAll('#mine-game .mg-diff-btn');

    function init() {
        const d = DIFFS[diff];
        rows = d.rows; cols = d.cols; totalMines = d.mines;
        board = Array.from({length: rows}, () => Array(cols).fill(0));
        revealed = Array.from({length: rows}, () => Array(cols).fill(false));
        flagged = Array.from({length: rows}, () => Array(cols).fill(false));
        mineMap = Array.from({length: rows}, () => Array(cols).fill(false));
        gameOver = false; gameWon = false; firstClick = true;
        minesLeft = totalMines; timer = 0;
        clearInterval(timerInterval); timerInterval = null;
        smileyEl.textContent = '😊';
        mineCountEl.textContent = String(minesLeft).padStart(3, '0');
        timerEl.textContent = '000';
        overlayEl.classList.remove('show');
        renderBoard();
    }

    function placeMines(safeR, safeC) {
        let placed = 0;
        while (placed < totalMines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            if (mineMap[r][c]) continue;
            if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
            mineMap[r][c] = true;
            placed++;
        }
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (mineMap[r][c]) { board[r][c] = -1; continue; }
                let cnt = 0;
                for (let dr = -1; dr <= 1; dr++)
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r+dr, nc = c+dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mineMap[nr][nc]) cnt++;
                    }
                board[r][c] = cnt;
            }
        }
    }

    function renderBoard() {
        boardEl.style.gridTemplateColumns = `repeat(${cols}, auto)`;
        boardEl.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'mg-cell covered';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('mousedown', onMouseDown);
                cell.addEventListener('contextmenu', e => e.preventDefault());
                cell.addEventListener('touchstart', onTouchStart, {passive: false});
                cell.addEventListener('touchend', onTouchEnd);
                cell.addEventListener('touchmove', onTouchMove);
                boardEl.appendChild(cell);
            }
        }
    }

    function getCell(r, c) {
        return boardEl.querySelector(`.mg-cell[data-r="${r}"][data-c="${c}"]`);
    }

    function onMouseDown(e) {
        e.preventDefault();
        const r = +this.dataset.r, c = +this.dataset.c;
        if (e.button === 2) { toggleFlag(r, c); return; }
        if (e.button === 0) revealCell(r, c);
    }

    function onTouchStart(e) {
        e.preventDefault();
        const cell = e.currentTarget;
        longPressTriggered = false;
        longPressTimer = setTimeout(() => {
            longPressTriggered = true;
            toggleFlag(+cell.dataset.r, +cell.dataset.c);
        }, 400);
    }

    function onTouchEnd(e) {
        e.preventDefault();
        clearTimeout(longPressTimer);
        if (!longPressTriggered) {
            const cell = e.currentTarget;
            revealCell(+cell.dataset.r, +cell.dataset.c);
        }
    }

    function onTouchMove() {
        clearTimeout(longPressTimer);
    }

    function toggleFlag(r, c) {
        if (gameOver || gameWon || revealed[r][c]) return;
        flagged[r][c] = !flagged[r][c];
        minesLeft += flagged[r][c] ? -1 : 1;
        mineCountEl.textContent = String(Math.max(0, minesLeft)).padStart(3, '0');
        const cell = getCell(r, c);
        if (flagged[r][c]) {
            cell.classList.add('flagged');
            cell.textContent = '🚩';
        } else {
            cell.classList.remove('flagged');
            cell.textContent = '';
        }
    }

    function revealCell(r, c) {
        if (gameOver || gameWon || flagged[r][c] || revealed[r][c]) return;
        if (firstClick) {
            firstClick = false;
            placeMines(r, c);
            startTimer();
        }
        if (mineMap[r][c]) { hitMine(r, c); return; }
        floodFill(r, c);
        checkWin();
    }

    function floodFill(r, c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        if (revealed[r][c] || flagged[r][c] || mineMap[r][c]) return;
        revealed[r][c] = true;
        const cell = getCell(r, c);
        cell.classList.remove('covered');
        cell.classList.add('revealed');
        if (board[r][c] > 0) {
            const span = document.createElement('span');
            span.className = 'num-' + board[r][c];
            span.textContent = board[r][c];
            cell.textContent = '';
            cell.appendChild(span);
        } else {
            cell.textContent = '';
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++)
                    if (dr || dc) floodFill(r+dr, c+dc);
        }
    }

    function hitMine(r, c) {
        gameOver = true;
        clearInterval(timerInterval);
        smileyEl.textContent = '😵';
        const hitCell = getCell(r, c);
        hitCell.classList.remove('covered');
        hitCell.classList.add('revealed', 'mine-hit');
        hitCell.textContent = '💣';

        let delay = 0;
        for (let mr = 0; mr < rows; mr++) {
            for (let mc = 0; mc < cols; mc++) {
                if (mineMap[mr][mc] && !(mr === r && mc === c)) {
                    delay += 30;
                    setTimeout(() => {
                        const cell = getCell(mr, mc);
                        cell.classList.remove('covered', 'flagged');
                        cell.classList.add('revealed', 'mine-show');
                        cell.textContent = '💣';
                    }, delay);
                }
            }
        }
        setTimeout(() => {
            overlayTextEl.textContent = '💥 Game Over';
            overlayEl.classList.add('show');
        }, delay + 200);
    }

    function checkWin() {
        let unrevealed = 0;
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                if (!revealed[r][c]) unrevealed++;
        if (unrevealed === totalMines) {
            gameWon = true;
            clearInterval(timerInterval);
            smileyEl.textContent = '😎';
            for (let r = 0; r < rows; r++)
                for (let c = 0; c < cols; c++)
                    if (mineMap[r][c] && !flagged[r][c]) {
                        flagged[r][c] = true;
                        const cell = getCell(r, c);
                        cell.classList.add('flagged');
                        cell.textContent = '🚩';
                    }
            mineCountEl.textContent = '000';
            overlayTextEl.textContent = '🎉 You Win!\n' + timer + 's';
            overlayEl.classList.add('show');
        }
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            timer++;
            timerEl.textContent = String(Math.min(timer, 999)).padStart(3, '0');
        }, 1000);
    }

    smileyEl.addEventListener('click', init);
    overlayEl.addEventListener('click', init);

    diffBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            diffBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            diff = this.dataset.diff;
            init();
        });
    });

    init();
})();
</script>
</div>
