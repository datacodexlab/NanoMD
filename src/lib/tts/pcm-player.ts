import { WsolaStretcher } from './time-stretch';

const SAMPLE_RATE = 24000;
// Small lead so the first buffer is never scheduled in the past.
const START_LEAD_SECONDS = 0.05;
// Raw audio is stretched and scheduled in blocks of about this size.
const BLOCK_SAMPLES = SAMPLE_RATE;
// Keep roughly this much audio scheduled ahead of the playhead.
const LOOKAHEAD_SECONDS = 8;
const PUMP_INTERVAL_MS = 250;
const SEGMENT_KEEP_SECONDS = 10;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Maps a scheduled stretch of output time (AudioContext clock) to the raw source range it plays. */
interface Segment {
    ctxStart: number;
    ctxEnd: number;
    rawStart: number;
    rawEnd: number;
}

/**
 * Gapless Web Audio player for headerless PCM16 mono audio at 24 kHz.
 * The received raw audio is the source of truth; it is played at the chosen rate with
 * pitch-preserving time stretching. All public times are RAW source seconds.
 */
export class PcmPlayer {
    onEnded: (() => void) | null = null;

    private ctx: AudioContext | null = null;
    private sources = new Set<AudioBufferSourceNode>();
    // Every PCM chunk received in the current run, kept for seek() and rate changes.
    private stored: Int16Array[] = [];
    private storedSamples = 0;
    private segments: Segment[] = [];
    private stretcher: WsolaStretcher | null = null;
    private rate = 1;
    private nextStart = 0;
    // Raw sample index up to which audio has been handed to the scheduler.
    private frontier = 0;
    private baseRaw = 0;
    private hasStarted = false;
    private flushed = false;
    private ended = false;
    private paused = false;
    private generation = 0;
    private pumpTimer: ReturnType<typeof setInterval> | null = null;

    /** Creates the context lazily; call from a user-gesture path (e.g. a click handler). */
    private ensureContext(): AudioContext {
        if (!this.ctx) {
            const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
            if (!Ctor) throw new Error('Web Audio is not supported');
            this.ctx = new Ctor();
        }
        if (this.ctx.state === 'suspended' && !this.paused) {
            void this.ctx.resume();
        }
        return this.ctx;
    }

    /** Call inside a click handler to unlock audio before the first network chunk arrives. */
    prepare(): void {
        this.ensureContext();
    }

    /** Copies raw samples [from, to) of the stored audio into a float array. */
    private readRaw(from: number, to: number): Float32Array {
        const out = new Float32Array(to - from);
        let chunkStart = 0;
        for (const pcm of this.stored) {
            const chunkEnd = chunkStart + pcm.length;
            if (chunkEnd > from && chunkStart < to) {
                const a = Math.max(from, chunkStart);
                const b = Math.min(to, chunkEnd);
                for (let i = a; i < b; i++) out[i - from] = pcm[i - chunkStart] / 32768;
            }
            if (chunkEnd >= to) break;
            chunkStart = chunkEnd;
        }
        return out;
    }

    private scheduleOutput(ctx: AudioContext, samples: Float32Array, rawStart: number, rawEnd: number): void {
        if (samples.length === 0) return;
        const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
        buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const generation = this.generation;
        source.onended = () => {
            if (generation !== this.generation) return;
            this.sources.delete(source);
            this.checkEnded();
        };

        // On underrun the clock moved past the planned start: continue from now.
        const now = ctx.currentTime;
        if (this.nextStart < now) this.nextStart = now;
        const ctxStart = this.nextStart;
        source.start(ctxStart);
        this.sources.add(source);
        this.nextStart += buffer.duration;
        this.segments.push({ ctxStart, ctxEnd: this.nextStart, rawStart, rawEnd });
    }

    /** Stretches and schedules raw audio until enough is queued ahead of the playhead. */
    private pump(): void {
        const ctx = this.ctx;
        if (!ctx || !this.hasStarted || this.flushed) return;

        while (this.frontier < this.storedSamples) {
            const ahead = this.nextStart - ctx.currentTime;
            if (ahead > LOOKAHEAD_SECONDS) return;

            const from = this.frontier;
            const to = Math.min(from + BLOCK_SAMPLES, this.storedSamples);
            const raw = this.readRaw(from, to);
            const out = this.stretcher ? this.stretcher.push(raw) : raw;
            this.frontier = to;
            this.scheduleOutput(ctx, out, from / SAMPLE_RATE, to / SAMPLE_RATE);
        }

        if (this.ended) {
            if (this.stretcher) {
                const tail = this.stretcher.flush();
                this.scheduleOutput(ctx, tail, this.frontier / SAMPLE_RATE, this.frontier / SAMPLE_RATE);
            }
            this.flushed = true;
            this.checkEnded();
        }
        this.pruneSegments(ctx.currentTime);
    }

