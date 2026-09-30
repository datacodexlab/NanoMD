import type { Element, ElementContent, Root, Text } from 'hast';

/**
 * rehypeBidi - keeps Latin runs and date/time tokens intact inside RTL text.
 *
 * Latin words with attached neutral characters (@user, C++, -flag, config.json)
 * are otherwise split by the Unicode bidi algorithm and jump sides. Wrapping
 * each run in <bdi dir="ltr"> makes it one LTR unit that sits correctly inside
 * the surrounding RTL sentence.
 *
 * Must run AFTER rehype-sanitize, which would strip the <bdi> elements.
 */

type SegmentKind = 'text' | 'latin' | 'datetime';

export interface BidiSegment {
    kind: SegmentKind;
    value: string;
}

// Elements whose text must never be touched
const SKIP_TAGS: ReadonlySet<string> = new Set(['code', 'pre', 'kbd', 'bdi', 'script', 'style']);

// Symbols that may be attached to the start of a Latin run (@user, #tag, $HOME, +x, -flag)
const LEADING_SYMBOLS = '@#$+-';

// Characters that continue a Latin run once it has started
const CONNECTORS = '_-./\\:+#@$%&=?~';

// Sentence punctuation that is not part of a run when it ends the run
const TRAILING_PUNCTUATION = '.,:;!?';

// Characters after which a leading '-' still counts as being at word start
const WORD_START_PREFIXES = '([{"\'';

// Date/time tokens: digit groups joined by - / : (2026-09-30, 30/09/2026, 11:00)
const DATETIME_RE = /\d+(?:[-/:]\d+)+/y;

function isLatinLetter(ch: string | undefined): boolean {
    return ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'));
}

function isDigit(ch: string | undefined): boolean {
    return ch !== undefined && ch >= '0' && ch <= '9';
}

function isAsciiAlphanumeric(ch: string | undefined): boolean {
    return isLatinLetter(ch) || isDigit(ch);
}

function isLeadingSymbol(ch: string | undefined): boolean {
    return ch !== undefined && LEADING_SYMBOLS.includes(ch);
}

function isConnector(ch: string): boolean {
    return CONNECTORS.includes(ch);
}

function isWordBoundaryBefore(ch: string | undefined): boolean {
    return ch === undefined || /\s/.test(ch) || WORD_START_PREFIXES.includes(ch);
}

/** True when a Latin word (optionally with an attached leading symbol) starts at `index`. */
function startsLatinWord(text: string, index: number): boolean {
    const ch = text[index];
    if (isAsciiAlphanumeric(ch)) return true;
    return isLeadingSymbol(ch) && isLatinLetter(text[index + 1]);
}

/** True when a Latin run may start at `index`. */
function canStartLatinRun(text: string, index: number): boolean {
    const ch = text[index];
    if (isLatinLetter(ch)) return true;

    if (isLeadingSymbol(ch)) {
        if (!isLatinLetter(text[index + 1])) return false;
        // A leading '-' only counts at word start, so "foo-bar" and "a - b" are unaffected
        return ch === '-'
            ? isWordBoundaryBefore(text[index - 1])
            : !isAsciiAlphanumeric(text[index - 1]);
    }

    // Digits directly followed by letters (3D, 4K, 18px) start a run; pure numbers do not
    if (isDigit(ch) && !isDigit(text[index - 1])) {
        let cursor = index;
        while (isDigit(text[cursor])) cursor++;
        return isLatinLetter(text[cursor]);
    }

    return false;
}

/** Returns the exclusive end index of the Latin run that starts at `start`. */
function scanLatinRun(text: string, start: number): number {
    let cursor = start;

    while (cursor < text.length) {
        const ch = text[cursor];
        if (isAsciiAlphanumeric(ch) || isConnector(ch)) {
            cursor++;
        } else if (ch === ' ' && startsLatinWord(text, cursor + 1)) {
            // A single space joins two Latin words into one unit ("Telegram API", "React 18")
            cursor++;
        } else {
            break;
        }
    }

    // Sentence punctuation that ends the run stays outside ("notifier." -> "notifier" + ".")
    while (cursor > start && TRAILING_PUNCTUATION.includes(text[cursor - 1])) {
        cursor--;
    }

    return cursor;
}

