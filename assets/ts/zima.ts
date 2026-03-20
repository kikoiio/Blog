/**
 * Zima Blue — Top-down pool cleaner animation inspired by the Netflix short.
 * Bird's eye view of a swimming pool with a small robot cleaner.
 * Caustic light patterns ripple across the pool floor.
 * Click in the pool to summon the robot.
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
        const padY = H * 0.04;
        poolX = padX;
        poolY = padY;
        poolW = W - padX * 2;
        poolH = H - padY * 2;
        needsReinit = true;
    }

    resize();
    window.addEventListener('resize', resize);

    // ---- Robot ----
    const ROWS = 6;
    const robot = {
        x: 0, y: 0, angle: 0,
        size: 18,
        cx: 0, cy: 0,
        row: 0,
        sweepDir: 1 as 1 | -1,     // 1 = sweep right, -1 = sweep left
        rowDir: 1 as 1 | -1,       // 1 = going down rows, -1 = going up
        phase: 'sweep' as 'sweep' | 'turn' | 'navigate' | 'align',
        targetX: 0, targetY: 0,
        alignRow: 0,
    };

    function getRowY(row: number): number {
        const m = robot.size + 6;
        const tY = poolY + m;
        const bY = poolY + poolH - m;
        return tY + row * (bY - tY) / ROWS;
    }

    function getMargins() {
        const m = robot.size + 6;
        return { lX: poolX + m, rX: poolX + poolW - m };
    }

    // ---- Ripples ----
    interface Ripple { x: number; y: number; r: number; maxR: number; }
    const ripples: Ripple[] = [];
    let rippleTimer = 0;

    function spawnRipple(x: number, y: number) {
        ripples.push({ x, y, r: 4, maxR: 30 + Math.random() * 25 });
    }

    // ---- Caustics ----
    interface CausticCell { x: number; y: number; r: number; phase: number; speed: number; }
    const causticCells: CausticCell[] = [];

    function initCaustics() {
        causticCells.length = 0;
        const count = Math.floor(poolW * poolH / 4000);
        for (let i = 0; i < count; i++) {
            causticCells.push({
                x: poolX + Math.random() * poolW,
                y: poolY + Math.random() * poolH,
                r: 8 + Math.random() * 18,
                phase: Math.random() * Math.PI * 2,
                speed: 0.001 + Math.random() * 0.003,
            });
        }
    }

    // ---- Click handler ----
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left);
        const my = (e.clientY - rect.top);

        if (mx >= poolX && mx <= poolX + poolW &&
            my >= poolY && my <= poolY + poolH) {
            robot.phase = 'navigate';
            robot.targetX = mx;
            robot.targetY = my;
            spawnRipple(mx, my);
        }
    });

    // ---- Move toward a point, return true if arrived ----
    function moveToward(tx: number, ty: number, speed: number): boolean {
        const dx = tx - robot.x;
        const dy = ty - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2) {
            robot.x = tx;
            robot.y = ty;
            return true;
        }
        const step = Math.min(speed, dist);
        robot.x += (dx / dist) * step;
        robot.y += (dy / dist) * step;
        robot.angle = Math.atan2(dy, dx);
        return false;
    }

    // ---- Update robot position ----
    function updateRobot(dt: number) {
        const { lX, rX } = getMargins();
        const speed = 0.6 * (dt / 16);

        if (robot.phase === 'navigate') {
            if (moveToward(robot.targetX, robot.targetY, speed * 1.5)) {
                // Arrived — find nearest row and align to it
                const m = robot.size + 6;
                const tY = poolY + m;
                const bY = poolY + poolH - m;
                const rowH = (bY - tY) / ROWS;
                robot.alignRow = Math.round((robot.y - tY) / rowH);
                robot.alignRow = Math.max(0, Math.min(ROWS, robot.alignRow));
                robot.phase = 'align';
            }
            return;
        }

        if (robot.phase === 'align') {
            // Smoothly move to the nearest row Y, keeping x
            const targetY = getRowY(robot.alignRow);
            if (moveToward(robot.x, targetY, speed)) {
                // Aligned — start sweeping
                robot.row = robot.alignRow;
                robot.y = targetY;
                // Decide sweep direction: go toward whichever edge is closer
                const distToRight = rX - robot.x;
                const distToLeft = robot.x - lX;
                robot.sweepDir = distToRight >= distToLeft ? 1 : -1;
                robot.phase = 'sweep';
            }
            return;
        }

        if (robot.phase === 'sweep') {
            // Move horizontally along current row
            const targetX = robot.sweepDir > 0 ? rX : lX;
            const rowY = getRowY(robot.row);

            if (moveToward(targetX, rowY, speed)) {
                // Reached edge — start turning to next row
                robot.phase = 'turn';
                // Flip sweep direction for the next row
                robot.sweepDir = robot.sweepDir > 0 ? -1 : 1;

                // Determine next row, reversing at boundaries
                const nextRow = robot.row + robot.rowDir;
                if (nextRow > ROWS) {
                    robot.rowDir = -1;
                } else if (nextRow < 0) {
                    robot.rowDir = 1;
                }
            }
            return;
        }

        if (robot.phase === 'turn') {
            // Move vertically to next row
            const nextRow = robot.row + robot.rowDir;
            const targetY = getRowY(nextRow);

            if (moveToward(robot.x, targetY, speed)) {
                // Arrived at next row
                robot.row = nextRow;
                robot.phase = 'sweep';

                // Check boundaries for future direction
                if (robot.row >= ROWS) {
                    robot.rowDir = -1;
                } else if (robot.row <= 0) {
                    robot.rowDir = 1;
                }
            }
        }
    }

    // ---- Drawing ----

    function drawPool(time: number) {
        if (poolW < 10 || poolH < 10) return;
        const r = 4;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(poolX, poolY, poolW, poolH, r);
        ctx.clip();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(poolX, poolY, poolW, poolH);

        // Tile grid
        const tileSize = Math.max(16, Math.min(25, poolW / 9));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
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

        // Caustic light patterns
        for (const c of causticCells) {
            const wobble = Math.sin(time * c.speed + c.phase) * 0.5 + 0.5;
            const a = 0.03 + 0.06 * wobble;
            const cx = c.x + Math.sin(time * 0.0006 + c.phase) * 6;
            const cy = c.y + Math.cos(time * 0.0008 + c.phase * 1.3) * 5;
            const rx = c.r * (0.6 + wobble * 0.6);
            const ry = c.r * 0.7 * (0.6 + wobble * 0.6);

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry,
                Math.sin(time * 0.0003 + c.phase) * 0.6,
                0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
            ctx.fill();
        }

        // Caustic network lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < causticCells.length - 1; i++) {
            const c1 = causticCells[i];
            const c2 = causticCells[i + 1];
            const dx = c1.x - c2.x, dy = c1.y - c2.y;
            if (dx * dx + dy * dy < 4000) {
                const wobble = Math.sin(time * 0.001 + c1.phase) * 0.5 + 0.5;
                ctx.globalAlpha = 0.04 + 0.04 * wobble;
                ctx.beginPath();
                const mx = (c1.x + c2.x) / 2 + Math.sin(time * 0.0008 + c1.phase) * 8;
                const my = (c1.y + c2.y) / 2 + Math.cos(time * 0.0006 + c2.phase) * 6;
                ctx.moveTo(c1.x + Math.sin(time * 0.0006 + c1.phase) * 6,
                           c1.y + Math.cos(time * 0.0008 + c1.phase * 1.3) * 5);
                ctx.quadraticCurveTo(mx, my,
                           c2.x + Math.sin(time * 0.0006 + c2.phase) * 6,
                           c2.y + Math.cos(time * 0.0008 + c2.phase * 1.3) * 5);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();

        // Pool border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(poolX, poolY, poolW, poolH, r);
        ctx.stroke();

        // Outer rim glow
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(poolX - 2, poolY - 2, poolW + 4, poolH + 4, r + 1);
        ctx.stroke();
    }

    function drawRobot(x: number, y: number, angle: number) {
        const s = robot.size;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.beginPath();
        ctx.ellipse(2, 2, s * 0.6, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-s * 0.45, -s * 0.4, s * 0.9, s * 0.8, 3);
        ctx.fill();
        ctx.stroke();

        // Inner chassis
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(-s * 0.32, -s * 0.27, s * 0.64, s * 0.54, 2);
        ctx.stroke();

        // Eye
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s * 0.08, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(s * 0.08, 0, 4.5, 0, Math.PI * 2);
        ctx.stroke();

        // Sensor dot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(-s * 0.18, -s * 0.12, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        robot.cx = x;
        robot.cy = y;
    }

    function drawRipples() {
        for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.r += 0.25;
            const progress = rp.r / rp.maxR;
            const alpha = 0.4 * (1 - progress);

            if (rp.r >= rp.maxR) {
                ripples.splice(i, 1);
                continue;
            }

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
            ctx.stroke();

            if (rp.r > 8) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, rp.r - 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    // ---- Init robot position ----
    function initRobot() {
        robot.row = 0;
        robot.rowDir = 1;
        robot.sweepDir = 1;
        robot.phase = 'sweep';
        const { lX } = getMargins();
        robot.x = lX;
        robot.y = getRowY(0);
        robot.angle = 0;
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
            initRobot();
            ripples.length = 0;
        }

        drawPool(time);

        updateRobot(dt);

        // Clip to pool
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(poolX, poolY, poolW, poolH, 4);
        ctx.clip();

        drawRobot(robot.x, robot.y, robot.angle);

        rippleTimer += dt;
        if (rippleTimer > 900) {
            rippleTimer = 0;
            spawnRipple(robot.cx, robot.cy);
        }
        drawRipples();

        ctx.restore();

        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
})();
