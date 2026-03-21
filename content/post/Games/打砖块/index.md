---
title: "打砖块"
date: 2026-03-21
draft: false
---

<div id="breakout-game">
<style>
#breakout-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#breakout-game .canvas-wrap {
    position: relative;
    display: inline-block;
}
#breakout-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    display: block;
    cursor: pointer;
}
#breakout-game .overlay {
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
    gap: 12px;
    z-index: 10;
    backdrop-filter: blur(4px);
}
#breakout-game .overlay.hidden { display: none; }
#breakout-game .overlay .title {
    font-size: 32px;
    font-weight: 800;
    background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: none;
}
#breakout-game .overlay .subtitle {
    font-size: 14px;
    opacity: 0.7;
    font-weight: 400;
}
#breakout-game .overlay .score-display {
    font-size: 18px;
    color: #feca57;
}
#breakout-game .btn {
    display: inline-block;
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    letter-spacing: 0.5px;
}
#breakout-game .btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(91,179,176,0.4);
}
#breakout-game .hud {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 480px;
    padding: 8px 4px;
    color: var(--card-text-color-main, #fff);
    font-size: 14px;
    font-weight: 600;
}
#breakout-game .hud-lives span {
    margin-left: 2px;
}
#breakout-game .hud-level {
    color: var(--accent-color, #5bb3b0);
}
@media (max-width: 768px) {
    #breakout-game .overlay .title { font-size: 24px; }
    #breakout-game .overlay { font-size: 16px; }
    #breakout-game .hud { max-width: 95vw; font-size: 12px; }
}
</style>
<div class="hud">
    <div class="hud-score">Score: <span id="bo-score">0</span></div>
    <div class="hud-level" id="bo-level">Level 1</div>
    <div class="hud-lives">Lives: <span id="bo-lives"></span></div>
</div>
<div class="canvas-wrap">
    <canvas id="bo-canvas"></canvas>
    <div class="overlay" id="bo-start-overlay">
        <div class="title">BREAKOUT</div>
        <div class="subtitle">Arrow keys or touch to move paddle</div>
        <button class="btn" id="bo-start-btn">Start Game</button>
    </div>
    <div class="overlay hidden" id="bo-end-overlay">
        <div class="title" id="bo-end-title">Game Over</div>
        <div class="score-display" id="bo-end-score"></div>
        <button class="btn" id="bo-restart-btn">Play Again</button>
    </div>
