---
title: "太空射击"
date: 2026-03-21
draft: false
---

<div id="space-game">
<style>
#space-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Inter', sans-serif;
    user-select: none;
    -webkit-user-select: none;
}
#space-game .canvas-wrap {
    position: relative;
    display: inline-block;
}
#space-game canvas {
    border: 2px solid var(--card-text-color-main, #fff);
    border-radius: 8px;
    display: block;
    cursor: crosshair;
    background: #0a0a1a;
}
#space-game .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(5,5,20,0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #fff;
    font-size: 20px;
    font-weight: 600;
    gap: 10px;
    z-index: 10;
}
#space-game .overlay.hidden { display: none; }
#space-game .btn {
    display: inline-block;
    padding: 10px 28px;
    border: none;
    border-radius: 6px;
    background: var(--accent-color, #5bb3b0);
    color: #fff;
    font-size: 15px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    transition: transform 0.1s, opacity 0.1s;
    margin-top: 6px;
}
#space-game .btn:hover { transform: scale(1.05); opacity: 0.9; }
#space-game .title-text {
    font-size: 32px;
    font-weight: 700;
    color: var(--accent-color, #5bb3b0);
    text-shadow: 0 0 20px var(--accent-color, #5bb3b0);
    margin-bottom: 4px;
}
#space-game .sub-text {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    font-weight: 400;
}
#space-game .score-text {
    font-size: 28px;
    color: var(--accent-color, #5bb3b0);
}
#space-game .info-row {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    font-weight: 400;
}
@media (max-width: 768px) {
    #space-game .title-text { font-size: 24px; }
    #space-game .btn { padding: 8px 22px; font-size: 14px; }
}
</style>

<div class="canvas-wrap">
    <canvas id="sg-canvas"></canvas>
    <div class="overlay" id="sg-start">
        <div class="title-text">太 空 射 击</div>
        <div class="sub-text">方向键移动 / 空格射击</div>
        <div class="sub-text">移动端拖拽移动 / 自动射击</div>
        <button class="btn" id="sg-start-btn">开始游戏</button>
    </div>
    <div class="overlay hidden" id="sg-over">
        <div style="font-size:22px;">游戏结束</div>
        <div class="score-text" id="sg-final-score">0</div>
        <div class="info-row" id="sg-final-info"></div>
        <button class="btn" id="sg-restart-btn">再来一局</button>
    </div>
</div>
</div>

<script>
(function(){
const canvas = document.getElementById('sg-canvas');
const ctx = canvas.getContext('2d');
const startOverlay = document.getElementById('sg-start');
const overOverlay = document.getElementById('sg-over');
const finalScoreEl = document.getElementById('sg-final-score');
const finalInfoEl = document.getElementById('sg-final-info');

let W, H, dpr;
function resize() {
    const wrap = canvas.parentElement;
    const maxW = Math.min(wrap.parentElement.clientWidth - 4, 480);
    const ratio = window.innerWidth <= 768 ? 1.4 : 1.3;
    W = maxW;
    H = Math.floor(maxW * ratio);
    dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', resize);

const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#5bb3b0';

// --- GAME STATE ---
let state = 'start'; // start, playing, over
let score, lives, wave, waveTimer, waveDelay, enemiesLeft, bossWave;
let player, bullets, enemies, particles, powerups, enemyBullets, stars;
let combo, comboTimer, shakeX, shakeY, shakeDur;
let isMobile = false;
let touchId = null, touchStartX = 0, touchStartY = 0, touchPlayerX = 0, touchPlayerY = 0;
let mobileAutoFire = 0;
let keys = {};

// --- STARS ---
function initStars() {
    stars = [];
    for (let layer = 0; layer < 3; layer++) {
        const count = 30 + layer * 25;
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: 0.5 + Math.random() * (1.2 - layer * 0.3),
                speed: 0.3 + layer * 0.4 + Math.random() * 0.3,
                alpha: 0.3 + Math.random() * 0.5 + layer * 0.1
            });
        }
    }
}

function updateStars() {
    for (const s of stars) {
        s.y += s.speed;
        if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
    }
}

