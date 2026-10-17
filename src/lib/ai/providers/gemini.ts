import type { TtsVoice } from '../types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TRANSLATE_MODEL = 'gemini-flash-lite-latest';

export type GeminiErrorKind = 'rate-limit' | 'invalid-key' | 'other';

/** Typed error thrown by the Gemini adapter. Never carries the key. */
export class GeminiError extends Error {
    readonly kind: GeminiErrorKind;
    readonly status: number;
    /** Server-suggested wait before retrying (429 only), when it could be parsed. */
    readonly retryAfterMs?: number;

    constructor(kind: GeminiErrorKind, status: number, message: string, retryAfterMs?: number) {
        super(message);
        this.kind = kind;
        this.status = status;
        this.retryAfterMs = retryAfterMs;
    }
}

const KEY_PROBLEM_PATTERN = /api key|api_key_invalid|permission_denied/i;

function classify(status: number, detail: string): GeminiErrorKind {
    if (status === 429) return 'rate-limit';
    if (status === 401 || status === 403) return 'invalid-key';
    // A 400 can also be a malformed request, so it only counts as a key problem when it says so.
    if (status === 400 && KEY_PROBLEM_PATTERN.test(detail)) return 'invalid-key';
    return 'other';
}

/** Parses "Please retry in 38s" / "retry in 11h30m39s" into milliseconds, or undefined. */
export function parseRetryDelayMs(message: string): number | undefined {
    const match = /retry in\s+([0-9hms.\s]+)/i.exec(message);
    if (!match) return undefined;
    const multipliers: Record<string, number> = { h: 3_600_000, m: 60_000, s: 1000, ms: 1 };
    let total = 0;
    let found = false;
    for (const part of match[1].matchAll(/(\d+(?:\.\d+)?)\s*(ms|h|m|s)/gi)) {
        total += parseFloat(part[1]) * multipliers[part[2].toLowerCase()];
        found = true;
    }
    return found ? Math.ceil(total) : undefined;
}

async function toError(response: Response): Promise<GeminiError> {
    let message = `Gemini request failed (${response.status})`;
    let detail = '';
    try {
        const data = await response.json();
        if (typeof data?.error?.message === 'string') message = data.error.message;
        detail = `${message} ${typeof data?.error?.status === 'string' ? data.error.status : ''}`;
    } catch {
        // body is not JSON
    }
    const kind = classify(response.status, detail);
    return new GeminiError(kind, response.status, message, kind === 'rate-limit' ? parseRetryDelayMs(message) : undefined);
}

export interface KeyTestResult {
    ok: boolean;
    /** Provider's reason when the key cannot generate (never contains the key). */
    detail?: string;
}

/**
 * Runs a one-token text generation. Listing models is not enough: a key whose project
 * Google has blocked still lists models but gets 403 on every generation.
 */