/** Splits a text value into plain / Latin-run / date-time segments. */
export function splitBidiText(text: string): BidiSegment[] {
    const segments: BidiSegment[] = [];
    let plainStart = 0;
    let index = 0;

    const flushPlain = (end: number) => {
        if (end > plainStart) {
            segments.push({ kind: 'text', value: text.slice(plainStart, end) });
        }
    };

    while (index < text.length) {
        if (canStartLatinRun(text, index)) {
            const end = scanLatinRun(text, index);
            flushPlain(index);
            segments.push({ kind: 'latin', value: text.slice(index, end) });
            index = end;
            plainStart = end;
            continue;
        }

        if (isDigit(text[index]) && !isDigit(text[index - 1])) {
            DATETIME_RE.lastIndex = index;
            const match = DATETIME_RE.exec(text);
            if (match) {
                const end = index + match[0].length;
                flushPlain(index);
                segments.push({ kind: 'datetime', value: match[0] });
                index = end;
                plainStart = end;
                continue;
            }
        }

        index++;
    }

    flushPlain(text.length);
    return segments;
}

function segmentToNode(segment: BidiSegment): ElementContent {
    const textNode: Text = { type: 'text', value: segment.value };
    if (segment.kind === 'text') return textNode;

    const properties: Element['properties'] =
        segment.kind === 'datetime'
            ? { dir: 'ltr', className: ['bidi-nowrap'] }
            : { dir: 'ltr' };

    return { type: 'element', tagName: 'bdi', properties, children: [textNode] };
}

function transformText(node: Text): ElementContent[] {
    const segments = splitBidiText(node.value);
    // No Latin run or date found: keep the original node untouched
    if (segments.length === 1 && segments[0].kind === 'text') return [node];
    return segments.map(segmentToNode);
}

function shouldSkip(element: Element): boolean {
    return SKIP_TAGS.has(element.tagName) || element.properties?.dir !== undefined;
}

// Blocks whose whole content may be wrapped as one LTR unit when it has no Arabic
const TEXT_BLOCK_TAGS: ReadonlySet<string> = new Set([
    'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'dt', 'dd', 'summary', 'figcaption',
]);

// Children that make a block unsafe to wrap in an inline <bdi>
const NESTED_BLOCK_TAGS: ReadonlySet<string> = new Set([
    'p', 'ul', 'ol', 'div', 'pre', 'table', 'blockquote', 'details', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

// Same Arabic ranges as CodeBlock detectCodeDir
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_RE = /[A-Za-z]/;

function collectText(nodes: ElementContent[]): string {
    return nodes
        .map((node) => (node.type === 'text' ? node.value : node.type === 'element' ? collectText(node.children) : ''))
        .join('');
}

/**
 * A fully Latin block (no Arabic at all) is wrapped whole, so its trailing
 * punctuation stays at the end of the sentence instead of jumping to the RTL start.
 */
function wrapLatinOnlyBlock(element: Element): boolean {
    if (!TEXT_BLOCK_TAGS.has(element.tagName)) return false;

    const hasNestedBlock = element.children.some(
        (child) => child.type === 'element' && NESTED_BLOCK_TAGS.has(child.tagName)
    );
    if (hasNestedBlock) return false;

    const text = collectText(element.children);
    if (ARABIC_RE.test(text) || !LATIN_RE.test(text)) return false;

    // Leading task-list checkbox stays outside so it keeps its RTL position
    const leading: ElementContent[] = [];
    const rest = [...element.children];
    while (rest[0]?.type === 'element' && rest[0].tagName === 'input') {
        leading.push(rest.shift() as ElementContent);
    }

    element.children = [
        ...leading,
        { type: 'element', tagName: 'bdi', properties: { dir: 'ltr' }, children: rest },
    ];
    return true;
}

function visitElement(element: Element): void {
    if (shouldSkip(element)) return;
    if (wrapLatinOnlyBlock(element)) return;

    const nextChildren: ElementContent[] = [];
    for (const child of element.children) {
        if (child.type === 'text') {
            nextChildren.push(...transformText(child));
            continue;
        }
        if (child.type === 'element') visitElement(child);
        nextChildren.push(child);
    }
    element.children = nextChildren;
}

export default function rehypeBidi() {
    return (tree: Root): void => {
        for (const child of tree.children) {
            if (child.type === 'element') visitElement(child);
        }
    };
}
