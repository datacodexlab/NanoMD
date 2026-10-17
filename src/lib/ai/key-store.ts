import { PLAYBACK_SPEEDS, type AiProviderId, type AiSettings, type StoredKey } from './types';

const KEYS_STORAGE_KEY = 'nanomd_ai_keys';
const SETTINGS_STORAGE_KEY = 'nanomd_ai_settings';

const DEFAULT_SETTINGS: AiSettings = {
    voice: 'Kore',
    speed: 1,
    translationSource: 'builtin',
    rememberOnDevice: true
};

type Listener = () => void;
const listeners = new Set<Listener>();

function safeGet(storage: () => Storage, name: string): string | null {
    try {
        return storage().getItem(name);
    } catch {
        return null;
    }
}

function safeSet(storage: () => Storage, name: string, value: string): void {
    try {
        storage().setItem(name, value);
    } catch {
        // storage unavailable or full
    }
}

function safeRemove(storage: () => Storage, name: string): void {
    try {
        storage().removeItem(name);
    } catch {
        // storage unavailable
    }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

function notify(): void {
    listeners.forEach(listener => {
        try {
            listener();
        } catch {
            // a failing listener must not block the others
        }
    });
}

function parseSettings(): AiSettings {
    const raw = safeGet(local, SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
        const parsed = JSON.parse(raw) as Partial<AiSettings>;
        return {
            voice: parsed.voice === 'Charon' ? 'Charon' : 'Kore',
            // Legacy string values ('slow' | 'normal' | 'fast') and unknown numbers map to 1.
            speed: PLAYBACK_SPEEDS.find(s => s === parsed.speed) ?? 1,
            translationSource: parsed.translationSource === 'gemini' ? 'gemini' : 'builtin',
            rememberOnDevice: typeof parsed.rememberOnDevice === 'boolean'
                ? parsed.rememberOnDevice
                : DEFAULT_SETTINGS.rememberOnDevice
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function parseKeys(storage: () => Storage): StoredKey[] {
    const raw = safeGet(storage, KEYS_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (k): k is StoredKey =>
                k && typeof k.id === 'string' && typeof k.key === 'string' && k.provider === 'gemini'
        );
    } catch {
        return [];
    }
}

function activeStorage(settings: AiSettings): () => Storage {
    return settings.rememberOnDevice ? local : session;
}

function readAllKeys(): StoredKey[] {
    return parseKeys(activeStorage(parseSettings()));
}

function writeAllKeys(keys: StoredKey[]): void {
    const settings = parseSettings();
    const target = activeStorage(settings);
    const other = settings.rememberOnDevice ? session : local;
    safeSet(target, KEYS_STORAGE_KEY, JSON.stringify(keys));
    safeRemove(other, KEYS_STORAGE_KEY);
}

function generateId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
}

export function getKeys(provider?: AiProviderId): StoredKey[] {
    const keys = readAllKeys();
    return provider ? keys.filter(k => k.provider === provider) : keys;
}

export function addKey(provider: AiProviderId, key: string, label?: string): StoredKey {
    const trimmed = key.trim();
    if (!trimmed) throw new Error('Key is empty');
    const keys = readAllKeys();
    if (keys.some(k => k.provider === provider && k.key === trimmed)) {
        throw new Error('Key already exists');
    }
    const entry: StoredKey = {
        id: generateId(),
        provider,
        key: trimmed,
        label: label?.trim() || undefined,
        addedAt: new Date().toISOString()
    };
    writeAllKeys([...keys, entry]);
    notify();
    return entry;
}

export function removeKey(id: string): void {
    const keys = readAllKeys();
    const next = keys.filter(k => k.id !== id);
    if (next.length === keys.length) return;
    writeAllKeys(next);
    notify();
}

export function clearAllKeys(): void {
    safeRemove(local, KEYS_STORAGE_KEY);
    safeRemove(session, KEYS_STORAGE_KEY);
    notify();
}

export function getSettings(): AiSettings {
    return parseSettings();
}

export function updateSettings(partial: Partial<AiSettings>): AiSettings {
    const previous = parseSettings();
    const next: AiSettings = { ...previous, ...partial };
    // Move the keys when the storage location changes.
    const keys = parseKeys(activeStorage(previous));
    safeSet(local, SETTINGS_STORAGE_KEY, JSON.stringify(next));
    if (next.rememberOnDevice !== previous.rememberOnDevice) {
        const from = activeStorage(previous);
        const to = activeStorage(next);
        if (keys.length > 0) safeSet(to, KEYS_STORAGE_KEY, JSON.stringify(keys));
        safeRemove(from, KEYS_STORAGE_KEY);
    }
    notify();
    return next;
}

export function maskKey(key: string): string {
    if (key.length <= 8) return '…';
    return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === KEYS_STORAGE_KEY || e.key === SETTINGS_STORAGE_KEY) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}