export async function testKey(key: string): Promise<KeyTestResult> {
    try {
        const response = await fetch(`${API_BASE}/models/${TRANSLATE_MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
                generationConfig: { maxOutputTokens: 1 }
            })
        });
        if (response.ok) return { ok: true };
        const error = await toError(response);
        // A rate-limited key is still a working key.
        if (error.kind === 'rate-limit') return { ok: true, detail: error.message };
        return { ok: false, detail: error.message };
    } catch {
        return { ok: false, detail: 'Network error' };
    }
}

/**
 * Walks a parsed SSE event and collects base64 audio payloads.
 * Audio deltas are objects whose type is "audio" or whose mime type starts with "audio",
 * carrying a base64 string in the "data" field.
 */
export function collectAudioData(node: unknown, out: string[] = [], inAudio = false): string[] {
    if (Array.isArray(node)) {
        for (const item of node) collectAudioData(item, out, inAudio);
        return out;
    }
    if (node && typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        const mime = obj.mime_type ?? obj.mimeType;
        const isAudio =
            inAudio ||
            obj.type === 'audio' ||
            (typeof mime === 'string' && mime.startsWith('audio'));
        if (isAudio && typeof obj.data === 'string' && obj.data.length > 0) out.push(obj.data);
        for (const value of Object.values(obj)) {
            if (value && typeof value === 'object') collectAudioData(value, out, isAudio);
        }
    }
    return out;
}

export interface StreamSpeechOptions {
    key: string;
    model: string;
    text: string;
    voice: TtsVoice;
    style: string;
    signal?: AbortSignal;
}

export async function* streamSpeech(opts: StreamSpeechOptions): AsyncGenerator<Int16Array> {
    const { key, model, text, voice, style, signal } = opts;
    let response: Response;
    try {
        response = await fetch(`${API_BASE}/interactions`, {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
                model,
                input: [{
                    type: 'user_input',
                    content: [{
                        type: 'text',
                        text,
                        annotations: [{ type: 'speech_metadata', style }]
                    }]
                }],
                response_format: { type: 'audio' },
                generation_config: { speech_config: [{ voice }] },
                stream: true
            })
        });
    } catch (err) {
        if (signal?.aborted) throw err;
        throw new GeminiError('other', 0, 'Network error');
    }

    if (!response.ok) throw await toError(response);
    if (!response.body) throw new GeminiError('other', response.status, 'Empty response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    // Odd trailing byte carried between chunks so PCM16 samples stay aligned.
    let carry: Uint8Array | null = null;

    const toPcm = (b64: string): Int16Array | null => {
        const binary = atob(b64);
        let bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        if (carry) {
            const merged = new Uint8Array(carry.length + bytes.length);
            merged.set(carry, 0);
            merged.set(bytes, carry.length);
            bytes = merged;
            carry = null;
        }
        if (bytes.length % 2 === 1) {
            carry = bytes.slice(bytes.length - 1);
            bytes = bytes.slice(0, bytes.length - 1);
        }
        if (bytes.length === 0) return null;
        return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    };

    const handleEvent = (rawEvent: string): Int16Array[] => {
        const dataLines: string[] = [];
        for (const line of rawEvent.split('\n')) {
            if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length === 0) return [];
        const payload = dataLines.join('\n').trim();
        if (!payload || payload === '[DONE]') return [];
        let parsed: unknown;
        try {
            parsed = JSON.parse(payload);
        } catch {
            return [];
        }
        const chunks: Int16Array[] = [];
        for (const b64 of collectAudioData(parsed)) {
            try {
                const pcm = toPcm(b64);
                if (pcm) chunks.push(pcm);
            } catch {
                // not valid base64, ignore
            }
        }
        return chunks;
    };

    try {
        while (true) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            let result: ReadableStreamReadResult<Uint8Array>;
            try {
                result = await reader.read();
            } catch (err) {
                if (signal?.aborted) throw err;
                throw new GeminiError('other', 0, 'Stream interrupted');
            }
            if (result.done) break;
            buffer += decoder.decode(result.value, { stream: true }).replace(/\r\n/g, '\n');
            let sep: number;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
                const rawEvent = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);
                for (const chunk of handleEvent(rawEvent)) yield chunk;
            }
        }
        buffer += decoder.decode().replace(/\r\n/g, '\n');
        if (buffer.trim()) {
            for (const chunk of handleEvent(buffer)) yield chunk;
        }
    } finally {
        reader.cancel().catch(() => undefined);
    }
}

export interface TranslateOptions {
    key: string;
    text: string;
    targetLang: 'ar' | 'en';
    useContext: boolean;
    signal?: AbortSignal;
}

function buildTranslatePrompt(targetLang: 'ar' | 'en', useContext: boolean): string {
    const lang = targetLang === 'ar' ? 'Arabic' : 'English';
    const rule = useContext
        ? 'Infer the document domain internally before translating. Do not reveal the inferred domain. Choose natural terminology for that domain.'
        : 'Translate directly without domain analysis.';
    return `You are a professional Markdown translator. Translate the following Markdown text to ${lang}. Rules:
1. ${rule}
2. Preserve ALL Markdown formatting (headers, bold, italic, lists, links, tables, etc.)
3. Do NOT translate code blocks or inline code
4. Do NOT translate URLs or file paths
5. Do NOT add explanations or notes
6. Output ONLY the translated text
7. Maintain the original paragraph structure
8. Do NOT repeat the original term in parentheses after its translation`;
}

export async function translate(opts: TranslateOptions): Promise<string> {
    const { key, text, targetLang, useContext, signal } = opts;
    let response: Response;
    try {
        response = await fetch(`${API_BASE}/models/${TRANSLATE_MODEL}:generateContent`, {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text }] }],
                systemInstruction: { parts: [{ text: buildTranslatePrompt(targetLang, useContext) }] }
            })
        });
    } catch (err) {
        if (signal?.aborted) throw err;
        throw new GeminiError('other', 0, 'Network error');
    }
    if (!response.ok) throw await toError(response);

    const data = await response.json();
    const parts: unknown[] = data?.candidates?.[0]?.content?.parts ?? [];
    const translated = parts
        .map(p => (p && typeof (p as { text?: unknown }).text === 'string' ? (p as { text: string }).text : ''))
        .join('')
        .trim();
    if (!translated) throw new GeminiError('other', response.status, 'Empty translation');
    return translated;
}
