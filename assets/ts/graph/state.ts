import type { SavedGraphState } from './types';

const STATE_KEY = 'graph-expanded-paths';
const FOCUS_KEY = 'graph-focus-path';
const INDEX_KEY = 'graph-index-path';

export function saveState(expandedPaths: string[], focusPath: string, indexPath = '') {
    try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(expandedPaths));
        sessionStorage.setItem(FOCUS_KEY, focusPath);
        sessionStorage.setItem(INDEX_KEY, indexPath);
    } catch {}
}

export function loadState(): SavedGraphState | null {
    try {
        const paths = sessionStorage.getItem(STATE_KEY);
        const focus = sessionStorage.getItem(FOCUS_KEY) || '';
        const index = sessionStorage.getItem(INDEX_KEY) || '';
        if (paths) return { expandedPaths: JSON.parse(paths), focusPath: focus, indexPath: index };
    } catch {}

    return null;
}

export function clearState() {
    try {
        sessionStorage.removeItem(STATE_KEY);
        sessionStorage.removeItem(FOCUS_KEY);
        sessionStorage.removeItem(INDEX_KEY);
    } catch {}
}
