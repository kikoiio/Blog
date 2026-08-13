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
    initArticleScrollbar();
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
 * Desktop article page: Windows/Chrome auto-hides overlay scrollbars when
 * idle, so the article column gets a custom always-visible scrollbar that
 * mirrors main.main's scroll position. The thumb is draggable.
 */
function initArticleScrollbar() {
    const main = document.querySelector<HTMLElement>('.custom-article-page main.main');
    if (!main) return;
    const card = main.querySelector<HTMLElement>('article.main-article');

    const track = document.createElement('div');
    track.className = 'article-scrollbar';
    track.setAttribute('aria-hidden', 'true');
    const thumb = document.createElement('div');
    thumb.className = 'article-scrollbar-thumb';
    track.appendChild(thumb);
    document.body.appendChild(track);

    const desktop = window.matchMedia('(min-width: 769px)');

    const update = () => {
        const active = desktop.matches && main.scrollHeight > main.clientHeight + 1;
        track.classList.toggle('is-visible', active);
        if (!active) return;

        // Clamp the track to the article card's visible span, so it sits
        // between the card's rounded corners instead of running edge to edge.
        const anchor = card || main;
        const cardRect = anchor.getBoundingClientRect();
        const radius = parseFloat(window.getComputedStyle(anchor).borderTopLeftRadius) || 16;
        // Inset the track ends by the card's corner radius whenever that
        // edge is on screen, so the thumb never overlaps the rounded corners.
        const top = cardRect.top >= 0 ? cardRect.top + radius : 0;
        const bottom = cardRect.bottom <= window.innerHeight
            ? cardRect.bottom - radius
            : window.innerHeight;
        const trackHeight = Math.max(0, bottom - top);
        track.style.top = `${top}px`;
        track.style.height = `${trackHeight}px`;
        /* Keep the track clear of the card's 16px rounded corners. */
        track.style.left = `${cardRect.right - 24}px`;

        const thumbHeight = Math.max(36, (main.clientHeight / main.scrollHeight) * trackHeight);
        const travel = trackHeight - thumbHeight;
        const progress = main.scrollTop / (main.scrollHeight - main.clientHeight);
        thumb.style.height = `${thumbHeight}px`;
        thumb.style.transform = `translateY(${travel * progress}px)`;
    };

    main.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Content height can change after images/fonts load.
    new ResizeObserver(update).observe(main);
    update();

    // Drag the thumb to scroll.
    thumb.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        thumb.setPointerCapture(event.pointerId);
        thumb.classList.add('is-dragging');
        const startY = event.clientY;
        const startScroll = main.scrollTop;
        const thumbHeight = thumb.getBoundingClientRect().height;
        const trackHeight = track.getBoundingClientRect().height;
        const ratio = (main.scrollHeight - main.clientHeight) / Math.max(1, trackHeight - thumbHeight);

        const onMove = (e: PointerEvent) => {
            main.scrollTop = startScroll + (e.clientY - startY) * ratio;
        };
        const onUp = () => {
            thumb.classList.remove('is-dragging');
            thumb.removeEventListener('pointermove', onMove);
            thumb.removeEventListener('pointerup', onUp);
            thumb.removeEventListener('pointercancel', onUp);
        };
        thumb.addEventListener('pointermove', onMove);
        thumb.addEventListener('pointerup', onUp);
        thumb.addEventListener('pointercancel', onUp);
    });

    // Click on the track pages up/down like a native scrollbar.
    track.addEventListener('pointerdown', (event) => {
        if (event.target !== track) return;
        const thumbTop = thumb.getBoundingClientRect().top;
        const direction = event.clientY < thumbTop ? -1 : 1;
        main.scrollBy({ top: direction * main.clientHeight * 0.85, behavior: 'smooth' });
    });
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

    // Zoom/pan state. scale stays within [1, 6]; pan offsets only apply
    // while zoomed and reset on close.
    let scale = 1;
    let tx = 0;
    let ty = 0;

    const applyTransform = () => {
        image.style.transition = 'transform 0.12s ease-out';
        image.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        image.style.cursor = scale > 1 ? 'grab' : '';
    };

    const resetZoom = () => {
        scale = 1;
        tx = 0;
        ty = 0;
        image.style.transform = '';
        image.style.transition = '';
        image.style.cursor = '';
    };

    const close = () => {
        overlay.classList.remove('is-open');
        resetZoom();
    };

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

    // Click on the dark backdrop closes; clicks on the image itself do not.
    let dragMoved = false;
    overlay.addEventListener('click', (event) => {
        if (dragMoved) {
            dragMoved = false;
            return;
        }
        if (event.target === overlay) close();
    });

    // Wheel zoom, keeping the point under the cursor stationary.
    overlay.addEventListener('wheel', (event) => {
        event.preventDefault();
        const prev = scale;
        const next = Math.min(6, Math.max(1, prev * (event.deltaY < 0 ? 1.18 : 1 / 1.18)));
        if (next === prev) return;

        const rect = image.getBoundingClientRect();
        // Cursor position relative to the transform origin (image layout center).
        const ux = event.clientX - (rect.left + rect.width / 2) + tx;
        const uy = event.clientY - (rect.top + rect.height / 2) + ty;
        const r = next / prev;
        scale = next;
        tx = ux * (1 - r) + r * tx;
        ty = uy * (1 - r) + r * ty;
        if (scale === 1) {
            tx = 0;
            ty = 0;
        }
        applyTransform();
    }, { passive: false });

    // Drag to pan while zoomed in.
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    image.addEventListener('pointerdown', (event) => {
        if (scale <= 1) return;
        dragging = true;
        dragMoved = false;
        lastX = event.clientX;
        lastY = event.clientY;
        image.setPointerCapture(event.pointerId);
        image.style.cursor = 'grabbing';
        event.preventDefault();
    });
    image.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
        tx += dx;
        ty += dy;
        lastX = event.clientX;
        lastY = event.clientY;
        image.style.transition = 'none';
        image.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    });
    const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        image.style.cursor = 'grab';
    };
    image.addEventListener('pointerup', endDrag);
    image.addEventListener('pointercancel', endDrag);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
    });
}