function drawStars() {
    for (const s of stars) {
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// --- PLAYER ---
function initPlayer() {
    player = {
        x: W / 2, y: H - 60, w: 28, h: 32,
        speed: 4.5, invincible: 0, blinkTimer: 0,
        shield: false, rapidFire: false, spreadShot: false,
        rapidTimer: 0, spreadTimer: 0,
        enginePhase: 0
    };
}

function drawPlayer() {
    if (player.invincible > 0) {
        player.blinkTimer++;
        if (player.blinkTimer % 8 < 4) return;
    }
    const x = player.x, y = player.y;
    player.enginePhase += 0.15;

    ctx.save();
    // Engine glow
    const engineGlow = 8 + Math.sin(player.enginePhase) * 3;
    const grad = ctx.createRadialGradient(x, y + 16, 2, x, y + 16 + engineGlow, engineGlow + 4);
    grad.addColorStop(0, 'rgba(255,180,50,0.9)');
    grad.addColorStop(0.5, 'rgba(255,80,20,0.4)');
    grad.addColorStop(1, 'rgba(255,40,10,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 10, y + 12, 20, engineGlow + 8);

    // Ship body
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 14, y + 14);
    ctx.lineTo(x + 6, y + 10);
    ctx.lineTo(x + 4, y + 16);
    ctx.lineTo(x - 4, y + 16);
    ctx.lineTo(x - 6, y + 10);
    ctx.lineTo(x - 14, y + 14);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shield
    if (player.shield) {
        ctx.strokeStyle = 'rgba(100,200,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(100,200,255,0.2)';
        ctx.lineWidth = 5;
        ctx.stroke();
    }
    ctx.restore();
}

function updatePlayer() {
    const sp = player.speed;
    if (keys['ArrowLeft'] || keys['a']) player.x -= sp;
    if (keys['ArrowRight'] || keys['d']) player.x += sp;
    if (keys['ArrowUp'] || keys['w']) player.y -= sp;
    if (keys['ArrowDown'] || keys['s']) player.y += sp;
    player.x = Math.max(16, Math.min(W - 16, player.x));
    player.y = Math.max(20, Math.min(H - 20, player.y));
    if (player.invincible > 0) player.invincible--;
    if (player.rapidTimer > 0) { player.rapidTimer--; if (player.rapidTimer <= 0) player.rapidFire = false; }
    if (player.spreadTimer > 0) { player.spreadTimer--; if (player.spreadTimer <= 0) player.spreadShot = false; }
}

// --- BULLETS ---
function shoot() {
    const interval = player.rapidFire ? 6 : 12;
    if (bullets._cooldown > 0) return;
    bullets._cooldown = interval;
    const bx = player.x, by = player.y - 18;
    bullets.push({ x: bx, y: by, speed: 8 });
    if (player.spreadShot) {
        bullets.push({ x: bx - 8, y: by + 4, speed: 8, dx: -1.5 });
        bullets.push({ x: bx + 8, y: by + 4, speed: 8, dx: 1.5 });
    }
}

function updateBullets() {
    if (bullets._cooldown > 0) bullets._cooldown--;
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y -= b.speed;
        if (b.dx) b.x += b.dx;
        if (b.y < -10 || b.x < -10 || b.x > W + 10) bullets.splice(i, 1);
    }
}

function drawBullets() {
    for (const b of bullets) {
        ctx.save();
        // Glow
        const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 6);
        g.addColorStop(0, accentColor);
        g.addColorStop(1, 'rgba(91,179,176,0)');
        ctx.fillStyle = g;
        ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
        // Core
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x - 1.5, b.y - 5, 3, 10);
        ctx.restore();
    }
}

// --- ENEMY BULLETS ---
function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.dx;
        b.y += b.dy;
        if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) {
            enemyBullets.splice(i, 1);
            continue;
        }
        // Hit player
        if (player.invincible <= 0) {
            const dx = b.x - player.x, dy = b.y - player.y;
            if (Math.abs(dx) < 12 && Math.abs(dy) < 14) {
                enemyBullets.splice(i, 1);
                hitPlayer();
            }
        }
    }
}

