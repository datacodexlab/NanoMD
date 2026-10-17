import { sha256Hex } from './audio-cache';

export const HISTORY_STORAGE_KEY = 'nano_share_history';
const LINKS_STORAGE_KEY = 'nanomd_tts_doc_links';

interface HistoryItem {
    id: string;
    url?: string;
    fullContent?: string;
}

function readHistory(): HistoryItem[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === 'string') : [];
    } catch {
        return [];
    }
}

function readLinks(): Record<string, string> {
    try {
        const parsed = JSON.parse(localStorage.getItem(LINKS_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function writeLinks(links: Record<string, string>): void {
    try {
        localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
    } catch {
        // storage unavailable
    }
}

/**
 * Called when reading starts. Shared history items do not store their text, so the hash of the
 * document opened through ?share=<id> is recorded against the matching history item.
 */
export function registerDocument(docHash: string): void {
    let shareId: string | null = null;
    try {
        shareId = new URLSearchParams(window.location.search).get('share');
    } catch {
        return;
    }
    if (!shareId) return;
    const item = readHistory().find(h => h.id === shareId || (h.url ? h.url.includes(shareId) : false));
    if (!item) return;
    const links = readLinks();
    if (links[item.id] === docHash) return;
    links[item.id] = docHash;
    writeLinks(links);
}

/**
 * Hashes of every document that should keep its cached audio: history items with stored text,
 * recorded share links for items still in history, and the current document.
 * Links to history items that no longer exist are dropped.
 */
export async function collectKeepHashes(currentContent: string): Promise<Set<string>> {
    const keep = new Set<string>();
    const history = readHistory();

    for (const item of history) {
        if (item.fullContent) keep.add(await sha256Hex(item.fullContent));
    }

    const links = readLinks();
    const ids = new Set(history.map(h => h.id));
    let changed = false;
    for (const id of Object.keys(links)) {
        if (ids.has(id)) {
            keep.add(links[id]);
        } else {
            delete links[id];
            changed = true;
        }
    }
    if (changed) writeLinks(links);

    if (currentContent) keep.add(await sha256Hex(currentContent));
    return keep;
}
