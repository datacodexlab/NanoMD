import { getKeys } from './key-store';
import { GeminiError, streamSpeech, translate } from './providers/gemini';
import {
    InvalidKeyError,
    NoKeyError,
    QuotaExhaustedError,
    type TtsVoice
} from './types';

export const TTS_MODEL_PRIMARY = 'gemini-3.8-flash-lite-tts';
export const TTS_MODEL_FALLBACK = 'gemini-3.8-flash-tts';
const TTS_MODELS = [TTS_MODEL_PRIMARY, TTS_MODEL_FALLBACK];

const COOLDOWN_MS = 60_000;
const STYLE_BASE =
    'Speak in natural Egyptian Arabic dialect, calm and clear like a podcast host. Pronounce English words and technical terms in English.';

// Session-only memory of "keyId:model" pairs that hit 429 -> timestamp until which to skip them.
const cooldowns = new Map<string, number>();

function cooldownKey(keyId: string, model: string): string {
    return `${keyId}:${model}`;
}

function isCoolingDown(keyId: string, model: string): boolean {
    const until = cooldowns.get(cooldownKey(keyId, model));
    if (until === undefined) return false;
    if (Date.now() >= until) {
        cooldowns.delete(cooldownKey(keyId, model));
        return false;
    }
    return true;
}

function markRateLimited(keyId: string, model: string, retryAfterMs?: number): void {
    const wait = retryAfterMs !== undefined && retryAfterMs > 0 ? retryAfterMs : COOLDOWN_MS;
    cooldowns.set(cooldownKey(keyId, model), Date.now() + wait);
}

/** Earliest epoch ms at which any stored key/TTS model becomes available again, or null if one is available now. */
export function getQuotaRetryAt(): number | null {
    const now = Date.now();
    let earliest = Infinity;
    for (const stored of getKeys('gemini')) {
        for (const model of TTS_MODELS) {
            const until = cooldowns.get(cooldownKey(stored.id, model));
            if (until === undefined || until <= now) return null;
            earliest = Math.min(earliest, until);
        }
    }
    return Number.isFinite(earliest) ? earliest : null;
}

/** Speech is always generated at normal speed; playback speed is applied by the player. */
export function buildStyle(): string {
    return STYLE_BASE;
}

export interface SpeakOptions {
    voice: TtsVoice;
    signal?: AbortSignal;
}

function toTypedError(err: GeminiError): Error {
    if (err.kind === 'rate-limit') return new QuotaExhaustedError(err.message);
    if (err.kind === 'invalid-key') return new InvalidKeyError(err.message);
    return err;
}

function finalError(sawRateLimit: boolean): Error {
    return sawRateLimit
        ? new QuotaExhaustedError('Quota exhausted for all keys')
        : new InvalidKeyError('All keys were rejected');
}

export async function* speakWithFallback(
    text: string,
    opts: SpeakOptions
): AsyncGenerator<Int16Array> {
    const keys = getKeys('gemini');
    if (keys.length === 0) throw new NoKeyError('No Gemini key stored');

    const style = buildStyle();
    let sawRateLimit = false;

    for (const stored of keys) {
        for (const model of TTS_MODELS) {
            if (isCoolingDown(stored.id, model)) {
                sawRateLimit = true;
                continue;
            }
            let started = false;
            try {
                for await (const pcm of streamSpeech({
                    key: stored.key,
                    model,
                    text,
                    voice: opts.voice,
                    style,
                    signal: opts.signal
                })) {
                    started = true;
                    yield pcm;
                }
                return;
            } catch (err) {
                if (opts.signal?.aborted || !(err instanceof GeminiError)) throw err;
                // After audio started we never retry silently: let the player stop cleanly.
                if (started) throw toTypedError(err);
                if (err.kind === 'rate-limit') {
                    sawRateLimit = true;
                    markRateLimited(stored.id, model, err.retryAfterMs);
                    continue; // next model with the same key
                }
                if (err.kind === 'invalid-key') break; // next key
                throw err;
            }
        }
    }
    throw finalError(sawRateLimit);
}

export async function translateWithFallback(
    text: string,
    targetLang: 'ar' | 'en',
    useContext: boolean,
    signal?: AbortSignal
): Promise<string> {
    const keys = getKeys('gemini');
    if (keys.length === 0) throw new NoKeyError('No Gemini key stored');

    let sawRateLimit = false;
    for (const stored of keys) {
        if (isCoolingDown(stored.id, 'translate')) {
            sawRateLimit = true;
            continue;
        }
        try {
            return await translate({ key: stored.key, text, targetLang, useContext, signal });
        } catch (err) {
            if (signal?.aborted || !(err instanceof GeminiError)) throw err;
            if (err.kind === 'rate-limit') {
                sawRateLimit = true;
                markRateLimited(stored.id, 'translate', err.retryAfterMs);
                continue;
            }
            if (err.kind === 'invalid-key') continue;
            throw err;
        }
    }
    throw finalError(sawRateLimit);
}