function drawEnemyBullets() {
    for (const b of enemyBullets) {
        ctx.save();
        ctx.fillStyle = b.color || '#ff4444';
        ctx.shadowColor = b.color || '#ff4444';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- ENEMIES ---
const ENEMY_TYPES = {
    basic: { w: 22, h: 20, hp: 1, speed: 1.5, score: 100, color: '#ff5555' },
    zigzag: { w: 20, h: 18, hp: 1, speed: 1.8, score: 150, color: '#ffaa33' },
    fast: { w: 16, h: 14, hp: 1, speed: 3, score: 200, color: '#ff55ff' },
    tough: { w: 26, h: 24, hp: 3, speed: 1.2, score: 300, color: '#55aaff' },
    boss: { w: 50, h: 45, hp: 20, speed: 0.6, score: 2000, color: '#ff3333' }
};

function spawnWave() {
    wave++;
    bossWave = (wave % 5 === 0);
    waveDelay = 90;
    if (bossWave) {
        enemiesLeft = 1;
        const boss = createEnemy('boss', W / 2, -50);
        boss.hp = 15 + wave * 2;
        boss.maxHp = boss.hp;
        boss.shootTimer = 60;
        enemies.push(boss);
    } else {
        const count = 3 + Math.floor(wave * 1.3);
        enemiesLeft = count;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (state !== 'playing') return;
                const types = ['basic'];
                if (wave >= 2) types.push('zigzag');
                if (wave >= 3) types.push('fast');
                if (wave >= 4) types.push('tough');
                const type = types[Math.floor(Math.random() * types.length)];
                const ex = 30 + Math.random() * (W - 60);
                enemies.push(createEnemy(type, ex, -20 - Math.random() * 30));
            }, i * (400 - Math.min(wave * 15, 250)));
        }
    }
}

function createEnemy(type, x, y) {
    const def = ENEMY_TYPES[type];
    return {
        type, x, y, w: def.w, h: def.h,
        hp: def.hp, maxHp: def.hp,
        speed: def.speed + wave * 0.05,
        score: def.score, color: def.color,
        phase: Math.random() * Math.PI * 2,
        shootTimer: type === 'tough' ? 120 + Math.random() * 60 : 0,
        alive: true
    };
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.phase += 0.03;

        if (e.type === 'zigzag') {
            e.y += e.speed;
            e.x += Math.sin(e.phase * 3) * 2.5;
        } else if (e.type === 'fast') {
            e.y += e.speed;
            e.x += Math.cos(e.phase * 2) * 1;
        } else if (e.type === 'boss') {
            if (e.y < 60) e.y += e.speed;
            else e.x += Math.sin(e.phase) * 1.5;
            e.shootTimer--;
            if (e.shootTimer <= 0) {
                e.shootTimer = Math.max(20, 50 - wave);
                const angle = Math.atan2(player.y - e.y, player.x - e.x);
                enemyBullets.push({ x: e.x, y: e.y + e.h / 2, dx: Math.cos(angle) * 3, dy: Math.sin(angle) * 3, color: '#ff6644' });
                if (wave >= 10) {
                    enemyBullets.push({ x: e.x, y: e.y + e.h / 2, dx: Math.cos(angle - 0.3) * 3, dy: Math.sin(angle - 0.3) * 3, color: '#ff6644' });
                    enemyBullets.push({ x: e.x, y: e.y + e.h / 2, dx: Math.cos(angle + 0.3) * 3, dy: Math.sin(angle + 0.3) * 3, color: '#ff6644' });
                }
            }
        } else {
            e.y += e.speed;
        }

        // Tough enemies shoot
        if (e.type === 'tough' && wave >= 4) {
            e.shootTimer--;
            if (e.shootTimer <= 0) {
                e.shootTimer = 100 + Math.random() * 60;
                enemyBullets.push({ x: e.x, y: e.y + e.h / 2, dx: 0, dy: 3, color: '#55aaff' });
            }
        }

        e.x = Math.max(e.w / 2, Math.min(W - e.w / 2, e.x));

        // Off screen
        if (e.y > H + 40) {
            enemies.splice(i, 1);
            continue;
        }

        // Hit player
        if (player.invincible <= 0) {
            const dx = Math.abs(e.x - player.x);
            const dy = Math.abs(e.y - player.y);
            if (dx < (e.w / 2 + 10) && dy < (e.h / 2 + 12)) {
                hitPlayer();
                if (e.type !== 'boss') {
                    spawnExplosion(e.x, e.y, e.color, 8);
                    enemies.splice(i, 1);
                }
            }
        }

        // Bullet collision
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            if (Math.abs(b.x - e.x) < e.w / 2 + 4 && Math.abs(b.y - e.y) < e.h / 2 + 4) {
                bullets.splice(j, 1);
                e.hp--;
                spawnExplosion(b.x, b.y, '#fff', 3);
                if (e.hp <= 0) {
                    e.alive = false;
                    const mult = getComboMultiplier();
                    score += e.score * mult;
                    combo++;
                    comboTimer = 180;
                    spawnExplosion(e.x, e.y, e.color, e.type === 'boss' ? 30 : 12);
                    if (Math.random() < 0.12 || (e.type === 'boss')) spawnPowerup(e.x, e.y);
                    enemies.splice(i, 1);
                    enemiesLeft--;
                }
                break;
            }
        }
    }

    if (enemiesLeft <= 0 && enemies.length === 0) {
        waveTimer++;
        if (waveTimer > 60) {
            waveTimer = 0;
            spawnWave();
        }
    }
}