</div>
<script>
(function() {
    const canvas = document.getElementById('bo-canvas');
    const ctx = canvas.getContext('2d');
    const startOverlay = document.getElementById('bo-start-overlay');
    const endOverlay = document.getElementById('bo-end-overlay');
    const endTitle = document.getElementById('bo-end-title');
    const endScore = document.getElementById('bo-end-score');
    const scoreEl = document.getElementById('bo-score');
    const livesEl = document.getElementById('bo-lives');
    const levelEl = document.getElementById('bo-level');

    /* ---- Sizing ---- */
    const BASE_W = 480, BASE_H = 600;
    let scale = 1;
    function resize() {
        const maxW = Math.min(window.innerWidth - 32, BASE_W);
        scale = maxW / BASE_W;
        canvas.width = Math.floor(BASE_W * scale);
        canvas.height = Math.floor(BASE_H * scale);
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    /* ---- Constants ---- */
    const PADDLE_H = 14, BALL_R = 7;
    const BRICK_ROWS = 6, BRICK_COLS = 10, BRICK_PAD = 4, BRICK_TOP = 60;
    const ROW_COLORS = ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#1dd1a1','#54a0ff'];
    const POWERUP_TYPES = ['wide','multi','slow'];
    const POWERUP_COLORS = {'wide':'#feca57','multi':'#ff9ff3','slow':'#48dbfb'};
    const POWERUP_CHANCE = 0.15;
    const POWERUP_SIZE = 12;
    const POWERUP_SPEED = 2.5;

    /* ---- Level layouts ---- */
    /* 0=empty, 1=normal, 2=double-hit */
    const LEVELS = [
        /* Level 1: Full classic */
        (function(){ const g=[]; for(let r=0;r<BRICK_ROWS;r++){const row=[]; for(let c=0;c<BRICK_COLS;c++) row.push(r<2?2:1); g.push(row);} return g; })(),
        /* Level 2: Diamond */
        (function(){
            const g=[];
            for(let r=0;r<BRICK_ROWS;r++){
                const row=[];
                for(let c=0;c<BRICK_COLS;c++){
                    const cx=BRICK_COLS/2-0.5, cy=BRICK_ROWS/2-0.5;
                    const dist=Math.abs(c-cx)+Math.abs(r-cy);
                    if(dist<=4) row.push(dist<=2?2:1); else row.push(0);
                }
                g.push(row);
            }
            return g;
        })(),
        /* Level 3: Checkerboard + fortress */
        (function(){
            const g=[];
            for(let r=0;r<BRICK_ROWS;r++){
                const row=[];
                for(let c=0;c<BRICK_COLS;c++){
                    if(r<2) row.push(2);
                    else if((r+c)%2===0) row.push(1);
                    else row.push(0);
                }
                g.push(row);
            }
            return g;
        })()
    ];

    /* ---- State ---- */
    let score, lives, level, paddle, balls, bricks, particles, powerups, activePowerups;
    let running = false, animId = null;
    let keys = {left:false, right:false};
    let paddleBaseW = 80;

    function brickW(){ return (BASE_W - (BRICK_COLS+1)*BRICK_PAD) / BRICK_COLS; }
    function brickH(){ return 18; }

    function initBricks(lvl){
        const layout = LEVELS[lvl % LEVELS.length];
        const bw = brickW(), bh = brickH();
        bricks = [];
        for(let r=0; r<layout.length; r++){
            for(let c=0; c<layout[r].length; c++){
                if(layout[r][c]===0) continue;
                bricks.push({
                    x: BRICK_PAD + c*(bw+BRICK_PAD),
                    y: BRICK_TOP + r*(bh+BRICK_PAD),
                    w: bw, h: bh,
                    hp: layout[r][c],
                    maxHp: layout[r][c],
                    color: ROW_COLORS[r % ROW_COLORS.length],
                    row: r
                });
            }
        }
    }

    function resetBall(){
        return {
            x: BASE_W/2, y: BASE_H - 50,
            vx: (Math.random()>0.5?1:-1) * (3 + level*0.3),
            vy: -(4 + level*0.3),
            trail: []
        };
    }

    function initLevel(){
        initBricks(level);
        balls = [resetBall()];
        powerups = [];
        activePowerups = {};
        paddle = {x: BASE_W/2, w: paddleBaseW, h: PADDLE_H, y: BASE_H-30};
    }

    function initGame(){
        score = 0; lives = 3; level = 0;
        paddleBaseW = 80;
        initLevel();
        updateHud();
    }

    function updateHud(){
        scoreEl.textContent = score;
        let hearts = '';
        for(let i=0;i<lives;i++) hearts += '\u2764 ';
        livesEl.textContent = hearts;
        levelEl.textContent = 'Level ' + (level+1);
    }

    /* ---- Particles ---- */
    function spawnParticles(x,y,color,count){
        for(let i=0;i<count;i++){
            const angle = Math.random()*Math.PI*2;
            const speed = 1 + Math.random()*3;
            particles.push({
                x:x, y:y,
                vx: Math.cos(angle)*speed,
                vy: Math.sin(angle)*speed,
                life: 30 + Math.random()*20,
                maxLife: 50,
                color: color,
                size: 2 + Math.random()*3
            });
        }
    }

    /* ---- Power-ups ---- */
    function spawnPowerup(x,y){
        if(Math.random() > POWERUP_CHANCE) return;
        const type = POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];
        powerups.push({x:x, y:y, type:type, vy:POWERUP_SPEED});
    }

    function activatePowerup(type){
        activePowerups[type] = 300; /* frames duration */
        if(type==='wide') paddle.w = paddleBaseW * 1.6;
        if(type==='multi' && balls.length < 5){
            const src = balls[0];
            for(let i=0;i<2;i++){
                balls.push({
                    x:src.x, y:src.y,
                    vx: src.vx + (i===0?2:-2),
                    vy: src.vy,
                    trail:[]
                });
            }
        }
        if(type==='slow'){
            balls.forEach(b=>{b.vx*=0.6; b.vy*=0.6;});
        }
    }

    /* ---- Drawing ---- */
    function draw(){
        ctx.save();
        ctx.scale(scale, scale);

        /* Background gradient */
        const bg = ctx.createLinearGradient(0,0,0,BASE_H);
        bg.addColorStop(0,'#0f0c29');
        bg.addColorStop(0.5,'#302b63');
        bg.addColorStop(1,'#24243e');
        ctx.fillStyle = bg;
        ctx.fillRect(0,0,BASE_W,BASE_H);

        /* Bricks */
        bricks.forEach(b=>{
            const alpha = b.hp < b.maxHp ? 0.55 : 1;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            roundRect(ctx, b.x, b.y, b.w, b.h, 3);
            ctx.fill();
            ctx.shadowBlur = 0;
            /* crack indicator for double bricks */
            if(b.maxHp===2 && b.hp===2){
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.beginPath();
                roundRect(ctx, b.x+2, b.y+2, b.w-4, b.h-4, 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        });

        /* Particles */
        particles.forEach(p=>{
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        /* Power-ups */
        powerups.forEach(pu=>{
            ctx.fillStyle = POWERUP_COLORS[pu.type];
            ctx.shadowColor = POWERUP_COLORS[pu.type];
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, POWERUP_SIZE, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labels = {wide:'W', multi:'M', slow:'S'};
            ctx.fillText(labels[pu.type], pu.x, pu.y+1);
        });

        /* Active power-up indicators */
        let piX = 8;
        Object.keys(activePowerups).forEach(type=>{
            if(activePowerups[type]>0){
                ctx.fillStyle = POWERUP_COLORS[type];
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(piX+6, 20, 6, 0, Math.PI*2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#000';
                ctx.font = 'bold 8px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const labels = {wide:'W', multi:'M', slow:'S'};
                ctx.fillText(labels[type], piX+6, 21);
                piX += 18;
            }
        });

        /* Balls */
        balls.forEach(ball=>{
            /* Trail */
            for(let i=0;i<ball.trail.length;i++){
                const t = ball.trail[i];
                const a = (i / ball.trail.length) * 0.3;
                ctx.globalAlpha = a;
                ctx.fillStyle = '#48dbfb';
                ctx.beginPath();
                ctx.arc(t.x, t.y, BALL_R * (i/ball.trail.length), 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            /* Ball glow */
            ctx.shadowColor = '#48dbfb';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        /* Paddle */
        const padGrad = ctx.createLinearGradient(paddle.x - paddle.w/2, 0, paddle.x + paddle.w/2, 0);
        padGrad.addColorStop(0, '#48dbfb');
        padGrad.addColorStop(0.5, '#fff');
        padGrad.addColorStop(1, '#48dbfb');
        ctx.fillStyle = padGrad;
        ctx.shadowColor = '#48dbfb';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        roundRect(ctx, paddle.x - paddle.w/2, paddle.y, paddle.w, paddle.h, 7);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r){
        ctx.moveTo(x+r,y);
        ctx.lineTo(x+w-r,y);
        ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r);
        ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h);
        ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r);
        ctx.quadraticCurveTo(x,y,x+r,y);
        ctx.closePath();
    }

    /* ---- Update ---- */
    function update(){
        /* Paddle movement */
        const pSpeed = 7;
        if(keys.left) paddle.x -= pSpeed;
        if(keys.right) paddle.x += pSpeed;
        paddle.x = Math.max(paddle.w/2, Math.min(BASE_W - paddle.w/2, paddle.x));

        /* Power-up timers */
        Object.keys(activePowerups).forEach(type=>{
            if(activePowerups[type]>0){
                activePowerups[type]--;
                if(activePowerups[type]<=0){
                    if(type==='wide') paddle.w = paddleBaseW;
                    delete activePowerups[type];
                }
            }
        });

        /* Power-up drops */
        for(let i=powerups.length-1; i>=0; i--){
            const pu = powerups[i];
            pu.y += pu.vy;
            /* Catch */
            if(pu.y + POWERUP_SIZE >= paddle.y &&
               pu.y - POWERUP_SIZE <= paddle.y + paddle.h &&
               pu.x >= paddle.x - paddle.w/2 &&
               pu.x <= paddle.x + paddle.w/2){
                activatePowerup(pu.type);
                powerups.splice(i,1);
                continue;
            }
            if(pu.y > BASE_H + POWERUP_SIZE) powerups.splice(i,1);
        }

        /* Balls */
        for(let bi=balls.length-1; bi>=0; bi--){
            const ball = balls[bi];
            ball.trail.push({x:ball.x, y:ball.y});
            if(ball.trail.length > 12) ball.trail.shift();

            ball.x += ball.vx;
            ball.y += ball.vy;

            /* Wall collisions */
            if(ball.x - BALL_R <= 0){ ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
            if(ball.x + BALL_R >= BASE_W){ ball.x = BASE_W - BALL_R; ball.vx = -Math.abs(ball.vx); }
            if(ball.y - BALL_R <= 0){ ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

            /* Paddle collision */
            if(ball.vy > 0 &&
               ball.y + BALL_R >= paddle.y &&
               ball.y + BALL_R <= paddle.y + paddle.h + 4 &&
               ball.x >= paddle.x - paddle.w/2 - BALL_R &&
               ball.x <= paddle.x + paddle.w/2 + BALL_R){
                /* Angle based on hit position */
                const hit = (ball.x - paddle.x) / (paddle.w/2);
                const maxAngle = Math.PI * 0.38;
                const angle = hit * maxAngle;
                const speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
                ball.vx = speed * Math.sin(angle);
                ball.vy = -speed * Math.cos(angle);
                ball.y = paddle.y - BALL_R;
            }

            /* Brick collision */
            for(let i=bricks.length-1; i>=0; i--){
                const b = bricks[i];
                if(ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
                   ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h){
                    /* Determine reflection side */
                    const overlapL = (ball.x + BALL_R) - b.x;
                    const overlapR = (b.x + b.w) - (ball.x - BALL_R);
                    const overlapT = (ball.y + BALL_R) - b.y;
                    const overlapB = (b.y + b.h) - (ball.y - BALL_R);
                    const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
                    if(minOverlap === overlapT || minOverlap === overlapB) ball.vy = -ball.vy;
                    else ball.vx = -ball.vx;

                    b.hp--;
                    if(b.hp <= 0){
                        spawnParticles(b.x+b.w/2, b.y+b.h/2, b.color, 12);
                        spawnPowerup(b.x+b.w/2, b.y+b.h/2);
                        bricks.splice(i,1);
                        score += 10 * b.maxHp;
                    } else {
                        spawnParticles(b.x+b.w/2, b.y+b.h/2, b.color, 4);
                        score += 5;
                    }
                    updateHud();
                    break;
                }
            }

            /* Ball lost */
            if(ball.y - BALL_R > BASE_H){
                balls.splice(bi,1);
            }
        }

        /* All balls lost */
        if(balls.length === 0){
            lives--;
            updateHud();
            if(lives <= 0){
                endGame(false);
                return;
            }
            balls = [resetBall()];
            activePowerups = {};
            paddle.w = paddleBaseW;
        }

        /* Level cleared */
        if(bricks.length === 0){
            level++;
            if(level >= LEVELS.length){
                endGame(true);
                return;
            }
            initLevel();
            updateHud();
        }

        /* Particles */
        for(let i=particles.length-1; i>=0; i--){
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life--;
            p.size *= 0.97;
            if(p.life <= 0) particles.splice(i,1);
        }
    }

    /* ---- Game loop ---- */
    function loop(){
        update();
        draw();
        if(running) animId = requestAnimationFrame(loop);
    }

    function startGame(){
        initGame();
        particles = [];
        running = true;
        startOverlay.classList.add('hidden');
        endOverlay.classList.add('hidden');
        loop();
    }

    function endGame(won){
        running = false;
        if(animId) cancelAnimationFrame(animId);
        endTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER';
        endTitle.style.background = won
            ? 'linear-gradient(135deg, #feca57, #1dd1a1)'
            : 'linear-gradient(135deg, #ff6b6b, #feca57)';
        endTitle.style.webkitBackgroundClip = 'text';
        endTitle.style.webkitTextFillColor = 'transparent';
        endTitle.style.backgroundClip = 'text';
        endScore.textContent = 'Score: ' + score;
        endOverlay.classList.remove('hidden');
    }

    /* ---- Controls ---- */
    document.addEventListener('keydown', function(e){
        if(e.key === 'ArrowLeft' || e.key === 'Left') keys.left = true;
        if(e.key === 'ArrowRight' || e.key === 'Right') keys.right = true;
    });
    document.addEventListener('keyup', function(e){
        if(e.key === 'ArrowLeft' || e.key === 'Left') keys.left = false;
        if(e.key === 'ArrowRight' || e.key === 'Right') keys.right = false;
    });

    /* Touch / mouse drag */
    let dragging = false;
    canvas.addEventListener('mousedown', function(e){ dragging = true; movePaddle(e); });
    canvas.addEventListener('mousemove', function(e){ if(dragging) movePaddle(e); });
    document.addEventListener('mouseup', function(){ dragging = false; });

    canvas.addEventListener('touchstart', function(e){ e.preventDefault(); movePaddle(e.touches[0]); }, {passive:false});
    canvas.addEventListener('touchmove', function(e){ e.preventDefault(); movePaddle(e.touches[0]); }, {passive:false});

    function movePaddle(e){
        if(!running) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        paddle.x = Math.max(paddle.w/2, Math.min(BASE_W - paddle.w/2, x));
    }

    document.getElementById('bo-start-btn').addEventListener('click', startGame);
    document.getElementById('bo-restart-btn').addEventListener('click', startGame);

    /* Initial HUD */
    livesEl.textContent = '\u2764 \u2764 \u2764';
})();
</script>
</div>
