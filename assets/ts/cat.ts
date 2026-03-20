/**
 * Pixel Cat Colony — Interactive pixel art cats on the article sidebar.
 * 6+ cats with different colors, emotions, and click interactions.
 */

(function () {
    const canvas = document.getElementById('cat-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;
    const PX = 3; // pixel size for drawing — 3px per sprite pixel
    let initialized = false;

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
    }

    resize();
    window.addEventListener('resize', resize);

    // ---- Color palettes for each cat breed ----
    interface CatPalette {
        outline: string;
        base: string;
        shadow: string;
        highlight: string;
        ear: string;
        eye: string;
        nose: string;
        name: string;
    }

    const PALETTES: CatPalette[] = [
        { name: 'orange', outline: '#8B5E3C', base: '#E8A040', shadow: '#C07830', highlight: '#F0C878', ear: '#E8A0A0', eye: '#2D5016', nose: '#E88080' },
        { name: 'black', outline: '#181818', base: '#303030', shadow: '#181818', highlight: '#505050', ear: '#504040', eye: '#E8E840', nose: '#C06060' },
        { name: 'white', outline: '#A09088', base: '#F0E8E0', shadow: '#C8B8A8', highlight: '#FFFFFF', ear: '#E8A0A0', eye: '#5888D0', nose: '#E8A0A0' },
        { name: 'gray', outline: '#505868', base: '#8890A0', shadow: '#606878', highlight: '#B0B8C8', ear: '#C8A0A0', eye: '#88C840', nose: '#D08888' },
        { name: 'calico', outline: '#6B4E3C', base: '#F0E8E0', shadow: '#C8B8A8', highlight: '#FFFFFF', ear: '#E8A040', eye: '#508030', nose: '#E88080' },
        { name: 'siamese', outline: '#584038', base: '#F0E0C8', shadow: '#C8A888', highlight: '#F8F0E8', ear: '#584038', eye: '#5888D0', nose: '#D08888' },
        { name: 'tuxedo', outline: '#181818', base: '#282828', shadow: '#181818', highlight: '#F0E8E0', ear: '#504040', eye: '#60A840', nose: '#D08888' },
        { name: 'ginger', outline: '#7A4420', base: '#D08030', shadow: '#A06020', highlight: '#F0B868', ear: '#E8A0A0', eye: '#306020', nose: '#E88080' },
    ];

    // ---- Pixel sprite data (16x14 grid, each row is a string) ----
    // Legend: . = transparent, O = outline, B = base, S = shadow, H = highlight, E = ear inner, Y = eye, N = nose, P = patch (calico/tuxedo)

    const SPRITE_SIT = [
        '....OO....OO....',
        '...OEEO..OEEO...',
        '..OBBBO..OBBBO..',
        '..OBBBBBBBBBBO..',
        '.OBBBYBBBBYBBO..',
        '.OBBBBBNBBBBBO..',
        '.OBBBBBNBBBBBO..',
        '..OBBBBBBBBBO...',
        '..OBBSSSSBBBO...',
        '.OBBSSSSSSBBBO..',
        '.OBBSSSSSSBBBO..',
        '.OBBOBBBBOBBO...',
        '.OO.OBBBO.OO.OO.',
        '....OOOOO..OBBBO',
        '...........OOOOO',
    ];

    const SPRITE_HAPPY = [
        '....OO....OO....',
        '...OEEO..OEEO...',
        '..OBBBO..OBBBO..',
        '..OBBBBBBBBBBO..',
        '.OB.OYO..OYO.BO.',
        '.OBBBBBNBBBBBO..',
        '.OBBB.OOO.BBBO..',
        '..OBBBBBBBBBO...',
        '..OBBSSSSBBBO...',
        '.OBBSSSSSSBBBO..',
        '.OBBSSSSSSBBBO..',
        '.OBBOBBBBOBBO...',
        '.OO.OBBBO.OO....',
        '....OOOOO.......',
    ];

    const SPRITE_SCARED = [
        '...OO......OO...',
        '..OEEO....OEEO..',
        '..OBBBO..OBBBO..',
        '.OBBBBBBBBBBBO..',
        '.OBOYOBBOBYOBO..',
        '.OBBBBBNBBBBBO..',
        '.OBBBOOOOBBBBO..',
        '..OBBBBBBBBBO...',
        '...OBBSSBBBO....',
        '...OBSSSSBO.....',
        '...OBSSSSBO.....',
        '...OBOBBOBOO....',
        '...OO.OO.OOBBO..',
        '..........OBBBO.',
        '...........OOOO.',
    ];

    // Walk frames (2 frames for animation)
    const SPRITE_WALK1 = [
        '....OO....OO....',
        '...OEEO..OEEO...',
        '..OBBBO..OBBBO..',
        '..OBBBBBBBBBBO..',
        '.OBBBYBBBBYBBO..',
        '.OBBBBBNBBBBBO..',
        '.OBBBBBNBBBBBO..',
        '..OBBBBBBBBBO...',
        '..OBBBSSSSBBBO..',
        '..OBBSSSSSSBO...',
        '..OBO.OBOB.OBO..',
        '..OO..OO.O..OO..',
    ];

    const SPRITE_WALK2 = [
        '....OO....OO....',
        '...OEEO..OEEO...',
        '..OBBBO..OBBBO..',
        '..OBBBBBBBBBBO..',
        '.OBBBYBBBBYBBO..',
        '.OBBBBBNBBBBBO..',
        '.OBBBBBNBBBBBO..',
        '..OBBBBBBBBBO...',
        '..OBBBSSSSBBBO..',
        '..OBBSSSSSSBO...',
        '.OBO..BOBO..OBO.',
        '.OO...OO.O...OO.',
    ];

    // Run frames
    const SPRITE_RUN1 = [
        '..OO....OO......',
        '.OEEO..OEEO.....',
        '.OBBBO.OBBBO....',
        '.OBBBBBBBBBBO...',
        'OBBBYBBBBYBBO...',
        'OBBBBBNBBBBBO...',
        'OBBBBBNBBBBBO...',
        '.OBBBBBBBBBO....',
        '.OBBSSSSSSBO....',
        '.OBSSSSSSSOBO...',
        '.OBO....O..OBO..',
        '.OO.....O...OO..',
        '........OO......',
    ];

    const SPRITE_RUN2 = [
        '..OO....OO......',
        '.OEEO..OEEO.....',
        '.OBBBO.OBBBO....',
        '.OBBBBBBBBBBO...',
        'OBBBYBBBBYBBO...',
        'OBBBBBNBBBBBO...',
        'OBBBBBNBBBBBO...',
        '.OBBBBBBBBBO....',
        '.OBBSSSSSSBO....',
        '.OBSSSSSSSOBO...',
        'OBO.....O.OBO...',
        'OO......O..OO...',
        '.........OO.....',
    ];

    type Emotion = 'calm' | 'happy' | 'scared';
    type CatState = 'idle' | 'walking' | 'running' | 'reacting';

    interface PixelCat {
        x: number;
        y: number;
        palette: CatPalette;
        facing: 1 | -1;
        state: CatState;
        emotion: Emotion;
        targetX: number;
        targetY: number;
        walkFrame: number;
        walkTimer: number;
        reactionTimer: number;
        idleTimer: number;
        blinkTimer: number;
        blinking: boolean;
        tailPhase: number;
        scale: number;
        patchOffsets: number[]; // for calico/tuxedo patches
    }

    // ---- Create cats ----
    function createCat(palette: CatPalette, x: number, y: number): PixelCat {
        return {
            x, y, palette,
            facing: Math.random() > 0.5 ? 1 : -1,
            state: 'idle',
            emotion: 'calm',
            targetX: x,
            targetY: y,
            walkFrame: 0,
            walkTimer: 0,
            reactionTimer: 0,
            idleTimer: Math.random() * 5,
            blinkTimer: Math.random() * 3,
            blinking: false,
            tailPhase: Math.random() * Math.PI * 2,
            scale: 1,
            patchOffsets: Array.from({ length: 8 }, () => Math.floor(Math.random() * 14)),
        };
    }

    // Pick 6-8 cats with distinct palettes
    const numCats = Math.min(6 + Math.floor(Math.random() * 3), PALETTES.length);
    const shuffled = [...PALETTES].sort(() => Math.random() - 0.5);
    const cats: PixelCat[] = [];

    function initCats() {
        if (W < 1 || H < 1) return;
        cats.length = 0;
        const margin = 40;
        const catSize = 16 * PX; // sprite width in CSS px
        const spacing = Math.max(catSize + 10, (H - margin * 2) / numCats);
        for (let i = 0; i < numCats; i++) {
            const px = margin + Math.random() * Math.max(1, W - margin * 2);
            const py = margin + i * spacing + Math.random() * spacing * 0.3;
            cats.push(createCat(shuffled[i], px, Math.min(py, H - margin)));
        }
        initialized = true;
    }

    initCats();

    // ---- Sprite rendering ----
    function drawPixel(x: number, y: number, color: string) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, PX, PX);
    }

    function getColor(char: string, palette: CatPalette, patchOffsets: number[], row: number, col: number): string | null {
        switch (char) {
            case '.': return null;
            case 'O': return palette.outline;
            case 'B': {
                // For calico, add orange/dark patches
                if (palette.name === 'calico') {
                    const hash = (row * 7 + col * 13 + patchOffsets[row % 8]) % 20;
                    if (hash < 4) return '#E8A040'; // orange patch
                    if (hash < 6) return '#383030'; // dark patch
                }
                if (palette.name === 'tuxedo') {
                    // White chest area
                    if (row >= 7 && row <= 11 && col >= 5 && col <= 10) return '#F0E8E0';
                }
                return palette.base;
            }
            case 'S': return palette.shadow;
            case 'H': return palette.highlight;
            case 'E': return palette.ear;
            case 'Y': return palette.eye;
            case 'N': return palette.nose;
            case 'P': return palette.highlight;
            default: return null;
        }
    }

    function drawSprite(cat: PixelCat, sprite: string[], t: number) {
        ctx.save();
        const s = cat.scale;
        const spriteW = 16 * PX;
        const spriteH = sprite.length * PX;

        ctx.translate(cat.x, cat.y);
        ctx.scale(cat.facing * s, s);
        ctx.translate(-spriteW / 2, -spriteH / 2);

        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                const char = sprite[row][col];
                const color = getColor(char, cat.palette, cat.patchOffsets, row, col);
                if (color) {
                    // Handle blinking: replace eye pixels with closed eyes
                    if (char === 'Y' && cat.blinking) {
                        drawPixel(col * PX, row * PX, cat.palette.outline);
                        // Draw the "closed eye" line
                        drawPixel(col * PX, (row + 0.5) * PX, cat.palette.outline);
                    } else {
                        drawPixel(col * PX, row * PX, color);
                    }
                }
            }
        }

        ctx.restore();
    }

    function getSpriteForCat(cat: PixelCat, t: number): string[] {
        if (cat.state === 'running') {
            return cat.walkFrame % 2 === 0 ? SPRITE_RUN1 : SPRITE_RUN2;
        }
        if (cat.state === 'walking') {
            return cat.walkFrame % 2 === 0 ? SPRITE_WALK1 : SPRITE_WALK2;
        }
        if (cat.state === 'reacting') {
            switch (cat.emotion) {
                case 'happy': return SPRITE_HAPPY;
                case 'scared': return SPRITE_SCARED;
                default: return SPRITE_SIT;
            }
        }
        return SPRITE_SIT;
    }

    // ---- Click handler ----
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Calculate distances from click to each cat's head center
        const catDistances = cats.map((cat, i) => ({
            index: i,
            dist: Math.sqrt((cat.x - clickX) ** 2 + (cat.y - clickY) ** 2),
        })).sort((a, b) => a.dist - b.dist);

        // Nearest 2-3 cats react
        const reactCount = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < Math.min(reactCount, catDistances.length); i++) {
            const cat = cats[catDistances[i].index];
            const dist = catDistances[i].dist;

            // Assign random reaction
            const roll = Math.random();

            if (roll < 0.35) {
                // Calm: walk to click position calmly
                cat.state = 'walking';
                cat.emotion = 'calm';
                cat.targetX = clickX + (Math.random() - 0.5) * 40;
                cat.targetY = clickY + (Math.random() - 0.5) * 40;
                // Clamp to canvas
                cat.targetX = Math.max(20, Math.min(W - 20, cat.targetX));
                cat.targetY = Math.max(20, Math.min(H - 20, cat.targetY));
                cat.facing = cat.targetX > cat.x ? 1 : -1;
            } else if (roll < 0.7) {
                // Happy: walk to click, then show happy face
                cat.state = 'walking';
                cat.emotion = 'happy';
                cat.targetX = clickX + (Math.random() - 0.5) * 40;
                cat.targetY = clickY + (Math.random() - 0.5) * 40;
                cat.targetX = Math.max(20, Math.min(W - 20, cat.targetX));
                cat.targetY = Math.max(20, Math.min(H - 20, cat.targetY));
                cat.facing = cat.targetX > cat.x ? 1 : -1;
            } else {
                // Scared: show scared face then run away
                cat.state = 'reacting';
                cat.emotion = 'scared';
                cat.reactionTimer = 0.6; // show scared face briefly
                // Run direction: away from click
                const angle = Math.atan2(cat.y - clickY, cat.x - clickX);
                const runDist = 80 + Math.random() * 60;
                cat.targetX = cat.x + Math.cos(angle) * runDist;
                cat.targetY = cat.y + Math.sin(angle) * runDist;
                cat.targetX = Math.max(20, Math.min(W - 20, cat.targetX));
                cat.targetY = Math.max(20, Math.min(H - 20, cat.targetY));
                cat.facing = cat.targetX > cat.x ? 1 : -1;
            }
        }
    });

    // ---- Animation loop ----
    let lastTime = 0;

    function update(timestamp: number) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        const t = timestamp / 1000;

        // Deferred init: wait for valid canvas dimensions
        if (!initialized) {
            resize();
            initCats();
            if (!initialized) {
                requestAnimationFrame(update);
                return;
            }
        }

        ctx.clearRect(0, 0, W, H);

        for (const cat of cats) {
            // ---- Blink ----
            cat.blinkTimer += dt;
            if (!cat.blinking && cat.blinkTimer > 3 + Math.random() * 2) {
                cat.blinking = true;
                cat.blinkTimer = 0;
            }
            if (cat.blinking && cat.blinkTimer > 0.15) {
                cat.blinking = false;
                cat.blinkTimer = 0;
            }

            const dx = cat.targetX - cat.x;
            const dy = cat.targetY - cat.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (cat.state === 'reacting') {
                cat.reactionTimer -= dt;
                if (cat.reactionTimer <= 0) {
                    if (cat.emotion === 'scared') {
                        cat.state = 'running';
                    } else {
                        cat.state = 'idle';
                        cat.emotion = 'calm';
                    }
                }
            }

            if (cat.state === 'walking') {
                if (dist > 5) {
                    const speed = 40;
                    cat.x += (dx / dist) * speed * dt;
                    cat.y += (dy / dist) * speed * dt;
                    cat.facing = dx > 0 ? 1 : -1;
                    cat.walkTimer += dt;
                    if (cat.walkTimer > 0.2) {
                        cat.walkFrame++;
                        cat.walkTimer = 0;
                    }
                } else {
                    // Arrived
                    if (cat.emotion === 'happy' || cat.emotion === 'calm') {
                        cat.state = 'reacting';
                        cat.reactionTimer = 2 + Math.random() * 2;
                    } else {
                        cat.state = 'idle';
                    }
                }
            }

            if (cat.state === 'running') {
                if (dist > 5) {
                    const speed = 100;
                    cat.x += (dx / dist) * speed * dt;
                    cat.y += (dy / dist) * speed * dt;
                    cat.facing = dx > 0 ? 1 : -1;
                    cat.walkTimer += dt;
                    if (cat.walkTimer > 0.1) {
                        cat.walkFrame++;
                        cat.walkTimer = 0;
                    }
                } else {
                    cat.state = 'idle';
                    cat.emotion = 'calm';
                }
            }

            if (cat.state === 'idle') {
                cat.idleTimer += dt;
            }

            // Keep cats within bounds
            cat.x = Math.max(20, Math.min(W - 20, cat.x));
            cat.y = Math.max(20, Math.min(H - 20, cat.y));

            // Resolve overlapping cats (minDist based on sprite size)
            const minDist = 16 * PX;
            for (const other of cats) {
                if (other === cat) continue;
                const ox = cat.x - other.x;
                const oy = cat.y - other.y;
                const od = Math.sqrt(ox * ox + oy * oy);
                if (od < minDist && od > 0) {
                    const push = (minDist - od) * 0.3;
                    cat.x += (ox / od) * push;
                    cat.y += (oy / od) * push;
                }
            }

            // Draw
            const sprite = getSpriteForCat(cat, t);
            drawSprite(cat, sprite, t);
        }

        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
})();