function drawEnemy(e) {
    ctx.save();
    const x = e.x, y = e.y;

    if (e.type === 'boss') {
        // Boss body
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(x, y - 25);
        ctx.lineTo(x + 28, y - 8);
        ctx.lineTo(x + 24, y + 18);
        ctx.lineTo(x + 10, y + 24);
        ctx.lineTo(x - 10, y + 24);
        ctx.lineTo(x - 24, y + 18);
        ctx.lineTo(x - 28, y - 8);
        ctx.closePath();
        ctx.fill();
        // Boss eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        // HP bar
        ctx.fillStyle = 'rgba(255,0,0,0.4)';
        ctx.fillRect(x - 25, y - 32, 50, 4);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x - 25, y - 32, 50 * (e.hp / e.maxHp), 4);
    } else if (e.type === 'zigzag') {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x + 12, y);
        ctx.lineTo(x + 8, y + 12);
        ctx.lineTo(x - 8, y + 12);
        ctx.lineTo(x - 12, y);
        ctx.closePath();
        ctx.fill();
    } else if (e.type === 'fast') {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(x, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (e.type === 'tough') {
        ctx.fillStyle = e.color;
        ctx.fillRect(x - 13, y - 12, 26, 24);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x - 9, y - 8, 18, 4);
        // HP indicator
        if (e.hp < e.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x - 12, y - 16, 24, 3);
            ctx.fillStyle = '#55ff55';
            ctx.fillRect(x - 12, y - 16, 24 * (e.hp / e.maxHp), 3);
        }
    } else {
        // Basic - inverted triangle
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(x - 11, y - 10);
        ctx.lineTo(x + 11, y - 10);
        ctx.lineTo(x, y + 12);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// --- POWERUPS ---
function spawnPowerup(x, y) {
    const types = ['rapid', 'shield', 'spread'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { rapid: '#ffdd44', shield: '#44ddff', spread: '#44ff88' };
    powerups.push({ x, y, type, color: colors[type], phase: 0, speed: 1.2 });
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += p.speed;
        p.phase += 0.08;
        if (p.y > H + 20) { powerups.splice(i, 1); continue; }
        const dx = Math.abs(p.x - player.x), dy = Math.abs(p.y - player.y);
        if (dx < 20 && dy < 20) {
            if (p.type === 'rapid') { player.rapidFire = true; player.rapidTimer = 360; }
            else if (p.type === 'shield') { player.shield = true; }
            else if (p.type === 'spread') { player.spreadShot = true; player.spreadTimer = 360; }
            spawnExplosion(p.x, p.y, p.color, 6);
            powerups.splice(i, 1);
        }
    }
}

function drawPowerups() {
    for (const p of powerups) {
        ctx.save();
        const glow = 10 + Math.sin(p.phase) * 4;
        const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, glow);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labels = { rapid: 'R', shield: 'S', spread: 'W' };
        ctx.fillText(labels[p.type], p.x, p.y);
        ctx.restore();
    }
}

// --- PARTICLES ---
function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: 25 + Math.random() * 15,
            maxLife: 40,
            r: 1.5 + Math.random() * 2.5,
            color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.dx *= 0.96;
        p.dy *= 0.96;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- HIT / COMBO ---
function hitPlayer() {
    if (player.shield) {
        player.shield = false;
        spawnExplosion(player.x, player.y, '#44ddff', 10);
        player.invincible = 30;
        return;
    }
    lives--;
    combo = 0;
    comboTimer = 0;
    player.invincible = 90;
    shakeDur = 12;
    spawnExplosion(player.x, player.y, '#ffaa33', 10);
    if (lives <= 0) gameOver();
}

function getComboMultiplier() {
    if (combo >= 30) return 4;
    if (combo >= 15) return 3;
    if (combo >= 5) return 2;
    return 1;
}

