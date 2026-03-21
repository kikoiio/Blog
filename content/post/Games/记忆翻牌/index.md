---
title: "记忆翻牌"
date: 2026-03-21
draft: false
---

<div id="memory-game">
<style>
#memory-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', 'Noto Sans SC', sans-serif;
    user-select: none;
    -webkit-user-select: none;
    color: var(--card-text-color-main, #fff);
    padding: 10px 0;
    max-width: 700px;
    margin: 0 auto;
}
#memory-game *,
#memory-game *::before,
#memory-game *::after {
    box-sizing: border-box;
}
#memory-game .mg-hud {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    width: 100%;
}
#memory-game .mg-hud-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    padding: 8px 16px;
    min-width: 80px;
}
#memory-game .mg-hud-label {
    font-size: 0.7em;
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 2px;
}
#memory-game .mg-hud-value {
    font-size: 1.3em;
    font-weight: 700;
}
#memory-game .mg-stars {
    font-size: 1.4em;
    letter-spacing: 2px;
}
#memory-game .mg-difficulty {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
}
#memory-game .mg-diff-btn {
    padding: 8px 20px;
    border: 2px solid var(--accent-color, #5bb3b0);
    border-radius: 25px;
    background: transparent;
    color: var(--card-text-color-main, #fff);
    font-size: 0.9em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
}
#memory-game .mg-diff-btn:hover {
    background: var(--accent-color, #5bb3b0);
    color: #111;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(91,179,176,0.4);
}
#memory-game .mg-diff-btn.active {
    background: var(--accent-color, #5bb3b0);
    color: #111;
    box-shadow: 0 2px 10px rgba(91,179,176,0.3);
}
#memory-game .mg-board {
    display: grid;
    gap: 10px;
    perspective: 1200px;
    margin-bottom: 16px;
}
#memory-game .mg-board.cols-3 {
    grid-template-columns: repeat(3, 1fr);
    max-width: 340px;
}
#memory-game .mg-board.cols-4 {
    grid-template-columns: repeat(4, 1fr);
    max-width: 460px;
}
#memory-game .mg-board.cols-5 {
    grid-template-columns: repeat(5, 1fr);
    max-width: 560px;
}
#memory-game .mg-card {
    width: 100px;
    height: 120px;
    cursor: pointer;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
}
#memory-game .mg-card.flipped {
    transform: rotateY(180deg);
}
#memory-game .mg-card.matched {
    transform: rotateY(180deg);
}
#memory-game .mg-card.matched .mg-card-front {
    box-shadow: 0 0 20px rgba(72,199,142,0.6), 0 0 40px rgba(72,199,142,0.2);
    border-color: rgba(72,199,142,0.6);
    transform: scale(1.03);
}
#memory-game .mg-card.shake {
    animation: mgShake 0.5s ease-in-out;
}
@keyframes mgShake {
    0%, 100% { transform: rotateY(180deg) translateX(0); }
    20% { transform: rotateY(180deg) translateX(-8px); }
    40% { transform: rotateY(180deg) translateX(8px); }
    60% { transform: rotateY(180deg) translateX(-5px); }
    80% { transform: rotateY(180deg) translateX(5px); }
}
#memory-game .mg-card.deal {
    animation: mgDeal 0.4s ease-out both;
}
@keyframes mgDeal {
    0% { opacity: 0; transform: scale(0.3) rotateZ(15deg); }
    100% { opacity: 1; transform: scale(1) rotateZ(0deg); }
}
#memory-game .mg-card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255,255,255,0.15);
    transition: box-shadow 0.3s, border-color 0.3s, transform 0.3s;
}
#memory-game .mg-card-back {
    background:
        linear-gradient(135deg, rgba(91,179,176,0.3) 0%, rgba(91,179,176,0.05) 50%, rgba(91,179,176,0.3) 100%),
        repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px),
        repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px);
    background-color: rgba(255,255,255,0.06);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
    position: relative;
    overflow: hidden;
}
#memory-game .mg-card-back::before {
    content: '';
    position: absolute;
    inset: 6px;
    border: 1.5px solid rgba(91,179,176,0.25);
    border-radius: 8px;
}
#memory-game .mg-card-back::after {
    content: '?';
    font-size: 2em;
    font-weight: 700;
    opacity: 0.15;
    color: var(--accent-color, #5bb3b0);
}
#memory-game .mg-card-back:hover {
    border-color: rgba(91,179,176,0.4);
    box-shadow: 0 4px 25px rgba(91,179,176,0.2), 0 4px 20px rgba(0,0,0,0.3);
}
#memory-game .mg-card-front {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transform: rotateY(180deg);
    font-size: 2.8em;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
