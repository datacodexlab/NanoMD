const DB_NAME = 'nanomd_tts_cache';
const STORE_NAME = 'audio';
const DB_VERSION = 1;
// Entries used this recently are never evicted by the size cap.
const RECENT_PROTECTION_MS = 10 * 60 * 1000;

export const DEFAULT_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_MAX_BYTES = 250 * 1024 * 1024;

interface AudioEntry {
    id: string;
    pcm: ArrayBuffer;
    bytes: number;
    docHashes: string[];
    createdAt: number;
    lastUsedAt: number;
}

type EntryMeta = Pick<AudioEntry, 'id' | 'bytes' | 'docHashes' | 'lastUsedAt'>;

export interface PruneOptions {
    keepDocHashes: Set<string>;
    graceMs?: number;
    maxBytes?: number;
}

export async function sha256Hex(text: string): Promise<string> {
    try {
        const data = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        // crypto.subtle is missing on insecure origins; fall back to a non-cryptographic hash.
        let h1 = 0xdeadbeef;
        let h2 = 0x41c6ce57;
        for (let i = 0; i < text.length; i++) {
            const ch = text.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return `f${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
    }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
    if (!dbPromise) {
        dbPromise = new Promise(resolve => {
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = () => {
                    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
                request.onblocked = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    }
    return dbPromise;
}

function wrap<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function done(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

/** Walks every entry; only the metadata of each is retained so large audio is not kept in memory. */
function readAllMeta(store: IDBObjectStore): Promise<EntryMeta[]> {
    return new Promise((resolve, reject) => {
        const metas: EntryMeta[] = [];
        const request = store.openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) {
                resolve(metas);
                return;
            }
            const { id, bytes, docHashes, lastUsedAt } = cursor.value as AudioEntry;
            metas.push({ id, bytes, docHashes, lastUsedAt });
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
}

export async function getAudio(id: string): Promise<Int16Array | null> {
    try {
        const db = await openDb();
        if (!db) return null;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const entry = (await wrap(store.get(id))) as AudioEntry | undefined;
        if (!entry) return null;
        store.put({ ...entry, lastUsedAt: Date.now() });
        await done(tx);
        return new Int16Array(entry.pcm);
    } catch {
        return null;
    }
}

export async function putAudio(id: string, pcm: Int16Array, docHash: string): Promise<void> {
    try {
        const db = await openDb();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const existing = (await wrap(store.get(id))) as AudioEntry | undefined;
        const now = Date.now();
        const buffer = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
        const entry: AudioEntry = {
            id,
            pcm: buffer,
            bytes: buffer.byteLength,
            docHashes: existing && existing.docHashes.includes(docHash)
                ? existing.docHashes
                : [...(existing?.docHashes ?? []), docHash],
            createdAt: existing?.createdAt ?? now,
            lastUsedAt: now
        };
        store.put(entry);
        await done(tx);
    } catch {
        // quota exceeded or storage unavailable: the cache is best-effort
    }
}

export async function linkDoc(id: string, docHash: string): Promise<void> {
    try {
        const db = await openDb();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const entry = (await wrap(store.get(id))) as AudioEntry | undefined;
        if (entry && !entry.docHashes.includes(docHash)) {
            store.put({ ...entry, docHashes: [...entry.docHashes, docHash] });
        }
        await done(tx);
    } catch {
        // best-effort
    }
}

export async function totalBytes(): Promise<number> {
    try {
        const db = await openDb();
        if (!db) return 0;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const metas = await readAllMeta(tx.objectStore(STORE_NAME));
        return metas.reduce((sum, m) => sum + m.bytes, 0);
    } catch {
        return 0;
    }
}

export async function clearAll(): Promise<void> {
    try {
        const db = await openDb();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        await done(tx);
    } catch {
        // best-effort
    }
}

export async function prune(options: PruneOptions): Promise<void> {
    const { keepDocHashes, graceMs = DEFAULT_GRACE_MS, maxBytes = DEFAULT_MAX_BYTES } = options;
    try {
        const db = await openDb();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const metas = await readAllMeta(store);
        const now = Date.now();

        // Rule 1: no document in history references it and it has not been used within the grace period.
        const survivors: EntryMeta[] = [];
        for (const meta of metas) {
            const referenced = meta.docHashes.some(h => keepDocHashes.has(h));
            if (!referenced && now - meta.lastUsedAt > graceMs) {
                store.delete(meta.id);
            } else {
                survivors.push(meta);
            }
        }

        // Rule 2: size cap, least recently used first, never touching recently used entries.
        let total = survivors.reduce((sum, m) => sum + m.bytes, 0);
        if (total > maxBytes) {
            const candidates = survivors
                .filter(m => now - m.lastUsedAt > RECENT_PROTECTION_MS)
                .sort((a, b) => a.lastUsedAt - b.lastUsedAt);
            for (const meta of candidates) {
                if (total <= maxBytes) break;
                store.delete(meta.id);
                total -= meta.bytes;
            }
        }
        await done(tx);
    } catch {
        // best-effort
    }
}