// --- SCREEN SHAKE ---
function updateShake() {
    if (shakeDur > 0) {
        shakeDur--;
        shakeX = (Math.random() - 0.5) * 8;
        shakeY = (Math.random() - 0.5) * 8;
    } else {
        shakeX = 0;
        shakeY = 0;
    }
}

// --- HUD ---
function drawHUD() {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 10, 22);

    const mult = getComboMultiplier();
    if (mult > 1) {
        ctx.fillStyle = accentColor;
        ctx.fillText('x' + mult, 10, 40);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText('WAVE ' + wave, W - 10, 22);

    // Lives as hearts
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#ff5555';
        ctx.fillText('\u2764', W / 2 - (lives - 1) * 10 + i * 20, 22);
    }

    // Active powerups
    let py = 42;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    if (player.rapidFire) {
        ctx.fillStyle = '#ffdd44';
        ctx.fillText('RAPID ' + Math.ceil(player.rapidTimer / 60) + 's', W - 10, py);
        py += 14;
    }
    if (player.spreadShot) {
        ctx.fillStyle = '#44ff88';
        ctx.fillText('SPREAD ' + Math.ceil(player.spreadTimer / 60) + 's', W - 10, py);
        py += 14;
    }
    if (player.shield) {
        ctx.fillStyle = '#44ddff';
        ctx.fillText('SHIELD', W - 10, py);
    }
    ctx.restore();
}

// --- GAME LOOP ---
let shooting = false;

function gameLoop() {
    if (state !== 'playing') return;
    requestAnimationFrame(gameLoop);

    updateShake();
    updateStars();
    updatePlayer();
    if (shooting || isMobile) {
        if (isMobile) { mobileAutoFire++; if (mobileAutoFire % 2 === 0) shoot(); }
        else shoot();
    }
    updateBullets();
    updateEnemies();
    updateEnemyBullets();
    updatePowerups();
    updateParticles();
    if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) combo = 0; }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.clearRect(-10, -10, W + 20, H + 20);
    // BG
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    drawStars();
    drawBullets();
    drawEnemyBullets();
    for (const e of enemies) drawEnemy(e);
    drawPowerups();
    drawPlayer();
    drawParticles();
    drawHUD();
    ctx.restore();
}

function startGame() {
    state = 'playing';
    score = 0; lives = 3; wave = 0; waveTimer = 0;
    combo = 0; comboTimer = 0;
    shakeDur = 0; shakeX = 0; shakeY = 0;
    bullets = []; bullets._cooldown = 0;
    enemies = []; particles = []; powerups = []; enemyBullets = [];
    initStars();
    initPlayer();
    startOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    spawnWave();
    gameLoop();
}

function gameOver() {
    state = 'over';
    finalScoreEl.textContent = score;
    finalInfoEl.textContent = '\u6CE2\u6570 ' + wave + ' / \u6700\u9AD8\u8FDE\u51FB x' + getComboMultiplier();
    overOverlay.classList.remove('hidden');
}

// --- INPUT ---
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); shooting = true; }
});
document.addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === ' ' || e.key === 'Spacebar') shooting = false;
});

// Touch
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (state !== 'playing') return;
    isMobile = true;
    const t = e.changedTouches[0];
    touchId = t.identifier;
    const rect = canvas.getBoundingClientRect();
    touchStartX = t.clientX - rect.left;
    touchStartY = t.clientY - rect.top;
    touchPlayerX = player.x;
    touchPlayerY = player.y;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (state !== 'playing') return;
    for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
            const rect = canvas.getBoundingClientRect();
            const cx = t.clientX - rect.left;
            const cy = t.clientY - rect.top;
            player.x = touchPlayerX + (cx - touchStartX);
            player.y = touchPlayerY + (cy - touchStartY);
            player.x = Math.max(16, Math.min(W - 16, player.x));
            player.y = Math.max(20, Math.min(H - 20, player.y));
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
        if (t.identifier === touchId) touchId = null;
    }
});

// Buttons
document.getElementById('sg-start-btn').addEventListener('click', startGame);
document.getElementById('sg-restart-btn').addEventListener('click', startGame);

// Draw initial stars on start screen
initStars();
function drawStartBg() {
    if (state !== 'start' && state !== 'over') return;
    requestAnimationFrame(drawStartBg);
    updateStars();
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
    drawStars();
}
drawStartBg();

})();
</script>