#memory-game .mg-restart-btn {
    padding: 10px 30px;
    border: 2px solid var(--accent-color, #5bb3b0);
    border-radius: 25px;
    background: transparent;
    color: var(--card-text-color-main, #fff);
    font-size: 0.95em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
    margin-top: 4px;
}
#memory-game .mg-restart-btn:hover {
    background: var(--accent-color, #5bb3b0);
    color: #111;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(91,179,176,0.4);
}
#memory-game .mg-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 9999;
    align-items: center;
    justify-content: center;
}
#memory-game .mg-overlay.show {
    display: flex;
}
#memory-game .mg-win-panel {
    background: rgba(30,30,40,0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 40px 50px;
    text-align: center;
    animation: mgPopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    max-width: 90vw;
}
@keyframes mgPopIn {
    0% { opacity: 0; transform: scale(0.5); }
    100% { opacity: 1; transform: scale(1); }
}
#memory-game .mg-win-panel h2 {
    font-size: 2em;
    margin: 0 0 8px 0;
    color: var(--accent-color, #5bb3b0);
}
#memory-game .mg-win-stars {
    font-size: 2.5em;
    margin: 10px 0;
}
#memory-game .mg-win-stats {
    font-size: 1em;
    opacity: 0.8;
    margin: 10px 0 20px;
    line-height: 1.8;
}
#memory-game .mg-confetti-canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 10000;
}
@media (max-width: 768px) {
    #memory-game .mg-card {
        width: 72px;
        height: 88px;
    }
    #memory-game .mg-card-front {
        font-size: 2em;
    }
    #memory-game .mg-card-back::after {
        font-size: 1.5em;
    }
    #memory-game .mg-board {
        gap: 7px;
    }
    #memory-game .mg-board.cols-3 {
        max-width: 250px;
    }
    #memory-game .mg-board.cols-4 {
        max-width: 330px;
    }
    #memory-game .mg-board.cols-5 {
        max-width: 400px;
    }
    #memory-game .mg-hud {
        gap: 10px;
    }
    #memory-game .mg-hud-item {
        padding: 6px 10px;
        min-width: 60px;
    }
    #memory-game .mg-hud-value {
        font-size: 1.1em;
    }
    #memory-game .mg-difficulty {
        gap: 6px;
    }
    #memory-game .mg-diff-btn {
        padding: 6px 14px;
        font-size: 0.8em;
    }
    #memory-game .mg-win-panel {
        padding: 30px 25px;
    }
}
@media (max-width: 400px) {
    #memory-game .mg-card {
        width: 60px;
        height: 74px;
    }
    #memory-game .mg-card-front {
        font-size: 1.6em;
    }
    #memory-game .mg-board {
        gap: 5px;
    }
    #memory-game .mg-board.cols-5 {
        max-width: 340px;
    }
}
</style>

<div class="mg-difficulty">
    <button class="mg-diff-btn active" data-level="easy">Easy</button>
    <button class="mg-diff-btn" data-level="medium">Medium</button>
    <button class="mg-diff-btn" data-level="hard">Hard</button>
</div>

<div class="mg-hud">
    <div class="mg-hud-item">
        <span class="mg-hud-label">Moves</span>
        <span class="mg-hud-value" id="mg-moves">0</span>
    </div>
    <div class="mg-hud-item">
        <span class="mg-hud-label">Time</span>
        <span class="mg-hud-value" id="mg-timer">0:00</span>
    </div>
    <div class="mg-hud-item">
        <span class="mg-hud-label">Matches</span>
        <span class="mg-hud-value" id="mg-matches">0 / 6</span>
    </div>
    <div class="mg-hud-item">
        <span class="mg-hud-label">Rating</span>
        <span class="mg-hud-value mg-stars" id="mg-stars"></span>
    </div>
</div>

<div class="mg-board cols-3" id="mg-board"></div>

<button class="mg-restart-btn" id="mg-restart">Play Again</button>

<div class="mg-overlay" id="mg-overlay">
    <div class="mg-win-panel">
        <h2>You Win!</h2>
        <div class="mg-win-stars" id="mg-win-stars"></div>
        <div class="mg-win-stats" id="mg-win-stats"></div>
        <button class="mg-restart-btn" id="mg-win-restart">Play Again</button>
    </div>
</div>

