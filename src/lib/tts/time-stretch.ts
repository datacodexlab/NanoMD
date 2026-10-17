// WSOLA (waveform similarity overlap-add) time stretching for mono speech at 24 kHz.
// Changes duration without changing pitch. No dependencies.

const SAMPLE_RATE = 24000;
// ~33 ms analysis/synthesis window with 50% overlap (periodic Hann sums to exactly 1).
const WINDOW = 800;
const HOP_OUT = WINDOW / 2;
// +-12 ms search tolerance around the nominal analysis position.
const TOLERANCE = Math.round(0.012 * SAMPLE_RATE);
// Correlation runs on every DECIM-th sample, and candidates are tested every COARSE_STEP samples.
const DECIM = 4;
const COARSE_STEP = 2;
const MIN_CAPACITY = SAMPLE_RATE * 4;
const COMPACT_THRESHOLD = SAMPLE_RATE * 2;

const HANN = (() => {
    const w = new Float32Array(WINDOW);
    for (let i = 0; i < WINDOW; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / WINDOW);
    return w;
})();

// The very first frame has no predecessor to cross-fade with, so its first half is not faded in.
const FIRST_WINDOW = (() => {
    const w = new Float32Array(HANN);
    for (let i = 0; i < HOP_OUT; i++) w[i] = 1;
    return w;
})();

/** Incremental WSOLA: feed audio with push(), call flush() once at the end. */
export class WsolaStretcher {
    private readonly rate: number;
    private readonly hopIn: number;
    private buf = new Float32Array(MIN_CAPACITY);
    private bufBase = 0; // absolute sample index of buf[0]
    private bufEnd = 0; // absolute index one past the last valid sample
    private pos = 0; // absolute start of the last chosen frame
    private frameIndex = 0;
    private readonly acc = new Float32Array(WINDOW);
    private totalIn = 0;
    private totalOut = 0;

    constructor(rate: number) {
        this.rate = rate;
        this.hopIn = HOP_OUT * rate;
    }

    push(input: Float32Array): Float32Array {
        this.append(input);
        this.totalIn += input.length;
        return this.process(false);
    }

    /** Drains the remaining audio. The stretcher must not be used afterwards. */
    flush(): Float32Array {
        const padding = 2 * WINDOW + 2 * TOLERANCE;
        this.append(new Float32Array(padding));
        const body = this.process(true);

        const tail = this.acc.slice(0, HOP_OUT);
        const all = new Float32Array(body.length + tail.length);
        all.set(body, 0);
        all.set(tail, body.length);

        const expected = Math.round(this.totalIn / this.rate);
        const allowed = Math.max(0, expected - (this.totalOut - body.length));
        const result = all.subarray(0, Math.min(all.length, allowed));
        this.totalOut += result.length;
        return result;
    }

    private append(input: Float32Array): void {
        const needed = this.bufEnd - this.bufBase + input.length;
        if (needed > this.buf.length) {
            const grown = new Float32Array(Math.max(needed, this.buf.length * 2));
            grown.set(this.buf.subarray(0, this.bufEnd - this.bufBase), 0);
            this.buf = grown;
        }
        this.buf.set(input, this.bufEnd - this.bufBase);
        this.bufEnd += input.length;
    }

    private compact(): void {
        const nextLow = Math.round(this.frameIndex * this.hopIn) - TOLERANCE;
        const keepFrom = Math.min(this.pos + HOP_OUT, nextLow);
        const drop = keepFrom - this.bufBase;
        if (drop < COMPACT_THRESHOLD) return;
        this.buf.copyWithin(0, drop, this.bufEnd - this.bufBase);
        this.bufBase += drop;
    }

    /** Index in [lo, hi] (absolute) whose window best matches the natural continuation of the last frame. */
    private findBest(lo: number, hi: number): number {
        const buf = this.buf;
        const base = this.bufBase;
        const tStart = this.pos + HOP_OUT - base;
        const count = WINDOW / DECIM;

        let best = lo;
        let bestScore = -Infinity;
        for (let c = lo; c <= hi; c += COARSE_STEP) {
            const cs = c - base;
            let dot = 0;
            let energy = 0;
            for (let i = 0; i < count; i++) {
                const x = buf[cs + i * DECIM];
                dot += x * buf[tStart + i * DECIM];
                energy += x * x;
            }
            const score = dot / Math.sqrt(energy + 1e-9);
            if (score > bestScore) {
                bestScore = score;
                best = c;
            }
        }
        // Refine around the coarse winner at full resolution.
        const from = Math.max(lo, best - COARSE_STEP + 1);
        const to = Math.min(hi, best + COARSE_STEP - 1);
        for (let c = from; c <= to; c++) {
            if (c === best) continue;
            const cs = c - base;
            let dot = 0;
            let energy = 0;
            for (let i = 0; i < count; i++) {
                const x = buf[cs + i * DECIM];
                dot += x * buf[tStart + i * DECIM];
                energy += x * x;
            }
            const score = dot / Math.sqrt(energy + 1e-9);
            if (score > bestScore) {
                bestScore = score;
                best = c;
            }
        }
        return best;
    }

    private process(final: boolean): Float32Array {
        const available = this.bufEnd - this.bufBase;
        const maxFrames = Math.ceil(available / this.hopIn) + 2;
        const out = new Float32Array(maxFrames * HOP_OUT);
        let outLen = 0;
        const acc = this.acc;
        const buf = this.buf;

        while (outLen + HOP_OUT <= out.length) {
            let start: number;
            let win: Float32Array;
            if (this.frameIndex === 0) {
                if (this.bufEnd - this.bufBase < WINDOW) break;
                start = 0;
                win = FIRST_WINDOW;
            } else {
                const nominal = Math.round(this.frameIndex * this.hopIn);
                if (final && nominal >= this.totalIn) break;
                const lo = Math.max(this.bufBase, nominal - TOLERANCE);
                const hi = nominal + TOLERANCE;
                const needEnd = Math.max(hi + WINDOW, this.pos + HOP_OUT + WINDOW);
                if (needEnd > this.bufEnd) break;
                start = this.findBest(lo, Math.max(lo, hi));
                win = HANN;
            }

            const offset = start - this.bufBase;
            for (let i = 0; i < WINDOW; i++) acc[i] += buf[offset + i] * win[i];

            out.set(acc.subarray(0, HOP_OUT), outLen);
            outLen += HOP_OUT;
            acc.copyWithin(0, HOP_OUT, WINDOW);
            acc.fill(0, WINDOW - HOP_OUT);

            this.pos = start;
            this.frameIndex++;
        }

        if (!final) this.compact();
        this.totalOut += outLen;
        return out.subarray(0, outLen);
    }
}

/** One-shot stretch: output length is about input.length / rate; rate 1 returns the input unchanged. */
export function timeStretch(input: Float32Array, rate: number): Float32Array {
    if (rate === 1 || input.length === 0) return input;
    const stretcher = new WsolaStretcher(rate);
    const body = stretcher.push(input);
    const bodyCopy = new Float32Array(body); // push() returns a view; copy before flush reuses state
    const tail = stretcher.flush();
    const result = new Float32Array(bodyCopy.length + tail.length);
    result.set(bodyCopy, 0);
    result.set(tail, bodyCopy.length);
    return result;
}
