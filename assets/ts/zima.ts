/**
 * Zima Blue — Pool cleaner animation inspired by the Netflix short.
 * A small robot cleaner glides along a vertical swimming pool.
 * Concentric ripples emanate from the robot, fragments drift upward.
 * Drawn in white to adapt to any theme background.
 */

(function () {
    const canvas = document.getElementById('zima-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;
    let poolX = 0, poolY = 0, poolW = 0, poolH = 0;
    let needsReinit = true;

    function resize() {
        const rect = canvas.parentElement!.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        W = rect.width;
        H = rect.height;
        canvas.width = W * window.devicePixelRatio;
        canvas.height = H * window.devicePixelRatio;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

        const padX = W * 0.06;
        const padY = H * 0.08;
        poolX = padX;
        poolY = padY;
        poolW = W - padX * 2;
        poolH = H - padY * 2;
        needsReinit = true;
    }

    resize();
    window.addEventListener('resize', resize);

    // ---- Robot ----
    const robot = {
        t: 0, speed: 0.00022,
        x: 0, y: 0, angle: 0,
        w: 24, h: 16,
        cx: 0, cy: 0,
    };

    // ---- Ripples ----
    interface Ripple { x: number; y: number; r: number; maxR: number; }
    const ripples: Ripple[] = [];
    let rippleTimer = 0;

    function spawnRipple(x: number, y: number) {
        ripples.push({ x, y, r: 5, maxR: 35 + Math.random() * 20 });
    }

    // ---- Bubbles ----
    interface Bubble {
        x: number; y: number; r: number;
        vy: number; vx: number; life: number; maxLife: number;
    }
    const bubbles: Bubble[] = [];
    let bubbleTimer = 0;

    function spawnBubble(x: number, y: number) {
        bubbles.push({
            x, y, r: 1 + Math.random() * 2.5,
            vy: -(0.15 + Math.random() * 0.3),
            vx: (Math.random() - 0.5) * 0.1,
            life: 0, maxLife: 160 + Math.random() * 200,
        });
    }

    // ---- Caustics ----
    interface Caustic { x: number; y: number; r: number; speed: number; phase: number; }
    const caustics: Caustic[] = [];

    function initCaustics() {
        caustics.length = 0;
        for (let i = 0; i < 12; i++) {
            caustics.push({
                x: poolX + Math.random() * poolW,
                y: poolY + Math.random() * poolH,
                r: 10 + Math.random() * 22,
                speed: 0.002 + Math.random() * 0.005,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    // ---- Fragments ----
    interface Fragment {
        x: number; y: number; size: number;
        vy: number; vx: number; alpha: number;
        rotation: number; rotSpeed: number; type: number;
    }
    const fragments: Fragment[] = [];

    function initFragments() {
        fragments.length = 0;
        for (let i = 0; i < 10; i++) {
            fragments.push({
                x: poolX + poolW * 0.1 + Math.random() * poolW * 0.8,
                y: poolY + poolH * 0.15 + Math.random() * poolH * 0.6,
                size: 3 + Math.random() * 6,
                vy: -0.03 - Math.random() * 0.08,
                vx: (Math.random() - 0.5) * 0.05,
                alpha: 0.3 + Math.random() * 0.3,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.007,
                type: Math.floor(Math.random() * 4),
            });
        }
    }

    // ---- Robot path (4 sides) ----
    function getRobotPos(t: number): { x: number; y: number; angle: number } {
        t = ((t % 1) + 1) % 1;
        const m = 12;
        const bY = poolY + poolH - robot.h - m;
        const tY = poolY + m + 22;
        const lX = poolX + m;
        const rX = poolX + poolW - m - robot.w;

        if (t < 0.30) {
            const p = t / 0.30;
            return { x: lX + p * (rX - lX), y: bY, angle: 0 };
        } else if (t < 0.50) {
            const p = (t - 0.30) / 0.20;
            return { x: poolX + poolW - m - robot.h, y: bY - p * (bY - tY), angle: -Math.PI / 2 };
        } else if (t < 0.70) {
            const p = (t - 0.50) / 0.20;
            return { x: rX - p * (rX - lX), y: tY, angle: Math.PI };
        } else {
            const p = (t - 0.70) / 0.30;
            return { x: poolX + m, y: tY + p * (bY - tY), angle: Math.PI / 2 };
        }
    }

    // ---- Drawing ----

    function drawPool(time: number) {
        if (poolW < 10 || poolH < 10) return;
        const r = 6;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(poolX, poolY, poolW, poolH, r);
        ctx.clip();

        // Water fill
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(poolX, poolY, poolW, poolH);

        // Tile grid — clearly visible
        const tileSize = Math.max(18, Math.min(28, poolW / 8));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.6;
        for (let x = poolX; x <= poolX + poolW; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, poolY);
            ctx.lineTo(x, poolY + poolH);
            ctx.stroke();
        }
        for (let y = poolY; y <= poolY + poolH; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(poolX, y);
            ctx.lineTo(poolX + poolW, y);
            ctx.stroke();
        }

        // Caustics — soft light blobs
        for (const c of caustics) {
            const wobble = Math.sin(time * c.speed + c.phase) * 0.5 + 0.5;
            const a = (0.05 + 0.07 * wobble);
            const cx = c.x + Math.sin(time * 0.0008 + c.phase) * 5;
            const cy = c.y + Math.cos(time * 0.001 + c.phase) * 4;
            ctx.beginPath();
            ctx.ellipse(cx, cy,
                c.r * (0.7 + wobble * 0.5),
                c.r * 0.5 * (0.7 + wobble * 0.5),
                Math.sin(time * 0.0004 + c.phase) * 0.4,
                0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
            ctx.fill();
        }

        // Water surface — main wave
        const surfaceY = poolY + 16;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = poolX; x <= poolX + poolW; x += 1.5) {
            const wave = Math.sin(x * 0.04 + time * 0.0015) * 3
                       + Math.sin(x * 0.08 + time * 0.0025) * 1.5;
            if (x === poolX) ctx.moveTo(x, surfaceY + wave);
            else ctx.lineTo(x, surfaceY + wave);
        }
        ctx.stroke();

        // Secondary surface wave
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = poolX; x <= poolX + poolW; x += 1.5) {
            const wave = Math.sin(x * 0.035 + time * 0.0012 + 1) * 2
                       + Math.sin(x * 0.1 + time * 0.002) * 0.8;
            if (x === poolX) ctx.moveTo(x, surfaceY + 6 + wave);
            else ctx.lineTo(x, surfaceY + 6 + wave);
        }
        ctx.stroke();

        ctx.restore();

        // Pool border — thick and clear
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(poolX, poolY, poolW, poolH, r);
        ctx.stroke();

        // Pool rim — top edge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(poolX - 3, poolY);
        ctx.lineTo(poolX + poolW + 3, poolY);
        ctx.stroke();
    }

    function drawRobot(x: number, y: number, angle: number) {
        ctx.save();
        const cx = x + robot.w / 2;
        const cy = y + robot.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        const hw = robot.w / 2;
        const hh = robot.h / 2;

        // Shadow glow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.ellipse(0, hh + 3, hw + 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, robot.w, robot.h, 3);
        ctx.fill();
        ctx.stroke();

        // Inner detail
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.roundRect(-hw + 3, -hh + 3, robot.w - 6, robot.h - 6, 2);
        ctx.stroke();

        // Cleaning disc
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, hh + 1, hw * 0.6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Main eye
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(hw * 0.3, -hh * 0.15, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Secondary sensor
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(-hw * 0.35, -hh * 0.3, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Antenna
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.1, -hh);
        ctx.lineTo(-hw * 0.1, -hh - 8);
        ctx.lineTo(-hw * 0.1 + 4, -hh - 10);
        ctx.stroke();
        // Antenna tip
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(-hw * 0.1 + 4, -hh - 10, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Treads
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(-hw, hh - 4, 6, 4);
        ctx.fillRect(hw - 6, hh - 4, 6, 4);

        ctx.restore();

        robot.cx = cx;
        robot.cy = cy;
    }

    function drawRipples() {
        for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.r += 0.3;
            const progress = rp.r / rp.maxR;
            const alpha = 0.55 * (1 - progress);

            if (rp.r >= rp.maxR) {
                ripples.splice(i, 1);
                continue;
            }

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawBubbles(time: number) {
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.x += b.vx + Math.sin(time * 0.004 + b.y * 0.08) * 0.04;
            b.y += b.vy;
            b.life++;

            const fade = b.life / b.maxLife > 0.7
                ? 1 - (b.life / b.maxLife - 0.7) / 0.3 : 1;
            const a = (0.5 + Math.random() * 0.1) * fade;

            if (b.life > b.maxLife || b.y < poolY + 20) {
                bubbles.splice(i, 1);
                continue;
            }

            ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();

            // Specular dot
            ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.5})`;
            ctx.beginPath();
            ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFragments(time: number) {
        for (const f of fragments) {
            f.x += f.vx + Math.sin(time * 0.0007 + f.y * 0.03) * 0.015;
            f.y += f.vy;
            f.rotation += f.rotSpeed;

            if (f.y < poolY + 26) {
                f.y = poolY + poolH * 0.4 + Math.random() * poolH * 0.45;
                f.x = poolX + poolW * 0.1 + Math.random() * poolW * 0.8;
            }

            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation);
            ctx.strokeStyle = `rgba(255, 255, 255, ${f.alpha})`;
            ctx.lineWidth = 1;

            const s = f.size;
            switch (f.type) {
                case 0:
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.5, -s * 0.3);
                    ctx.lineTo(s * 0.4, -s * 0.5);
                    ctx.lineTo(s * 0.5, s * 0.2);
                    ctx.lineTo(-s * 0.2, s * 0.5);
                    ctx.closePath();
                    ctx.stroke();
                    break;
                case 1:
                    ctx.beginPath();
                    ctx.moveTo(0, -s * 0.5);
                    ctx.lineTo(s * 0.5, s * 0.35);
                    ctx.lineTo(-s * 0.5, s * 0.35);
                    ctx.closePath();
                    ctx.stroke();
                    break;
                case 2:
                    ctx.beginPath();
                    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 3:
                    ctx.beginPath();
                    ctx.moveTo(-s * 0.5, -s * 0.2);
                    ctx.bezierCurveTo(-s * 0.2, -s * 0.4, s * 0.2, s * 0.3, s * 0.5, s * 0.1);
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        }
    }

    // ---- Main loop ----
    let lastTime = 0;

    function update(time: number) {
        if (!lastTime) lastTime = time;
        const dt = time - lastTime;
        lastTime = time;

        ctx.clearRect(0, 0, W, H);
        if (W < 10 || H < 10) { requestAnimationFrame(update); return; }

        if (needsReinit) {
            needsReinit = false;
            initCaustics();
            initFragments();
        }

        drawPool(time);

        robot.t += robot.speed * (dt / 16);
        const pos = getRobotPos(robot.t);
        robot.x = pos.x;
        robot.y = pos.y;
        robot.angle = pos.angle;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(poolX, poolY, poolW, poolH, 6);
        ctx.clip();

        drawRobot(robot.x, robot.y, robot.angle);

        rippleTimer += dt;
        if (rippleTimer > 600) {
            rippleTimer = 0;
            spawnRipple(robot.cx, robot.cy);
        }
        drawRipples();

        bubbleTimer += dt;
        if (bubbleTimer > 250) {
            bubbleTimer = 0;
            spawnBubble(
                robot.cx + (Math.random() - 0.5) * robot.w * 0.4,
                robot.cy - robot.h * 0.3
            );
        }
        drawBubbles(time);
        drawFragments(time);

        ctx.restore();

        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
})();
