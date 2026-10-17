export interface TextChunk {
    text: string;
    blockIndexes: number[];
}

const EXCLUDED_ANCESTORS = 'pre, code, table, .review-table-container, figure, img, .inline-code-tooltip, .code-copy-btn';
const BLOCK_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li';
const NESTED_LIST_SELECTOR = 'ul, ol';
const LETTER_PATTERN = /\p{L}/u;
const SENTENCE_PATTERN = /[^.!?؟،;\n]*[.!?؟،;\n]+|[^.!?؟،;\n]+$/g;

function isExcluded(el: HTMLElement): boolean {
    return el.closest(EXCLUDED_ANCESTORS) !== null;
}

/** Text of an element, skipping nested lists, code, tooltips and images. */
function ownText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    if (el.matches(NESTED_LIST_SELECTOR) || el.matches('pre, code, table, figure, img, .inline-code-tooltip, .code-copy-btn, .review-table-container')) {
        return '';
    }
    let out = '';
    el.childNodes.forEach(child => {
        out += ownText(child);
    });
    return out;
}

function normalize(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function collectReadableBlocks(root: HTMLElement): HTMLElement[] {
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
    return candidates.filter(el => {
        if (isExcluded(el)) return false;
        // A paragraph that wraps a list item's content is read through the li itself.
        if (el.tagName === 'P' && el.closest('li') !== null) return false;
        return LETTER_PATTERN.test(ownText(el));
    });
}

export function blockText(el: HTMLElement): string {
    // For li, ownText already includes loose <p> children and skips nested lists.
    let text = normalize(ownText(el));
    if (/^H[1-6]$/.test(el.tagName) && text && !/[.!?؟:]$/.test(text)) {
        text += '.';
    }
    return text;
}

function splitLongText(text: string, maxChars: number): string[] {
    const sentences = text.match(SENTENCE_PATTERN) ?? [text];
    const pieces: string[] = [];
    let current = '';
    const flush = () => {
        if (current.trim()) pieces.push(current.trim());
        current = '';
    };
    for (const sentence of sentences) {
        if (sentence.length > maxChars) {
            flush();
            for (let i = 0; i < sentence.length; i += maxChars) {
                pieces.push(sentence.slice(i, i + maxChars).trim());
            }
            continue;
        }
        if (current.length + sentence.length > maxChars) flush();
        current += sentence;
    }
    flush();
    return pieces.filter(Boolean);
}

export function buildChunks(blocks: HTMLElement[], maxChars = 3000): TextChunk[] {
    const chunks: TextChunk[] = [];
    let current: TextChunk | null = null;

    const push = () => {
        if (current && current.text) chunks.push(current);
        current = null;
    };

    blocks.forEach((block, index) => {
        const text = blockText(block);
        if (!text) return;

        if (text.length > maxChars) {
            push();
            for (const piece of splitLongText(text, maxChars)) {
                chunks.push({ text: piece, blockIndexes: [index] });
            }
            return;
        }

        if (current && current.text.length + 1 + text.length > maxChars) push();
        if (!current) {
            current = { text, blockIndexes: [index] };
        } else {
            current.text += `\n${text}`;
            current.blockIndexes.push(index);
        }
    });
    push();
    return chunks;
}
