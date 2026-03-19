/**
 * Interactive line-drawing cat animation.
 * A simple sketch-style cat follows the user's clicks,
 * jumping and playing like a real cat chasing a laser pointer.
 */

(function () {
    const canvas = document.getElementById('cat-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;

    function resize() {
        const rect = canvas.parentElement!.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        canvas.width = W * window.devicePixelRatio;
        canvas.height = H * window.devicePixelRatio;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // ---- Cat state ----
    const cat = {
        x: W / 2,
        y: H * 0.75,
        targetX: W / 2,
        targetY: H * 0.75,
        vx: 0,
        vy: 0,
        jumping: false,
        sitting: true,
        facing: 1 as 1 | -1,    // 1 = right, -1 = left
        tailPhase: 0,
        earWiggle: 0,
        blinkTimer: 0,
        blinking: false,
        pawPhase: 0,
        idleTimer: 0,
        headTilt: 0,
        // Ground level (cat sits on this y)
        groundY: H * 0.75,
    };

    // Dot (laser pointer)
    const dot = {
        x: W / 2,
        y: H / 2,
        visible: false,
        alpha: 0,
        timer: 0,
    };

    // Paw prints
    const pawPrints: { x: number; y: number; alpha: number; facing: number }[] = [];

    function getAccentColor(): string {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue('--accent-color').trim() || '#88c0d0';
    }

    function getLineColor(): string {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--card-text-color-main').trim();
        return textColor || '#4a4a4a';
    }

    // ---- Drawing helpers ----
    function drawLine(x1: number, y1: number, x2: number, y2: number, width = 1.5) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawCurve(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, width = 1.5) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawEllipse(cx: number, cy: number, rx: number, ry: number, width = 1.5) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.lineWidth = width;
        ctx.stroke();
    }

    // ---- Draw the cat ----
    function drawCat(t: number) {
        const lineColor = getLineColor();
        const accentColor = getAccentColor();
        ctx.strokeStyle = lineColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const x = cat.x;
        const baseY = cat.groundY;
        const f = cat.facing;
        const scale = 1;

        // Jump offset
        let jumpOff = 0;
        if (cat.jumping) {
            jumpOff = cat.vy < 0 ? Math.abs(cat.vy) * 2 : 0;
        }

        const bodyY = baseY - jumpOff;

        ctx.save();
        ctx.translate(x, bodyY);
        ctx.scale(f * scale, scale);

        // ---- Body (oval) ----
        const bodyW = cat.sitting ? 22 : 28;
        const bodyH = cat.sitting ? 16 : 13;
        const bodyYOff = cat.sitting ? -16 : -14;
        drawEllipse(0, bodyYOff, bodyW, bodyH, 1.8);

        // ---- Head ----
        const headX = cat.sitting ? 12 : 22;
        const headY = bodyYOff - (cat.sitting ? 18 : 15);
        const headTilt = Math.sin(t * 2) * 0.03 + cat.headTilt * 0.05;

        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(headTilt);

        // Head circle
        drawEllipse(0, 0, 12, 11, 1.8);

        // Ears
        const earW = cat.earWiggle * 2;
        // Left ear
        drawLine(-8, -8, -12 + earW, -20, 1.5);
        drawLine(-12 + earW, -20, -3, -10, 1.5);
        // Right ear
        drawLine(4, -10, 10 - earW, -22, 1.5);
        drawLine(10 - earW, -22, 12, -8, 1.5);

        // Eyes
        if (cat.blinking) {
            // Closed eyes — happy lines
            drawCurve(-5, -1, -5, -3, -3, -1, 1.2);
            drawCurve(3, -1, 5, -3, 7, -1, 1.2);
        } else {
            // Open eyes
            ctx.fillStyle = lineColor;
            ctx.beginPath();
            ctx.ellipse(-4, -1, 2.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(5, -1, 2.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupils (look toward target)
            const lookDir = cat.facing * (cat.targetX > cat.x ? 1 : -1);
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.ellipse(-4 + lookDir * 1, -0.5, 1.2, 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(5 + lookDir * 1, -0.5, 1.2, 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Nose
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(0.5, 3);
        ctx.lineTo(-1, 5);
        ctx.lineTo(2, 5);
        ctx.closePath();
        ctx.fill();

        // Whiskers
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = 0.5;
        drawLine(-12, 2, -22, -1, 0.8);
        drawLine(-12, 4, -22, 4, 0.8);
        drawLine(8, 2, 18, -1, 0.8);
        drawLine(8, 4, 18, 4, 0.8);
        ctx.globalAlpha = 1;

        // Mouth
        drawCurve(-1, 5, 0.5, 8, 2, 5, 1);

        ctx.restore(); // head

        // ---- Legs ----
        ctx.strokeStyle = lineColor;
        if (cat.sitting) {
            // Front legs
            drawLine(-8, -6, -10, 0, 1.5);
            drawLine(-10, 0, -6, 0, 1.2);
            drawLine(2, -6, 0, 0, 1.5);
            drawLine(0, 0, 4, 0, 1.2);
            // Back leg (tucked)
            drawCurve(-18, -10, -24, -4, -20, 0, 1.5);
        } else {
            // Walking/running animation
            const p = cat.pawPhase;
            const stride = 8;
            // Front legs
            const fl1 = Math.sin(p) * stride;
            const fl2 = Math.sin(p + Math.PI) * stride;
            drawLine(10, -6, 10 + fl1, 0, 1.5);
            drawLine(5, -6, 5 + fl2, 0, 1.5);
            // Back legs
            const bl1 = Math.sin(p + Math.PI * 0.5) * stride;
            const bl2 = Math.sin(p + Math.PI * 1.5) * stride;
            drawLine(-15, -8, -15 + bl1, 0, 1.5);
            drawLine(-20, -8, -20 + bl2, 0, 1.5);
        }

        // ---- Tail ----
        const tailBase = cat.sitting ? -22 : -28;
        const tailY = bodyYOff + 2;
        const tailWave = Math.sin(t * 3 + cat.tailPhase) * 12;
        const tailWave2 = Math.sin(t * 3 + cat.tailPhase + 1) * 8;
        ctx.beginPath();
        ctx.moveTo(tailBase, tailY);
        ctx.bezierCurveTo(
            tailBase - 10, tailY - 15 + tailWave2,
            tailBase - 20, tailY - 25 + tailWave,
            tailBase - 15, tailY - 35 + tailWave
        );
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.restore(); // body transform
    }

    // ---- Draw paw prints ----
    function drawPawPrints() {
        const lineColor = getLineColor();
        pawPrints.forEach(p => {
            if (p.alpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = p.alpha * 0.3;
            ctx.strokeStyle = lineColor;
            ctx.translate(p.x, p.y);
            ctx.scale(p.facing, 1);

            // Main pad
            drawEllipse(0, 0, 4, 3, 1);
            // Toe pads
            drawEllipse(-3, -5, 1.5, 1.5, 0.8);
            drawEllipse(0, -6, 1.5, 1.5, 0.8);
            drawEllipse(3, -5, 1.5, 1.5, 0.8);

            ctx.restore();
        });
    }

    // ---- Draw dot (laser pointer) ----
    function drawDot() {
        if (!dot.visible || dot.alpha <= 0) return;
        const accentColor = getAccentColor();
        ctx.save();
        ctx.globalAlpha = dot.alpha * 0.7;

        // Glow
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.globalAlpha = dot.alpha;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ---- Click handler ----
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Show dot
        dot.x = clickX;
        dot.y = clickY;
        dot.visible = true;
        dot.alpha = 1;
        dot.timer = 0;

        // Set cat target
        cat.targetX = clickX;
        cat.targetY = clickY;
        cat.sitting = false;
        cat.idleTimer = 0;

        // Face toward target
        cat.facing = clickX > cat.x ? 1 : -1;
    });

    // ---- Animation loop ----
    let lastTime = 0;

    function update(timestamp: number) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;



        cat.groundY = H * 0.75;
        const t = timestamp / 1000;

        // ---- Physics ----
        const dx = cat.targetX - cat.x;
        const dist = Math.abs(dx);

        if (!cat.sitting && dist > 5) {
            // Move toward target
            const speed = 120;
            cat.x += Math.sign(dx) * speed * dt;
            cat.facing = dx > 0 ? 1 : -1;
            cat.pawPhase += dt * 12;

            // Leave paw prints occasionally
            if (Math.random() < dt * 4) {
                pawPrints.push({
                    x: cat.x + (Math.random() - 0.5) * 10,
                    y: cat.groundY,
                    alpha: 1,
                    facing: cat.facing,
                });
                if (pawPrints.length > 20) pawPrints.shift();
            }
        } else if (!cat.sitting) {
            // Arrived at target, sit down
            cat.sitting = true;
            cat.idleTimer = 0;
            cat.tailPhase = Math.random() * Math.PI * 2;
        }

        // ---- Blink timer ----
        cat.blinkTimer += dt;
        if (cat.blinkTimer > 3 + Math.random() * 2) {
            cat.blinking = true;
            if (cat.blinkTimer > 3.2 + Math.random() * 0.3) {
                cat.blinking = false;
                cat.blinkTimer = 0;
            }
        }

        // ---- Idle behavior ----
        if (cat.sitting) {
            cat.idleTimer += dt;
            // Head tilt
            cat.headTilt = Math.sin(t * 0.5) * 0.5;
            // Ear wiggle when curious
            cat.earWiggle = Math.sin(t * 4) * 0.5;
        } else {
            cat.headTilt = 0;
            cat.earWiggle = 0;
        }

        // ---- Dot fade ----
        if (dot.visible) {
            dot.timer += dt;
            if (dot.timer > 1) {
                dot.alpha -= dt * 2;
                if (dot.alpha <= 0) {
                    dot.visible = false;
                    dot.alpha = 0;
                }
            }
        }

        // ---- Paw print fade ----
        pawPrints.forEach(p => {
            p.alpha -= dt * 0.15;
        });

        // ---- Draw ----
        ctx.clearRect(0, 0, W, H);

        // Ground line (subtle)
        ctx.save();
        ctx.strokeStyle = getLineColor();
        ctx.globalAlpha = 0.08;
        ctx.setLineDash([4, 8]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, cat.groundY);
        ctx.lineTo(W - 20, cat.groundY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        drawPawPrints();
        drawDot();
        drawCat(t);

        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
})();
