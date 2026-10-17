import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useAppContext } from './AppContext';
import { getQuotaRetryAt, speakWithFallback } from '../lib/ai/fallback';
import { getKeys, getSettings, subscribe, updateSettings } from '../lib/ai/key-store';
import { InvalidKeyError, NoKeyError, QuotaExhaustedError, type PlaybackSpeed } from '../lib/ai/types';
import { clearAll, getAudio, linkDoc, prune, putAudio, sha256Hex, totalBytes } from '../lib/tts/audio-cache';
import { collectKeepHashes, HISTORY_STORAGE_KEY, registerDocument } from '../lib/tts/doc-links';
import { PcmPlayer } from '../lib/tts/pcm-player';
import { blockText, buildChunks, collectReadableBlocks, type TextChunk } from '../lib/tts/segments';

export type ReadAloudStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type ReadAloudError = null | 'no-key' | 'quota' | 'invalid-key' | 'network';

export interface ReadAloudContextType {
    status: ReadAloudStatus;
    error: ReadAloudError;
    /** Epoch ms when a key/model becomes available again; set only when error === 'quota'. */
    quotaRetryAt: number | null;
    blockIndex: number;
    blockCount: number;
    hasKey: boolean;
    /** Size of the browser audio cache in bytes. */
    cachedBytes: number;
    clearAudioCache(): Promise<void>;
    /** Playback speed; the pitch is preserved and changing it never triggers a new request. */
    speed: PlaybackSpeed;
    setSpeed(s: PlaybackSpeed): void;
    play(): void;
    pause(): void;
    stop(): void;
    next(): void;
    prev(): void;
    seekToBlock(i: number): void;
}

const PREVIEW_SELECTOR = '#print-area .preview-content';
const ACTIVE_CLASS = 'read-aloud-active';
const SHOW_PREVIEW_EVENT = 'nanomd:show-preview';
const PREVIEW_RETRY_MS = 300;
const TICK_MS = 200;
const PRUNE_DELAY_MS = 5000;
const RESTART_THRESHOLD_SECONDS = 2;
// Blocks starting this close to the end of the received audio are treated as not buffered yet.
const BUFFER_MARGIN_SECONDS = 1;
// Rough speech rate used to estimate a chunk's length while its audio is still streaming.
const ESTIMATED_CHARS_PER_SECOND = 13;

interface ChunkTiming {
    start: number;
    end: number | null;
}

interface BlockSlot {
    blockIndex: number;
    start: number;
    end: number;
}

interface ActiveRun {
    controller: AbortController;
    chunks: TextChunk[];
    timings: ChunkTiming[];
    blocks: HTMLElement[];
    started: boolean;
}

function mapError(err: unknown): Exclude<ReadAloudError, null> {
    if (err instanceof NoKeyError) return 'no-key';
    if (err instanceof QuotaExhaustedError) return 'quota';
    if (err instanceof InvalidKeyError) return 'invalid-key';
    return 'network';
}

function queryRoot(): HTMLElement | null {
    return document.querySelector<HTMLElement>(PREVIEW_SELECTOR);
}

async function resolveRoot(): Promise<HTMLElement | null> {
    const existing = queryRoot();
    if (existing) return existing;
    window.dispatchEvent(new CustomEvent(SHOW_PREVIEW_EVENT));
    await new Promise(resolve => setTimeout(resolve, PREVIEW_RETRY_MS));
    return queryRoot();
}

