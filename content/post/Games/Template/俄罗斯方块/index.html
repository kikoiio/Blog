---
title: "俄罗斯方块"
date: 2026-03-20
draft: false
---

<div id="tetris-game">
<style>
#tetris-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#tetris-game .game-wrapper {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}
#tetris-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    background: rgba(0,0,0,0.6);
    display: block;
}
#tetris-game .side-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 120px;
}
#tetris-game .info-box {
    background: rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    color: var(--card-text-color-main, #ccc);
}
#tetris-game .info-box h3 {
    margin: 0 0 6px 0;
    font-size: 13px;
    opacity: 0.7;
    font-weight: 500;
}
#tetris-game .info-box .value {
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
#tetris-game #next-canvas {
    border: none;
    background: rgba(255,255,255,0.08);
    border-radius: 8px;
}
#tetris-game .controls {
    margin-top: 16px;
    font-size: 12px;
    color: var(--card-text-color-main, #999);
    opacity: 0.6;
    text-align: center;
    line-height: 1.8;
}
#tetris-game .btn {
    display: inline-block;
    padding: 8px 20px;
    margin-top: 12px;
    border: none;
    border-radius: 6px;
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
}
#tetris-game .btn:hover { opacity: 0.85; }
#tetris-game .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.65);
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
#tetris-game .canvas-wrap {
    position: relative;
    display: inline-block;
}

/* Mobile controls */
#tetris-game .mobile-controls {
    display: none;
    margin-top: 16px;
    gap: 8px;
}
#tetris-game .mobile-controls button {
    width: 56px; height: 56px;
    border: none;
    border-radius: 12px;
    background: rgba(255,255,255,0.12);
    color: var(--card-text-color-main, #fff);
    font-size: 22px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
}
#tetris-game .mobile-controls button:active {
    background: rgba(255,255,255,0.25);
}
#tetris-game .mobile-row {
    display: flex;
    gap: 8px;
    justify-content: center;
}

@media (max-width: 768px) {
    #tetris-game .game-wrapper {
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    #tetris-game .side-panel {
        flex-direction: row;
        min-width: unset;
    }
    #tetris-game .mobile-controls { display: flex; flex-direction: column; }
    #tetris-game .controls { display: none; }
}
</style>

<div class="game-wrapper">
    <div class="canvas-wrap">
        <canvas id="tetris-canvas"></canvas>
        <div class="overlay" id="tetris-overlay">
            <div>俄罗斯方块</div>
            <button class="btn" id="tetris-start">开始游戏</button>
        </div>
    </div>
    <div class="side-panel">
        <div class="info-box">
            <h3>下一个</h3>
            <canvas id="next-canvas" width="100" height="80"></canvas>
        </div>
        <div class="info-box">
            <h3>分数</h3>
            <div class="value" id="tetris-score">0</div>
        </div>
        <div class="info-box">
            <h3>行数</h3>
            <div class="value" id="tetris-lines">0</div>
        </div>
        <div class="info-box">
            <h3>等级</h3>
            <div class="value" id="tetris-level">1</div>
        </div>
    </div>
</div>
<div class="controls">
    ← → 移动 &nbsp;|&nbsp; ↑ 旋转 &nbsp;|&nbsp; ↓ 加速 &nbsp;|&nbsp; 空格 硬降
</div>
<div class="mobile-controls" id="tetris-mobile">
    <div class="mobile-row">
        <button id="mb-rotate">↻</button>
    </div>
    <div class="mobile-row">
        <button id="mb-left">←</button>
        <button id="mb-down">↓</button>
        <button id="mb-right">→</button>
    </div>
    <div class="mobile-row">
        <button id="mb-drop">⤓</button>
    </div>
</div>
</div>