    private pruneSegments(now: number): void {
        let drop = 0;
        while (drop < this.segments.length - 1 && this.segments[drop].ctxEnd < now - SEGMENT_KEEP_SECONDS) drop++;
        if (drop > 0) this.segments.splice(0, drop);
    }

    private startPumpTimer(): void {
        if (this.pumpTimer === null) {
            this.pumpTimer = setInterval(() => this.pump(), PUMP_INTERVAL_MS);
        }
    }

    private stopPumpTimer(): void {
        if (this.pumpTimer !== null) {
            clearInterval(this.pumpTimer);
            this.pumpTimer = null;
        }
    }

    private haltSources(): void {
        this.generation++;
        this.sources.forEach(source => {
            source.onended = null;
            try {
                source.stop();
            } catch {
                // already stopped
            }
            source.disconnect();
        });
        this.sources.clear();
        this.segments = [];
    }

    enqueue(pcm: Int16Array): void {
        if (pcm.length === 0) return;
        const ctx = this.ensureContext();
        if (!this.hasStarted) {
            this.hasStarted = true;
            this.frontier = 0;
            this.baseRaw = 0;
            this.nextStart = ctx.currentTime + START_LEAD_SECONDS;
            this.stretcher = this.rate === 1 ? null : new WsolaStretcher(this.rate);
            this.startPumpTimer();
        }
        this.stored.push(pcm);
        this.storedSamples += pcm.length;
        this.pump();
    }

    /**
     * Jumps to an offset (raw seconds) inside the audio received so far, without any network use.
     * Scheduled sources are replaced; the pause state is preserved.
     */
    seek(seconds: number): void {
        if (!this.hasStarted) return;
        const ctx = this.ensureContext();
        const target = Math.min(Math.max(Math.floor(seconds * SAMPLE_RATE), 0), this.storedSamples);

        this.haltSources();
        this.stretcher = this.rate === 1 ? null : new WsolaStretcher(this.rate);
        this.frontier = target;
        this.baseRaw = target / SAMPLE_RATE;
        this.flushed = false;
        this.nextStart = ctx.currentTime + START_LEAD_SECONDS;
        this.startPumpTimer();
        this.pump();
        this.checkEnded();
    }

    /** Changes playback speed. The position is kept (in raw time) and no new request is made. */
    setRate(rate: number): void {
        if (rate === this.rate) return;
        const position = this.currentTime();
        this.rate = rate;
        if (this.hasStarted) this.seek(position);
    }

    getRate(): number {
        return this.rate;
    }

    /** Signals that no more audio will be enqueued for this run. */
    markEnd(): void {
        this.ended = true;
        this.pump();
        this.checkEnded();
    }

    private checkEnded(): void {
        if (this.ended && this.flushed && this.sources.size === 0) {
            this.ended = false;
            this.stopPumpTimer();
            this.onEnded?.();
        }
    }

    pause(): void {
        this.paused = true;
        void this.ctx?.suspend();
    }

    resume(): void {
        this.paused = false;
        if (this.ctx) void this.ctx.resume();
    }

    stop(): void {
        this.haltSources();
        this.stopPumpTimer();
        this.stored = [];
        this.storedSamples = 0;
        this.stretcher = null;
        this.nextStart = 0;
        this.frontier = 0;
        this.baseRaw = 0;
        this.hasStarted = false;
        this.flushed = false;
        this.ended = false;
        this.paused = false;
        if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    }

    /** Raw source seconds played so far in the current run (frozen while paused). */
    currentTime(): number {
        if (!this.ctx || !this.hasStarted) return 0;
        const t = this.ctx.currentTime;
        const total = this.storedSamples / SAMPLE_RATE;
        const segments = this.segments;
        if (segments.length === 0) return Math.min(this.baseRaw, total);

        let found: Segment | null = null;
        for (let i = segments.length - 1; i >= 0; i--) {
            if (segments[i].ctxStart <= t) {
                found = segments[i];
                break;
            }
        }
        if (!found) return Math.min(segments[0].rawStart, total);
        if (t >= found.ctxEnd) return Math.min(found.rawEnd, total);
        const span = found.ctxEnd - found.ctxStart;
        const fraction = span > 0 ? (t - found.ctxStart) / span : 0;
        return Math.min(found.rawStart + fraction * (found.rawEnd - found.rawStart), total);
    }

    /** Total raw seconds of audio enqueued in the current run. */
    totalDuration(): number {
        return this.storedSamples / SAMPLE_RATE;
    }

    dispose(): void {
        this.stop();
        this.onEnded = null;
        const ctx = this.ctx;
        this.ctx = null;
        if (ctx && ctx.state !== 'closed') void ctx.close();
    }
}
