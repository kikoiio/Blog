import type { IndexEntry, IndexViewModel } from './types';

export interface IndexPanelController {
    open(model: IndexViewModel): void;
    close(): void;
    isOpen(): boolean;
    currentPath(): string;
}

export interface IndexPanelCallbacks {
    onNavigate(entry: IndexEntry): void;
    onClose(): void;
}

function requireElement<T extends HTMLElement>(container: HTMLElement, selector: string): T {
    const element = container.querySelector<T>(selector);
    if (!element) throw new Error(`Missing graph index element: ${selector}`);
    return element;
}

function relativeDirectoryPath(directoryPath: string, treePath: string): string {
    if (directoryPath === treePath) return treePath;

    const prefix = `${treePath}/`;
    return directoryPath.startsWith(prefix)
        ? directoryPath.slice(prefix.length)
        : directoryPath;
}

export function createIndexPanel(
    container: HTMLElement,
    callbacks: IndexPanelCallbacks,
): IndexPanelController {
    const title = requireElement<HTMLElement>(container, '#graph-index-title');
    const path = requireElement<HTMLElement>(container, '#graph-index-path');
    const count = requireElement<HTMLElement>(container, '#graph-index-count');
    const list = requireElement<HTMLOListElement>(container, '#graph-index-list');
    const empty = requireElement<HTMLElement>(container, '#graph-index-empty');
    const closeButton = requireElement<HTMLButtonElement>(container, '#graph-index-close');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let model: IndexViewModel | null = null;
    let hideTimer: number | null = null;

    function cancelPendingHide() {
        if (hideTimer === null) return;
        window.clearTimeout(hideTimer);
        hideTimer = null;
    }

    function renderEntries(nextModel: IndexViewModel) {
        list.replaceChildren();

        nextModel.entries.forEach((entry, index) => {
            const item = document.createElement('li');
            item.className = 'graph-index__item';
            item.style.setProperty('--graph-index-delay', `${Math.min(index * 35, 280)}ms`);

            const marker = document.createElement('span');
            marker.className = 'graph-index__marker';
            marker.setAttribute('aria-hidden', 'true');

            const link = document.createElement('a');
            link.className = 'graph-index__link';
            link.href = entry.url;

            const entryTitle = document.createElement('span');
            entryTitle.className = 'graph-index__entry-title';
            entryTitle.textContent = entry.title;
            link.append(entryTitle);

            if (entry.showPath) {
                const entryPath = document.createElement('span');
                entryPath.className = 'graph-index__entry-path';
                entryPath.textContent = relativeDirectoryPath(entry.directoryPath, nextModel.treePath);
                link.append(entryPath);
            }

            const arrow = document.createElement('span');
            arrow.className = 'graph-index__arrow';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = '↗';

            link.addEventListener('click', (event) => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                callbacks.onNavigate(entry);
            });

            item.append(marker, link, arrow);
            list.append(item);
        });

        const hasEntries = nextModel.entries.length > 0;
        list.hidden = !hasEntries;
        empty.hidden = hasEntries;
    }

    function open(nextModel: IndexViewModel) {
        cancelPendingHide();
        model = nextModel;

        title.textContent = nextModel.title;
        path.textContent = nextModel.treePath;
        count.textContent = `${nextModel.entries.length} 篇笔记 · 按名称排序`;
        renderEntries(nextModel);

        container.hidden = false;
        container.setAttribute('aria-hidden', 'false');
        void container.offsetWidth;
        container.classList.add('is-open');
    }

    function close() {
        if (!model && container.hidden) return;

        model = null;
        container.classList.remove('is-open');
        container.setAttribute('aria-hidden', 'true');
        cancelPendingHide();

        if (reduceMotion.matches) {
            container.hidden = true;
            return;
        }

        hideTimer = window.setTimeout(() => {
            container.hidden = true;
            hideTimer = null;
        }, 280);
    }

    closeButton.addEventListener('click', callbacks.onClose);

    return {
        open,
        close,
        isOpen: () => model !== null,
        currentPath: () => model?.treePath || '',
    };
}