<script>
(function() {
    const LEVELS = {
        easy:   { pairs: 6,  cols: 3, rows: 4, star3: 8,  star2: 12 },
        medium: { pairs: 8,  cols: 4, rows: 4, star3: 12, star2: 18 },
        hard:   { pairs: 10, cols: 5, rows: 4, star3: 16, star2: 24 }
    };

    const ALL_EMOJIS = [
        '🐶','🐱','🐼','🦊','🐸','🦋','🐢','🐙',
        '🦄','🐳','🌻','🌈','🍕','🍦','🍉','🍓',
        '🎸','🚀','🎯','🏖','🌮','🧁','🦀','🐝',
        '🎪','🎠','🦩','🐧'
    ];

    const root = document.getElementById('memory-game');
    const board = document.getElementById('mg-board');
    const movesEl = document.getElementById('mg-moves');
    const timerEl = document.getElementById('mg-timer');
    const matchesEl = document.getElementById('mg-matches');
    const starsEl = document.getElementById('mg-stars');
    const overlay = document.getElementById('mg-overlay');
    const winStars = document.getElementById('mg-win-stars');
    const winStats = document.getElementById('mg-win-stats');

    let currentLevel = 'easy';
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let moves = 0;
    let timerInterval = null;
    let seconds = 0;
    let locked = false;
    let totalPairs = 6;
    let gameStarted = false;

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function getStars() {
        const lvl = LEVELS[currentLevel];
        if (moves <= lvl.star3) return 3;
        if (moves <= lvl.star2) return 2;
        return 1;
    }

    function renderStars(count) {
        return '★'.repeat(count) + '☆'.repeat(3 - count);
    }

    function updateHUD() {
        movesEl.textContent = moves;
        matchesEl.textContent = matchedPairs + ' / ' + totalPairs;
        starsEl.textContent = renderStars(getStars());
    }

    function startTimer() {
        if (timerInterval) return;
        seconds = 0;
        timerInterval = setInterval(function() {
            seconds++;
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function createConfetti() {
        const canvas = document.createElement('canvas');
        canvas.className = 'mg-confetti-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        root.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const colors = ['#5bb3b0','#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff78ae','#a855f7'];
        const particles = [];
        for (let i = 0; i < 120; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                rot: Math.random() * 360,
                rv: (Math.random() - 0.5) * 8
            });
        }
        let frame = 0;
        function animate() {
            if (frame > 180) { canvas.remove(); return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(function(p) {
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rv;
                p.vy += 0.05;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, 1 - frame / 180);
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            frame++;
            requestAnimationFrame(animate);
        }
        animate();
    }

    function showWin() {
        stopTimer();
        setTimeout(function() {
            createConfetti();
            winStars.textContent = renderStars(getStars());
            winStats.innerHTML =
                'Time: ' + formatTime(seconds) + '<br>' +
                'Moves: ' + moves + '<br>' +
                'Rating: ' + getStars() + ' / 3 Stars';
            overlay.classList.add('show');
        }, 500);
    }

    function checkMatch() {
        locked = true;
        const c1 = flippedCards[0];
        const c2 = flippedCards[1];
        moves++;
        updateHUD();

        if (c1.dataset.emoji === c2.dataset.emoji) {
            c1.classList.add('matched');
            c2.classList.add('matched');
            matchedPairs++;
            updateHUD();
            flippedCards = [];
            locked = false;
            if (matchedPairs === totalPairs) {
                showWin();
            }
        } else {
            setTimeout(function() {
                c1.classList.add('shake');
                c2.classList.add('shake');
                setTimeout(function() {
                    c1.classList.remove('flipped', 'shake');
                    c2.classList.remove('flipped', 'shake');
                    flippedCards = [];
                    locked = false;
                }, 500);
            }, 800);
        }
    }

    function onCardClick(e) {
        const card = e.currentTarget;
        if (locked) return;
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
        if (flippedCards.length >= 2) return;

        if (!gameStarted) {
            gameStarted = true;
            startTimer();
        }

        card.classList.add('flipped');
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            checkMatch();
        }
    }

    function initGame() {
        stopTimer();
        overlay.classList.remove('show');
        gameStarted = false;
        flippedCards = [];
        matchedPairs = 0;
        moves = 0;
        seconds = 0;
        timerEl.textContent = '0:00';

        const lvl = LEVELS[currentLevel];
        totalPairs = lvl.pairs;
        updateHUD();

        board.className = 'mg-board cols-' + lvl.cols;
        board.innerHTML = '';

        const emojis = shuffle([...ALL_EMOJIS]).slice(0, lvl.pairs);
        const deck = shuffle([...emojis, ...emojis]);

        deck.forEach(function(emoji, i) {
            const card = document.createElement('div');
            card.className = 'mg-card';
            card.dataset.emoji = emoji;
            card.innerHTML =
                '<div class="mg-card-face mg-card-back"></div>' +
                '<div class="mg-card-face mg-card-front">' + emoji + '</div>';
            card.addEventListener('click', onCardClick);
            card.addEventListener('touchend', function(e) {
                e.preventDefault();
                onCardClick({ currentTarget: card });
            });
            card.style.animationDelay = (i * 0.05) + 's';
            card.classList.add('deal');
            board.appendChild(card);
        });

        cards = board.querySelectorAll('.mg-card');

        // shuffle preview: briefly show all then hide
        setTimeout(function() {
            cards.forEach(function(c) { c.classList.add('flipped'); });
            setTimeout(function() {
                cards.forEach(function(c) {
                    if (!c.classList.contains('matched')) {
                        c.classList.remove('flipped');
                    }
                });
            }, 1200);
        }, 500);
    }

    // difficulty buttons
    root.querySelectorAll('.mg-diff-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            root.querySelectorAll('.mg-diff-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentLevel = btn.dataset.level;
            initGame();
        });
    });

    document.getElementById('mg-restart').addEventListener('click', initGame);
    document.getElementById('mg-win-restart').addEventListener('click', function() {
        overlay.classList.remove('show');
        initGame();
    });

    initGame();
})();
</script>
</div>