function scrollIfHidden(el: HTMLElement): void {
    const viewport = document.getElementById('print-area');
    if (!viewport) return;
    const box = el.getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    if (box.top < view.top || box.bottom > view.bottom) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Splits a chunk's audio time across its blocks proportionally to character length.
 * While the chunk is still streaming its length is estimated.
 */
function layoutChunk(run: ActiveRun, player: PcmPlayer, ci: number): BlockSlot[] {
    const chunk = run.chunks[ci];
    const timing = run.timings[ci];
    if (!chunk || !timing) return [];

    const chars = chunk.blockIndexes.map(i => Math.max(blockText(run.blocks[i]).length, 1));
    const totalChars = chars.reduce((a, b) => a + b, 0);
    const duration = timing.end !== null
        ? timing.end - timing.start
        : Math.max(player.totalDuration() - timing.start, totalChars / ESTIMATED_CHARS_PER_SECOND);

    let acc = 0;
    return chunk.blockIndexes.map((blockIndex, i) => {
        const start = timing.start + (acc / totalChars) * duration;
        acc += chars[i];
        return { blockIndex, start, end: timing.start + (acc / totalChars) * duration };
    });
}

/** Audio start time of a block if its audio is already received, otherwise null. */
function bufferedBlockStart(run: ActiveRun, player: PcmPlayer, blockIndex: number): number | null {
    const ci = run.chunks.findIndex(c => c.blockIndexes.includes(blockIndex));
    if (ci < 0 || !run.timings[ci]) return null;
    const slot = layoutChunk(run, player, ci).find(s => s.blockIndex === blockIndex);
    if (!slot) return null;
    return slot.start < player.totalDuration() - BUFFER_MARGIN_SECONDS ? slot.start : null;
}

const ReadAloudContext = createContext<ReadAloudContextType | undefined>(undefined);

export const ReadAloudProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { appState } = useAppContext();
    const [status, setStatus] = useState<ReadAloudStatus>('idle');
    const [error, setError] = useState<ReadAloudError>(null);
    const [quotaRetryAt, setQuotaRetryAt] = useState<number | null>(null);
    const [blockIndex, setBlockIndex] = useState(-1);
    const [blockCount, setBlockCount] = useState(0);
    const [hasKey, setHasKey] = useState(() => getKeys('gemini').length > 0);
    const [cachedBytes, setCachedBytes] = useState(0);
    const [speed, setSpeedState] = useState<PlaybackSpeed>(() => getSettings().speed);

    const playerRef = useRef<PcmPlayer | null>(null);
    const runRef = useRef<ActiveRun | null>(null);
    const highlightedRef = useRef<HTMLElement | null>(null);
    const pausedRef = useRef(false);
    const blockIndexRef = useRef(-1);
    const blockStartRef = useRef(0);

    const startSeqRef = useRef(0);
    const contentRef = useRef(appState.content);
    const pruneChainRef = useRef<Promise<void>>(Promise.resolve());

    if (!playerRef.current) playerRef.current = new PcmPlayer();

    const refreshCachedBytes = useCallback(async () => {
        setCachedBytes(await totalBytes());
    }, []);

    // Prune runs are chained so two of them never overlap.
    const schedulePrune = useCallback(() => {
        pruneChainRef.current = pruneChainRef.current
            .then(async () => {
                const keepDocHashes = await collectKeepHashes(contentRef.current);
                await prune({ keepDocHashes });
                await refreshCachedBytes();
            })
            .catch(() => undefined);
    }, [refreshCachedBytes]);

    const setSpeed = useCallback((next: PlaybackSpeed) => {
        updateSettings({ speed: next });
        setSpeedState(next);
        playerRef.current?.setRate(next);
    }, []);

    const clearAudioCache = useCallback(async () => {
        await clearAll();
        await refreshCachedBytes();
    }, [refreshCachedBytes]);

    const clearHighlight = useCallback(() => {
        highlightedRef.current?.classList.remove(ACTIVE_CLASS);
        highlightedRef.current = null;
    }, []);

    const applyBlockIndex = useCallback((index: number, blocks: HTMLElement[]) => {
        if (index === blockIndexRef.current) return;
        blockIndexRef.current = index;
        setBlockIndex(index);
        clearHighlight();
        const el = blocks[index];
        if (el) {
            el.classList.add(ACTIVE_CLASS);
            highlightedRef.current = el;
            scrollIfHidden(el);
        }
    }, [clearHighlight]);

    const resetToIdle = useCallback(() => {
        clearHighlight();
        blockIndexRef.current = -1;
        blockStartRef.current = 0;
        setBlockIndex(-1);
    }, [clearHighlight]);

    const halt = useCallback(() => {
        startSeqRef.current++;
        runRef.current?.controller.abort();
        runRef.current = null;
        pausedRef.current = false;
        playerRef.current?.stop();
    }, []);

    const stop = useCallback(() => {
        halt();
        resetToIdle();
        setError(null);
        setQuotaRetryAt(null);
        setStatus('idle');
    }, [halt, resetToIdle]);

    const fail = useCallback((err: unknown) => {
        halt();
        resetToIdle();
        const mapped = mapError(err);
        setError(mapped);
        setQuotaRetryAt(mapped === 'quota' ? getQuotaRetryAt() : null);
        setStatus('error');
    }, [halt, resetToIdle]);

    const updatePosition = useCallback(() => {
        const run = runRef.current;
        const player = playerRef.current;
        if (!run || !player || !run.started) return;

        const t = player.currentTime();
        let ci = run.chunks.length - 1;
        for (let i = 0; i < run.timings.length; i++) {
            const timing = run.timings[i];
            if (!timing) break;
            if (timing.end === null || t < timing.end) {
                ci = i;
                break;
            }
        }
        const slots = layoutChunk(run, player, ci);
        if (slots.length === 0) return;
        const slot = slots.find(s => t < s.end) ?? slots[slots.length - 1];
        blockStartRef.current = slot.start;
        applyBlockIndex(slot.blockIndex, run.blocks);
    }, [applyBlockIndex]);

    const startFrom = useCallback(async (startIndex: number) => {
        halt();
        clearHighlight();
        blockIndexRef.current = -1;
        setError(null);
        setQuotaRetryAt(null);
        setStatus('loading');
        const seq = ++startSeqRef.current;

        const root = await resolveRoot();
        const docHash = await sha256Hex(contentRef.current);
        // A newer start (or a stop) happened while waiting: abandon this one.
        if (seq !== startSeqRef.current) return;
        registerDocument(docHash);
        if (!root) {
            fail(new Error('Preview not available'));
            return;
        }
        const blocks = collectReadableBlocks(root);
        setBlockCount(blocks.length);
        const from = Math.min(Math.max(startIndex, 0), Math.max(blocks.length - 1, 0));
        const chunks = buildChunks(blocks.slice(from)).map(chunk => ({
            text: chunk.text,
            blockIndexes: chunk.blockIndexes.map(i => i + from)
        }));
        if (chunks.length === 0) {
            stop();
            return;
        }

        const run: ActiveRun = {
            controller: new AbortController(),
            chunks,
            timings: [],
            blocks,
            started: false
        };
        runRef.current = run;
        const player = playerRef.current!;
        player.setRate(getSettings().speed);

        const onAudio = (pcm: Int16Array) => {
            player.enqueue(pcm);
            if (!run.started) {
                run.started = true;
                applyBlockIndex(chunks[0].blockIndexes[0], blocks);
                if (!pausedRef.current) setStatus('playing');
            }
        };

        try {
            for (let ci = 0; ci < chunks.length; ci++) {
                const timing: ChunkTiming = { start: player.totalDuration(), end: null };
                run.timings[ci] = timing;
                // Audio is generated once at normal speed; playback speed is applied by the player.
                const { voice } = getSettings();
                const cacheId = await sha256Hex(`${voice}|${chunks[ci].text}`);
                if (runRef.current !== run) return;

                const cached = await getAudio(cacheId);
                if (runRef.current !== run) return;
                if (cached) {
                    // Replay from the browser cache: no request, no quota.
                    onAudio(cached);
                    timing.end = player.totalDuration();
                    void linkDoc(cacheId, docHash);
                    continue;
                }

                const parts: Int16Array[] = [];
                for await (const pcm of speakWithFallback(chunks[ci].text, {
                    voice,
                    signal: run.controller.signal
                })) {
                    if (runRef.current !== run) return;
                    parts.push(pcm);
                    onAudio(pcm);
                }
                timing.end = player.totalDuration();

                // Only fully received chunks are cached.
                const whole = new Int16Array(parts.reduce((sum, p) => sum + p.length, 0));
                let offset = 0;
                for (const part of parts) {
                    whole.set(part, offset);
                    offset += part.length;
                }
                if (whole.length > 0) {
                    void putAudio(cacheId, whole, docHash).then(() => {
                        void refreshCachedBytes();
                        schedulePrune();
                    });
                }
            }
            if (runRef.current === run) player.markEnd();
        } catch (err) {
            if (run.controller.signal.aborted || runRef.current !== run) return;
            fail(err);
        }
    }, [applyBlockIndex, clearHighlight, fail, halt, refreshCachedBytes, schedulePrune, stop]);

    const play = useCallback(() => {
        const player = playerRef.current!;
        // Unlock the audio context synchronously inside the user gesture.
        player.prepare();
        if (status === 'paused') {
            pausedRef.current = false;
            player.resume();
            setStatus(runRef.current?.started ? 'playing' : 'loading');
            return;
        }
        if (status === 'loading' || status === 'playing') return;
        void startFrom(0);
    }, [startFrom, status]);

    const pause = useCallback(() => {
        if (status !== 'playing' && status !== 'loading') return;
        pausedRef.current = true;
        playerRef.current?.pause();
        setStatus('paused');
    }, [status]);

    const seekToBlock = useCallback((i: number) => {
        if (blockCount === 0) return;
        const player = playerRef.current!;
        player.prepare();

        // Quota is scarce: reuse audio that was already received, only hit the network beyond it.
        const run = runRef.current;
        if (run?.started) {
            const start = bufferedBlockStart(run, player, i);
            if (start !== null) {
                player.seek(start);
                blockStartRef.current = start;
                applyBlockIndex(i, run.blocks);
                return;
            }
        }
        void startFrom(i);
    }, [applyBlockIndex, blockCount, startFrom]);

    const next = useCallback(() => {
        const current = blockIndexRef.current;
        if (current < 0) return;
        if (current >= blockCount - 1) {
            stop();
            return;
        }
        seekToBlock(current + 1);
    }, [blockCount, seekToBlock, stop]);

    const prev = useCallback(() => {
        const current = blockIndexRef.current;
        if (current < 0) return;
        const elapsed = (playerRef.current?.currentTime() ?? 0) - blockStartRef.current;
        seekToBlock(elapsed > RESTART_THRESHOLD_SECONDS ? current : Math.max(current - 1, 0));
    }, [seekToBlock]);

    // Playback finished naturally.
    useEffect(() => {
        const player = playerRef.current!;
        player.onEnded = () => {
            runRef.current = null;
            resetToIdle();
            setStatus('idle');
        };
        return () => {
            halt();
            clearHighlight();
            player.dispose();
        };
    }, [clearHighlight, halt, resetToIdle]);

    // Track key availability.
    useEffect(() => {
        const refresh = () => {
            setHasKey(getKeys('gemini').length > 0);
            // Settings may be changed elsewhere (another tab or the settings modal).
            const stored = getSettings().speed;
            setSpeedState(stored);
            playerRef.current?.setRate(stored);
        };
        refresh();
        return subscribe(refresh);
    }, []);

    // Follow playback progress.
    useEffect(() => {
        if (status !== 'playing') return;
        const timer = setInterval(updatePosition, TICK_MS);
        return () => clearInterval(timer);
    }, [status, updatePosition]);

    // Cache housekeeping: once shortly after start, and whenever the history changes.
    useEffect(() => {
        void refreshCachedBytes();
        const timer = setTimeout(schedulePrune, PRUNE_DELAY_MS);
        const onStorage = (e: StorageEvent) => {
            if (e.key === null || e.key === HISTORY_STORAGE_KEY) schedulePrune();
        };
        window.addEventListener('storage', onStorage);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('storage', onStorage);
        };
    }, [refreshCachedBytes, schedulePrune]);

    // Content changed: stop reading, then refresh the readable block count.
    useEffect(() => {
        contentRef.current = appState.content;
        stop();
        const timer = setTimeout(() => {
            const root = queryRoot();
            setBlockCount(root ? collectReadableBlocks(root).length : 0);
        }, PREVIEW_RETRY_MS);
        return () => clearTimeout(timer);
    }, [appState.content, stop]);

    const value = useMemo<ReadAloudContextType>(() => ({
        status, error, quotaRetryAt, blockIndex, blockCount, hasKey, cachedBytes, clearAudioCache,
        speed, setSpeed, play, pause, stop, next, prev, seekToBlock
    }), [status, error, quotaRetryAt, blockIndex, blockCount, hasKey, cachedBytes, clearAudioCache, speed, setSpeed, play, pause, stop, next, prev, seekToBlock]);

    return <ReadAloudContext.Provider value={value}>{children}</ReadAloudContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useReadAloud = (): ReadAloudContextType => {
    const context = useContext(ReadAloudContext);
    if (context === undefined) {
        throw new Error('useReadAloud must be used within a ReadAloudProvider');
    }
    return context;
};
