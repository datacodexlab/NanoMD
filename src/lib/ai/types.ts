export type AiProviderId = 'gemini';

export interface StoredKey {
    id: string;
    provider: AiProviderId;
    key: string;
    label?: string;
    addedAt: string;
}

export type TtsVoice = 'Kore' | 'Charon';
export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5;
/** Cycle order used by the speed button. */
export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 0.75];
/** @deprecated Use PlaybackSpeed. Kept so older UI code still compiles. */
export type TtsSpeed = PlaybackSpeed;
export type TranslationSource = 'builtin' | 'gemini';

export interface AiSettings {
    voice: TtsVoice;
    speed: PlaybackSpeed;
    translationSource: TranslationSource;
    rememberOnDevice: boolean;
}

/** All keys/models are exhausted (rate limited). */
export class QuotaExhaustedError extends Error {}
/** No key is stored for the provider. */
export class NoKeyError extends Error {}
/** Every stored key was rejected by the provider. */
export class InvalidKeyError extends Error {}
