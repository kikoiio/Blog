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
const COLOR_SCHEME_EVENT = 'onColorSchemeChange';

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
        const scheme = this.getScheme();
        localStorage.setItem('StackColorScheme', scheme);
        document.documentElement.dataset.scheme = scheme;
    }

    private getThemeAttr(): string {
        return `mini-${this.state.color}`;
    }

    private getScheme(): 'light' | 'dark' {
        return this.state.color === 'dark' ? 'dark' : 'light';
    }

    private notifyColorSchemeChange() {
        window.dispatchEvent(new CustomEvent(COLOR_SCHEME_EVENT, {
            detail: this.getScheme(),
        }));
    }

    applyTheme() {
        const theme = this.getThemeAttr();
        document.documentElement.setAttribute('data-theme', theme);
        this.saveState();
        this.notifyColorSchemeChange();
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
    initArticleContentScroller();
    initImageLightbox();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/**
 * Article page: on desktop the article column (main.main) scrolls
 * independently of the window (see custom.scss). The theme's anchor
 * scrolling and ToC scrollspy assume window scrolling, so re-implement
 * both against the article column here.
 */
function initArticleContentScroller() {
    const main = document.querySelector<HTMLElement>('.custom-article-page main.main');
    if (!main) return;

    const mainScrolls = (): boolean => /^(auto|scroll)$/.test(getComputedStyle(main).overflowY);

    // In-content anchor links (footnotes, cross references). ToC links are
    // handled by the dedicated handler in layouts/single.html.
    document.addEventListener('click', (event) => {
        const anchor = (event.target as HTMLElement).closest('a[href^="#"]');
        if (!anchor || anchor.closest('.custom-toc') || !mainScrolls()) return;

        const id = decodeURIComponent(anchor.getAttribute('href')!.slice(1));
        const target = document.getElementById(id);
        if (!target) return;

        event.preventDefault();
        const top = target.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 8;
        main.scrollTo({ top, behavior: 'smooth' });
        history.pushState(null, '', `#${id}`);
    });

    // Scrollspy that follows the article column instead of the window.
    const headers = Array.from(document.querySelectorAll<HTMLElement>(
        '.article-content h1[id], .article-content h2[id], .article-content h3[id], .article-content h4[id], .article-content h5[id], .article-content h6[id]'
    ));
    const tocItems = Array.from(document.querySelectorAll<HTMLElement>('#TableOfContents li'));
    if (!headers.length || !tocItems.length) return;

    const idToItem = new Map<string, HTMLElement>();
    tocItems.forEach((item) => {
        const href = item.querySelector('a')?.getAttribute('href') || '';
        if (href.startsWith('#')) idToItem.set(href.slice(1), item);
    });

    const tocNav = document.querySelector<HTMLElement>('.custom-toc .toc-nav');
    let tocHovered = false;
    tocNav?.addEventListener('mouseenter', () => tocHovered = true);
    tocNav?.addEventListener('mouseleave', () => tocHovered = false);

    let activeItem: HTMLElement | undefined;
    const updateSpy = () => {
        if (!mainScrolls()) return;
        const mainTop = main.getBoundingClientRect().top;
        let current: HTMLElement | undefined;
        for (const header of headers) {
            if (header.getBoundingClientRect().top - mainTop <= 24) current = header;
        }
        const next = current ? idToItem.get(current.id) : undefined;
        if (next === activeItem) return;
        activeItem?.classList.remove('active-class');
        if (next) {
            next.classList.add('active-class');
            if (!tocHovered) next.scrollIntoView({ block: 'nearest' });
        }
        activeItem = next;
    };

    let spyScheduled = false;
    main.addEventListener('scroll', () => {
        if (spyScheduled) return;
        spyScheduled = true;
        requestAnimationFrame(() => {
            spyScheduled = false;
            updateSpy();
        });
    });
    // The theme's own scrollspy recomputes on resize with a stale
    // window-based scroll position; run afterwards to correct it.
    window.addEventListener('resize', () => setTimeout(updateSpy, 120));
    updateSpy();
}

/**
 * Fullscreen lightbox for article images. Works for every image type
 * (SVG, raster, external) without depending on the PhotoSwipe CDN.
 * Images wrapped in a link keep the link's native behavior.
 */
function initImageLightbox() {
    const content = document.querySelector<HTMLElement>('.article-content');
    if (!content) return;

    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', '图片预览');
    overlay.innerHTML = `
        <figure class="lightbox-figure">
            <img class="lightbox-image" alt="">
            <figcaption class="lightbox-caption"></figcaption>
        </figure>`;
    document.body.appendChild(overlay);

    const image = overlay.querySelector<HTMLImageElement>('.lightbox-image')!;
    const caption = overlay.querySelector<HTMLElement>('.lightbox-caption')!;

    const close = () => overlay.classList.remove('is-open');

    content.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        if (!img.closest('a')) img.classList.add('lightbox-zoomable');
    });

    content.addEventListener('click', (event) => {
        const img = (event.target as HTMLElement).closest('img');
        if (!img || !content.contains(img) || img.closest('a')) return;

        image.src = img.currentSrc || img.src;
        image.alt = img.alt || '';
        const text = img.getAttribute('title') || img.alt || '';
        caption.textContent = text;
        caption.hidden = !text;
        overlay.classList.add('is-open');
    });

    overlay.addEventListener('click', close);
    // Keep the article column from scrolling behind the overlay.
    overlay.addEventListener('wheel', (event) => event.preventDefault(), { passive: false });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
    });
}
