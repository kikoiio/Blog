/**
 * Photography page viewer.
 * Desktop (min-width: 769px): one photo fills the stage next to the Zima
 * pool; arrows / arrow keys switch photos; click toggles zoom, wheel zooms,
 * drag pans. Mobile: photos stack vertically for scrolling; tap toggles zoom.
 */

const CLICK_ZOOM_SCALE = 2.5;
const MAX_ZOOM_SCALE = 6;

/** Zoom/pan state for a single photo. */
class Zoomable {
    private scale = 1;
    private tx = 0;
    private ty = 0;
    private dragging = false;
    private dragMoved = false;
    private lastX = 0;
    private lastY = 0;
    private zoomSrcLoaded = false;

    constructor(
        private img: HTMLImageElement,
        private wheelEnabled: () => boolean,
    ) {
        img.addEventListener('click', (e) => this.onClick(e));
        img.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        img.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        img.addEventListener('pointermove', (e) => this.onPointerMove(e));
        img.addEventListener('pointerup', () => this.endDrag());
        img.addEventListener('pointercancel', () => this.endDrag());

        if (!img.complete) {
            img.classList.add('is-loading');
            img.addEventListener('load', () => img.classList.remove('is-loading'), { once: true });
        }
    }

    reset() {
        this.scale = 1;
        this.tx = 0;
        this.ty = 0;
        this.apply(false);
    }

    private onClick(e: MouseEvent) {
        // Suppress the synthetic click that follows a pan drag.
        if (this.dragMoved) {
            this.dragMoved = false;
            return;
        }
        this.ensureZoomSrc();
        this.zoomAt(e.clientX, e.clientY, this.scale > 1 ? 1 : CLICK_ZOOM_SCALE);
    }

    private onWheel(e: WheelEvent) {
        if (!this.wheelEnabled()) return;
        e.preventDefault();
        this.ensureZoomSrc();
        this.zoomAt(e.clientX, e.clientY, this.scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
    }

    private onPointerDown(e: PointerEvent) {
        if (this.scale <= 1) return;
        this.dragging = true;
        this.dragMoved = false;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.img.setPointerCapture(e.pointerId);
        this.img.classList.add('is-grabbing');
        e.preventDefault();
    }

    private onPointerMove(e: PointerEvent) {
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
        this.tx += dx;
        this.ty += dy;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.apply(false);
    }

    private endDrag() {
        if (!this.dragging) return;
        this.dragging = false;
        this.img.classList.remove('is-grabbing');
    }

    /** Keep the point under the cursor stationary while scaling (same math as the article lightbox). */
    private zoomAt(clientX: number, clientY: number, target: number) {
        const next = Math.min(MAX_ZOOM_SCALE, Math.max(1, target));
        const prev = this.scale;
        if (next === prev) return;

        const rect = this.img.getBoundingClientRect();
        const ux = clientX - (rect.left + rect.width / 2) + this.tx;
        const uy = clientY - (rect.top + rect.height / 2) + this.ty;
        const r = next / prev;
        this.scale = next;
        this.tx = ux * (1 - r) + r * this.tx;
        this.ty = uy * (1 - r) + r * this.ty;
        if (this.scale === 1) {
            this.tx = 0;
            this.ty = 0;
        }
        this.apply(true);
    }

    /** Swap in the high-resolution variant the first time the user zooms. */
    private ensureZoomSrc() {
        if (this.zoomSrcLoaded) return;
        const src = this.img.dataset.zoomSrc;
        if (!src) return;
        this.zoomSrcLoaded = true;
        const hi = new Image();
        hi.onload = () => { this.img.src = src; };
        hi.src = src;
    }

    private apply(animated: boolean) {
        this.img.style.transition = animated ? 'transform 0.18s ease-out' : 'none';
        this.img.style.transform = this.scale === 1 ? '' : `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
        this.img.classList.toggle('is-zoomed', this.scale > 1);
    }
}

/** Slide index, arrows, counter and keyboard navigation. */
class PhotoViewer {
    private slides: HTMLElement[];
    private zoomables: Zoomable[];
    private current = 0;
    private counter: HTMLElement | null;
    private desktop = window.matchMedia('(min-width: 769px)');

    constructor(stage: HTMLElement) {
        this.slides = Array.from(stage.querySelectorAll<HTMLElement>('.photo-slide'));
        const images = this.slides.map((s) => s.querySelector('img')!);
        this.zoomables = images.map(
            (img, i) => new Zoomable(img, () => this.desktop.matches && i === this.current),
        );
        this.counter = stage.querySelector('.photo-counter-current');

        stage.querySelector<HTMLButtonElement>('.photo-nav--prev')?.addEventListener('click', (e) => {
            this.go(-1);
            (e.currentTarget as HTMLElement).blur();
        });
        stage.querySelector<HTMLButtonElement>('.photo-nav--next')?.addEventListener('click', (e) => {
            this.go(1);
            (e.currentTarget as HTMLElement).blur();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.go(-1);
            else if (e.key === 'ArrowRight') this.go(1);
            else if (e.key === 'Escape') this.zoomables.forEach((z) => z.reset());
        });
    }

    private go(delta: number) {
        const n = this.slides.length;
        if (n < 2) return;
        this.zoomables[this.current].reset();
        this.slides[this.current].classList.remove('is-active');
        this.current = (this.current + delta + n) % n;
        this.slides[this.current].classList.add('is-active');
        if (this.counter) this.counter.textContent = String(this.current + 1);
    }
}

function initPhotography() {
    const stage = document.querySelector<HTMLElement>('.photo-stage');
    if (!stage) return;
    new PhotoViewer(stage);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotography);
} else {
    initPhotography();
}
