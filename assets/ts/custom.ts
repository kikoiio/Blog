/**
 * Multi-Theme Blog System
 * Theme Switcher + Scroll Animations + Cyberpunk Effects
 */

// ---- Types ----
type ThemeStyle = 'minimalist' | 'cyberpunk';
type MiniColor = 'teal' | 'rose' | 'sage' | 'lavender' | 'sand' | 'dark';
interface ThemeState {
    style: ThemeStyle;
    color: MiniColor;
}

const STORAGE_KEY = 'BlogThemeState';

// ---- Theme Manager ----
class ThemeManager {
    private state: ThemeState;
    private panel: HTMLElement | null = null;
    private cyberpunkCleanup: (() => void) | null = null;

    constructor() {
        this.state = this.loadState();
        this.applyTheme();
        this.createUI();
        this.initAnimations();
    }

    private loadState(): ThemeState {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {}
        return { style: 'minimalist', color: 'teal' };
    }

    private saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        // Also sync with Stack's color scheme for compatibility
        if (this.state.style === 'cyberpunk' || this.state.color === 'dark') {
            localStorage.setItem('StackColorScheme', 'dark');
            document.documentElement.dataset.scheme = 'dark';
        } else {
            localStorage.setItem('StackColorScheme', 'light');
            document.documentElement.dataset.scheme = 'light';
        }
    }

    private getThemeAttr(): string {
        if (this.state.style === 'cyberpunk') return 'cyberpunk';
        return `mini-${this.state.color}`;
    }

    applyTheme() {
        const theme = this.getThemeAttr();
        document.documentElement.setAttribute('data-theme', theme);

        // Sync data-scheme for theme compatibility
        if (this.state.style === 'cyberpunk' || this.state.color === 'dark') {
            document.documentElement.dataset.scheme = 'dark';
        } else {
            // For colored minimalist themes, we keep 'dark' scheme for syntax highlighting
            document.documentElement.dataset.scheme = 'dark';
        }

        this.saveState();

        // Manage cyberpunk effects
        if (this.state.style === 'cyberpunk') {
            this.startCyberpunkEffects();
        } else {
            this.stopCyberpunkEffects();
        }

        this.updateUI();
    }

    setStyle(style: ThemeStyle) {
        this.state.style = style;
        this.applyTheme();
    }

    setColor(color: MiniColor) {
        this.state.style = 'minimalist';
        this.state.color = color;
        this.applyTheme();
    }

    // ---- Cyberpunk Effects ----
    private startCyberpunkEffects() {
        if (this.cyberpunkCleanup) return;

        // Create binary rain canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'cyber-rain';
        canvas.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: -1; opacity: 0.06;
        `;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d')!;
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const columns = Math.floor(window.innerWidth / 18);
        const drops: number[] = new Array(columns).fill(1);
        const chars = '01';

        let animId: number;
        const draw = () => {
            ctx.fillStyle = 'rgba(10, 10, 15, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00f0ff';
            ctx.font = '14px "JetBrains Mono", monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * 18, drops[i] * 18);

                if (drops[i] * 18 > canvas.height && Math.random() > 0.98) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            animId = requestAnimationFrame(draw);
        };
        draw();

        // Glitch effect on title
        const title = document.querySelector('.site-name a') as HTMLElement;
        let glitchInterval: number | undefined;
        if (title) {
            glitchInterval = window.setInterval(() => {
                title.style.textShadow = `
                    ${Math.random() * 4 - 2}px ${Math.random() * 2 - 1}px 0 rgba(255, 0, 170, 0.7),
                    ${Math.random() * 4 - 2}px ${Math.random() * 2 - 1}px 0 rgba(0, 240, 255, 0.7)
                `;
                setTimeout(() => {
                    title.style.textShadow = '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)';
                }, 100);
            }, 3000);
        }

        // Neon hover glow on cards
        const handleMouseMove = (e: MouseEvent) => {
            const cards = document.querySelectorAll('.article-list article, .widget');
            cards.forEach(card => {
                const el = card as HTMLElement;
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                    el.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0, 240, 255, 0.06) 0%, rgba(10, 10, 25, 0.9) 60%)`;
                } else {
                    el.style.background = '';
                }
            });
        };
        document.addEventListener('mousemove', handleMouseMove);

        this.cyberpunkCleanup = () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            document.removeEventListener('mousemove', handleMouseMove);
            canvas.remove();
            if (glitchInterval) clearInterval(glitchInterval);
            if (title) title.style.textShadow = '';
            // Clean up card backgrounds
            document.querySelectorAll('.article-list article, .widget').forEach(el => {
                (el as HTMLElement).style.background = '';
            });
        };
    }

    private stopCyberpunkEffects() {
        if (this.cyberpunkCleanup) {
            this.cyberpunkCleanup();
            this.cyberpunkCleanup = null;
        }
    }

    // ---- UI ----
    private createUI() {
        const switcher = document.createElement('div');
        switcher.className = 'theme-switcher';
        switcher.innerHTML = `
            <button class="theme-switcher-btn" title="Switch Theme" aria-label="Theme switcher">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
            </button>
            <div class="theme-panel" id="theme-panel">
                <div class="theme-panel-title">Style</div>
                <div class="theme-style-row">
                    <button class="theme-style-btn" data-style="minimalist">Minimal</button>
                    <button class="theme-style-btn" data-style="cyberpunk">Cyber</button>
                </div>
                <div class="theme-panel-title">Color</div>
                <div class="theme-colors" id="theme-colors">
                    <button class="theme-color-btn" data-color="teal" title="Teal"></button>
                    <button class="theme-color-btn" data-color="rose" title="Rose"></button>
                    <button class="theme-color-btn" data-color="sage" title="Sage"></button>
                    <button class="theme-color-btn" data-color="lavender" title="Lavender"></button>
                    <button class="theme-color-btn" data-color="sand" title="Sand"></button>
                    <button class="theme-color-btn" data-color="dark" title="Dark"></button>
                </div>
            </div>
        `;
        document.body.appendChild(switcher);

        // Toggle panel
        const btn = switcher.querySelector('.theme-switcher-btn')!;
        this.panel = switcher.querySelector('#theme-panel') as HTMLElement;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.panel!.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!switcher.contains(e.target as Node)) {
                this.panel!.classList.remove('open');
            }
        });

        // Style buttons
        switcher.querySelectorAll('.theme-style-btn').forEach(b => {
            b.addEventListener('click', () => {
                const style = (b as HTMLElement).dataset.style as ThemeStyle;
                if (style === 'cyberpunk') {
                    this.setStyle('cyberpunk');
                } else {
                    this.setStyle('minimalist');
                }
            });
        });

        // Color buttons
        switcher.querySelectorAll('.theme-color-btn').forEach(b => {
            b.addEventListener('click', () => {
                const color = (b as HTMLElement).dataset.color as MiniColor;
                this.setColor(color);
            });
        });

        this.updateUI();
    }

    private updateUI() {
        if (!this.panel) return;

        // Update style buttons
        this.panel.querySelectorAll('.theme-style-btn').forEach(b => {
            const el = b as HTMLElement;
            el.classList.toggle('active', el.dataset.style === this.state.style);
        });

        // Update color buttons - always clickable (clicking auto-switches to minimalist)
        const colorSection = this.panel.querySelector('#theme-colors') as HTMLElement;
        colorSection.style.opacity = this.state.style === 'cyberpunk' ? '0.5' : '1';
        colorSection.style.pointerEvents = 'auto';

        this.panel.querySelectorAll('.theme-color-btn').forEach(b => {
            const el = b as HTMLElement;
            el.classList.toggle('active',
                this.state.style === 'minimalist' && el.dataset.color === this.state.color
            );
        });
    }

    // ---- Animations ----
    private initAnimations() {
        this.initScrollReveal();
        this.initReadingProgress();
        this.initImageFade();

        // Typing effect once per session
        if (!sessionStorage.getItem('typed')) {
            this.initTypingEffect();
            sessionStorage.setItem('typed', '1');
        }
    }

    private initScrollReveal() {
        const selectors = [
            '.article-list article',
            '.widget',
            '.main-article',
            '.pagination',
        ];

        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (!el.classList.contains('reveal')) {
                    el.classList.add('reveal');
                }
            });
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    private initReadingProgress() {
        const article = document.querySelector('.article-page .article-content');
        if (!article) return;

        const bar = document.createElement('div');
        bar.id = 'reading-progress';
        bar.style.cssText = `
            position: fixed; top: 0; left: 0; width: 0%; height: 3px;
            z-index: 9999; transition: width 0.1s linear; border-radius: 0 2px 2px 0;
        `;
        this.updateProgressBarColor(bar);
        document.body.appendChild(bar);

        window.addEventListener('scroll', () => {
            const rect = article.getBoundingClientRect();
            const top = rect.top + window.scrollY;
            const progress = Math.min(Math.max(
                (window.scrollY - top + window.innerHeight * 0.3) / rect.height, 0
            ), 1);
            bar.style.width = `${progress * 100}%`;
        });
    }

    private updateProgressBarColor(bar: HTMLElement) {
        if (this.state.style === 'cyberpunk') {
            bar.style.background = 'linear-gradient(90deg, #00f0ff, #ff00aa)';
        } else {
            bar.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9))';
        }
    }

    private initImageFade() {
        document.querySelectorAll('.article-image img, .article-content img').forEach(img => {
            const el = img as HTMLImageElement;
            if (el.complete) { el.style.opacity = '1'; return; }
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s ease';
            el.addEventListener('load', () => { el.style.opacity = '1'; });
        });
    }

    private initTypingEffect() {
        const desc = document.querySelector('.site-description') as HTMLElement;
        if (!desc || !desc.textContent) return;

        const text = desc.textContent;
        desc.textContent = '';
        desc.style.borderRight = '2px solid var(--accent-color)';
        desc.style.display = 'inline-block';

        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                desc.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => { desc.style.borderRight = 'none'; }, 2000);
            }
        }, 60);
    }
}

// ---- Init ----
function init() {
    new ThemeManager();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
