/**
 * Modern Blog Enhancements
 * Scroll reveal animations, smooth interactions, magnetic cursor effects
 */

// ---- Scroll Reveal with Intersection Observer ----
function initScrollReveal() {
    // Add reveal class to elements that should animate
    const selectors = [
        '.article-list article',
        '.widget',
        '.main-article',
        '.article-content > *',
        '.pagination',
    ];

    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
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
        {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px',
        }
    );

    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });
}

// ---- Smooth Tilt Effect on Article Cards ----
function initCardTilt() {
    if (window.matchMedia('(pointer: fine)').matches === false) return;

    const cards = document.querySelectorAll('.article-list article');

    cards.forEach(card => {
        const el = card as HTMLElement;

        el.addEventListener('mousemove', (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -3;
            const rotateY = ((x - centerX) / centerX) * 3;

            el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
            el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            setTimeout(() => {
                el.style.transition = '';
            }, 500);
        });
    });
}

// ---- Smooth Anchor Scroll with Offset ----
function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (this: HTMLAnchorElement, e: Event) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    });
}

// ---- Reading Progress Bar ----
function initReadingProgress() {
    const article = document.querySelector('.article-page .article-content');
    if (!article) return;

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #6c5ce7, #a29bfe);
        z-index: 9999;
        transition: width 0.1s linear;
        border-radius: 0 2px 2px 0;
    `;
    document.body.appendChild(progressBar);

    // Check dark mode for progress bar color
    const scheme = document.documentElement.getAttribute('data-scheme');
    if (scheme === 'dark') {
        progressBar.style.background = 'linear-gradient(90deg, #8b5cf6, #a78bfa)';
    }

    window.addEventListener('scroll', () => {
        const rect = article.getBoundingClientRect();
        const articleTop = rect.top + window.scrollY;
        const articleHeight = rect.height;
        const windowHeight = window.innerHeight;
        const scrollY = window.scrollY;

        const progress = Math.min(
            Math.max((scrollY - articleTop + windowHeight * 0.3) / articleHeight, 0),
            1
        );
        progressBar.style.width = `${progress * 100}%`;
    });
}

// ---- Parallax Background Orbs ----
function initParallaxOrbs() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                document.body.style.setProperty(
                    '--scroll-offset',
                    `${scrollY * 0.03}px`
                );
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ---- Image Lazy Load with Fade ----
function initImageFade() {
    const images = document.querySelectorAll('.article-image img, .article-content img');

    images.forEach(img => {
        const el = img as HTMLImageElement;
        if (el.complete) {
            el.style.opacity = '1';
            return;
        }

        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s ease';

        el.addEventListener('load', () => {
            el.style.opacity = '1';
        });
    });
}

// ---- Typing Effect for Site Description ----
function initTypingEffect() {
    const desc = document.querySelector('.site-description') as HTMLElement;
    if (!desc || !desc.textContent) return;

    const text = desc.textContent;
    desc.textContent = '';
    desc.style.borderRight = '2px solid var(--accent-color)';
    desc.style.display = 'inline-block';

    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < text.length) {
            desc.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typeInterval);
            // Blink cursor then remove
            setTimeout(() => {
                desc.style.borderRight = 'none';
            }, 2000);
        }
    }, 60);
}

// ---- Initialize Everything ----
function init() {
    initScrollReveal();
    initCardTilt();
    initSmoothAnchors();
    initReadingProgress();
    initParallaxOrbs();
    initImageFade();

    // Typing effect only on first visit (use sessionStorage)
    if (!sessionStorage.getItem('typed')) {
        initTypingEffect();
        sessionStorage.setItem('typed', '1');
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
