/**
 * Multi-Theme Blog System
 * Theme Switcher + Scroll Animations
 */

// ---- Types ----
type MiniColor = 'teal' | 'rose' | 'sage' | 'lavender' | 'sand' | 'dark';
interface ThemeState {
    color: MiniColor;
}

const STORAGE_KEY = 'BlogThemeState';

// ---- Theme Manager ----
class ThemeManager {
    private state: ThemeState;
    private panel: HTMLElement | null = null;

    constructor() {
        this.state = this.loadState();
        this.applyTheme();
        this.createUI();
        this.initAnimations();
    }

    private loadState(): ThemeState {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Migration: handle old format with style property
                if (parsed.color) return { color: parsed.color };
            }
        } catch {}
        return { color: 'teal' };
    }

    private saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        if (this.state.color === 'dark') {
            localStorage.setItem('StackColorScheme', 'dark');
            document.documentElement.dataset.scheme = 'dark';
        } else {
            localStorage.setItem('StackColorScheme', 'light');
            document.documentElement.dataset.scheme = 'light';
        }
    }

    private getThemeAttr(): string {
        return `mini-${this.state.color}`;
    }

    applyTheme() {
        const theme = this.getThemeAttr();
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.dataset.scheme = 'dark';
        this.saveState();
        this.updateUI();
    }

    setColor(color: MiniColor) {
        this.state.color = color;
        this.applyTheme();
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

        this.panel.querySelectorAll('.theme-color-btn').forEach(b => {
            const el = b as HTMLElement;
            el.classList.toggle('active', el.dataset.color === this.state.color);
        });
    }

    // ---- Animations ----
    private initAnimations() {
        this.initScrollReveal();
        this.initReadingProgress();
        this.initImageFade();

        if (!sessionStorage.getItem('typed')) {
            this.initTypingEffect();
            sessionStorage.setItem('typed', '1');
        }
    }

    private initScrollReveal() {
        const selectors = [
            '.article-list article',
            '.widget',
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
        // Reading progress bar removed per user request
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
