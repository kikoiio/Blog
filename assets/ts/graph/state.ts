import type { SavedGraphState } from './types';

const STATE_KEY = 'graph-expanded-paths';
const FOCUS_KEY = 'graph-focus-path';

export function saveState(expandedPaths: string[], focusPath: string) {
    try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(expandedPaths));
        sessionStorage.setItem(FOCUS_KEY, focusPath);
    } catch {}
}

export function loadState(): SavedGraphState | null {
    try {
        const paths = sessionStorage.getItem(STATE_KEY);
        const focus = sessionStorage.getItem(FOCUS_KEY) || '';
        if (paths) return { expandedPaths: JSON.parse(paths), focusPath: focus };
    } catch {}

    return null;
}

export function clearState() {
    try {
        sessionStorage.removeItem(STATE_KEY);
        sessionStorage.removeItem(FOCUS_KEY);
    } catch {}
}