<script>
(function() {
    const COLS = 10, ROWS = 20, BLOCK = 28;
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = COLS * BLOCK;
    canvas.height = ROWS * BLOCK;

    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas.getContext('2d');

    const COLORS = ['#00f0f0','#f0f000','#a000f0','#00f000','#f00000','#0000f0','#f0a000'];
    const SHAPES = [
        [[1,1,1,1]],
        [[1,1],[1,1]],
        [[0,1,0],[1,1,1]],
        [[0,1,1],[1,1,0]],
        [[1,1,0],[0,1,1]],
        [[1,0,0],[1,1,1]],
        [[0,0,1],[1,1,1]]
    ];

    let board, piece, nextPiece, score, lines, level, gameOver, paused, dropInterval, timer, animId;

    function newBoard() {
        return Array.from({length: ROWS}, () => new Array(COLS).fill(0));
    }
    function randomPiece() {
        const i = Math.floor(Math.random() * SHAPES.length);
        return { shape: SHAPES[i].map(r => [...r]), color: i + 1, x: Math.floor((COLS - SHAPES[i][0].length) / 2), y: 0 };
    }
    function rotate(shape) {
        const rows = shape.length, cols = shape[0].length;
        const r = Array.from({length: cols}, () => new Array(rows).fill(0));
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) r[x][rows - 1 - y] = shape[y][x];
        return r;
    }
    function valid(board, p, offX = 0, offY = 0) {
        for (let y = 0; y < p.shape.length; y++)
            for (let x = 0; x < p.shape[y].length; x++)
                if (p.shape[y][x]) {
                    const nx = p.x + x + offX, ny = p.y + y + offY;
                    if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
                    if (ny >= 0 && board[ny][nx]) return false;
                }
        return true;
    }
    function merge(board, p) {
        for (let y = 0; y < p.shape.length; y++)
            for (let x = 0; x < p.shape[y].length; x++)
                if (p.shape[y][x] && p.y + y >= 0) board[p.y + y][p.x + x] = p.color;
    }
    function clearLines() {
        let cleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(c => c !== 0)) {
                board.splice(y, 1);
                board.unshift(new Array(COLS).fill(0));
                cleared++;
                y++;
            }
        }
        if (cleared) {
            const pts = [0, 100, 300, 500, 800];
            score += (pts[cleared] || 800) * level;
            lines += cleared;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(100, 1000 - (level - 1) * 80);
            updateUI();
        }
    }
    function updateUI() {
        document.getElementById('tetris-score').textContent = score;
        document.getElementById('tetris-lines').textContent = lines;
        document.getElementById('tetris-level').textContent = level;
    }
    function drawBlock(ctx, x, y, colorIdx, size) {
        if (!colorIdx) return;
        const c = COLORS[colorIdx - 1];
        ctx.fillStyle = c;
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, 3);
        ctx.fillRect(x * size + 1, y * size + 1, 3, size - 2);
    }
    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x*BLOCK,0); ctx.lineTo(x*BLOCK,ROWS*BLOCK); ctx.stroke(); }
        for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0,y*BLOCK); ctx.lineTo(COLS*BLOCK,y*BLOCK); ctx.stroke(); }
        // placed blocks
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawBlock(ctx, x, y, board[y][x], BLOCK);
        // ghost
        if (piece) {
            let gy = 0;
            while (valid(board, piece, 0, gy + 1)) gy++;
            ctx.globalAlpha = 0.18;
            for (let y = 0; y < piece.shape.length; y++)
                for (let x = 0; x < piece.shape[y].length; x++)
                    if (piece.shape[y][x]) drawBlock(ctx, piece.x+x, piece.y+y+gy, piece.color, BLOCK);
            ctx.globalAlpha = 1;
            // current piece
            for (let y = 0; y < piece.shape.length; y++)
                for (let x = 0; x < piece.shape[y].length; x++)
                    if (piece.shape[y][x]) drawBlock(ctx, piece.x+x, piece.y+y, piece.color, BLOCK);
        }
    }
    function drawNext() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (!nextPiece) return;
        const s = nextPiece.shape;
        const bk = 20;
        const ox = Math.floor((nextCanvas.width - s[0].length * bk) / 2 / bk);
        const oy = Math.floor((nextCanvas.height - s.length * bk) / 2 / bk);
        for (let y = 0; y < s.length; y++)
            for (let x = 0; x < s[y].length; x++)
                if (s[y][x]) drawBlock(nextCtx, ox+x, oy+y, nextPiece.color, bk);
    }
    function drop() {
        if (valid(board, piece, 0, 1)) { piece.y++; }
        else {
            merge(board, piece);
            clearLines();
            piece = nextPiece;
            nextPiece = randomPiece();
            drawNext();
            if (!valid(board, piece)) { gameOver = true; showOverlay('游戏结束', '分数: ' + score); return; }
        }
        drawBoard();
    }
    function hardDrop() {
        while (valid(board, piece, 0, 1)) { piece.y++; score += 2; }
        drop();
        updateUI();
    }
    function move(dir) {
        if (valid(board, piece, dir, 0)) { piece.x += dir; drawBoard(); }
    }
    function rotatePiece() {
        const old = piece.shape;
        piece.shape = rotate(piece.shape);
        // wall kick
        const kicks = [0, -1, 1, -2, 2];
        let ok = false;
        for (const k of kicks) {
            if (valid(board, piece, k, 0)) { piece.x += k; ok = true; break; }
        }
        if (!ok) piece.shape = old;
        drawBoard();
    }

    let lastDrop = 0;
    function gameLoop(ts) {
        if (gameOver || paused) return;
        if (ts - lastDrop > dropInterval) { drop(); lastDrop = ts; }
        animId = requestAnimationFrame(gameLoop);
    }

    function showOverlay(title, sub) {
        const o = document.getElementById('tetris-overlay');
        o.style.display = 'flex';
        o.innerHTML = '<div>' + title + '</div>' + (sub ? '<div style="font-size:14px;opacity:0.7">' + sub + '</div>' : '') + '<button class="btn" id="tetris-start">再来一局</button>';
        document.getElementById('tetris-start').onclick = startGame;
    }

    function startGame() {
        document.getElementById('tetris-overlay').style.display = 'none';
        board = newBoard();
        score = 0; lines = 0; level = 1;
        dropInterval = 1000;
        gameOver = false; paused = false;
        piece = randomPiece();
        nextPiece = randomPiece();
        updateUI(); drawNext(); drawBoard();
        lastDrop = performance.now();
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(gameLoop);
    }

    document.getElementById('tetris-start').onclick = startGame;

    document.addEventListener('keydown', function(e) {
        if (gameOver || paused || !piece) return;
        switch(e.key) {
            case 'ArrowLeft': move(-1); e.preventDefault(); break;
            case 'ArrowRight': move(1); e.preventDefault(); break;
            case 'ArrowDown': drop(); score += 1; updateUI(); e.preventDefault(); break;
            case 'ArrowUp': rotatePiece(); e.preventDefault(); break;
            case ' ': hardDrop(); e.preventDefault(); break;
        }
    });

    // Mobile controls
    document.getElementById('mb-left').addEventListener('touchstart', function(e){e.preventDefault(); move(-1);});
    document.getElementById('mb-right').addEventListener('touchstart', function(e){e.preventDefault(); move(1);});
    document.getElementById('mb-down').addEventListener('touchstart', function(e){e.preventDefault(); drop(); score+=1; updateUI();});
    document.getElementById('mb-rotate').addEventListener('touchstart', function(e){e.preventDefault(); rotatePiece();});
    document.getElementById('mb-drop').addEventListener('touchstart', function(e){e.preventDefault(); hardDrop();});
})();
</script>
