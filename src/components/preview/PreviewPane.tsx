import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeBidi from '../../utils/rehypeBidi';
import { CodeBlock } from './CodeBlock';
import { ReviewTable } from './ReviewTable';
import '../../styles/preview.css';

// Review column names that trigger Review Mode
const REVIEW_COLUMNS = ['القرار', 'الرد', 'قرار المطور', 'decision', 'response', 'dev decision'];

// Recommendation column names for split-column detection (new format)
export const RECOMMENDATION_COLUMNS = ['التوصية', 'recommendation', 'توصية'];

/**
 * Extract text content from React children (handles nested elements)
 */
function extractText(node: React.ReactNode): string {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (React.isValidElement(node)) {
        return extractText((node.props as { children?: React.ReactNode }).children);
    }
    return '';
}

/**
 * Extract table data (headers + rows) from react-markdown's table children.
 * react-markdown renders: <table> -> <thead> + <tbody>
 *   <thead> -> <tr> -> <th> cells
 *   <tbody> -> <tr> -> <td> cells
 */
function extractTableData(children: React.ReactNode): { headers: string[]; rows: string[][] } | null {
    const childArray = React.Children.toArray(children);
    let headers: string[] = [];
    const rows: string[][] = [];

    for (const child of childArray) {
        if (!React.isValidElement(child)) continue;
        const tag = child.type;
        const grandChildren = React.Children.toArray((child.props as { children?: React.ReactNode }).children);

        if (tag === 'thead') {
            // Extract header row
            for (const tr of grandChildren) {
                if (!React.isValidElement(tr)) continue;
                const ths = React.Children.toArray((tr.props as { children?: React.ReactNode }).children);
                headers = ths.map((th) => extractText(th));
            }
        } else if (tag === 'tbody') {
            // Extract data rows
            for (const tr of grandChildren) {
                if (!React.isValidElement(tr)) continue;
                const tds = React.Children.toArray((tr.props as { children?: React.ReactNode }).children);
                rows.push(tds.map((td) => extractText(td)));
            }
        }
    }

    if (headers.length === 0) return null;
    return { headers, rows };
}

/**
 * Check if a table is a review table by examining the last header column
 */
function isReviewTable(headers: string[]): boolean {
    if (headers.length < 3) return false;
    const lastHeader = headers[headers.length - 1].trim().toLowerCase();
    return REVIEW_COLUMNS.includes(lastHeader);
}

/**
 * Check if the review column cells are mostly empty (indicating it needs review)
 */
function hasEmptyReviewCells(rows: string[][]): boolean {
    if (rows.length === 0) return false;
    const lastColIndex = rows[0].length - 1;
    const emptyCount = rows.filter((row) => !row[lastColIndex]?.trim()).length;
    return emptyCount >= rows.length / 2; // At least half empty
}

interface PreviewPaneProps {
    content: string;
}

/**
 * Stable components object for ReactMarkdown — defined outside the
 * component so it is never recreated between renders, which prevents
 * ReactMarkdown from unmounting / remounting custom component trees
 * such as ReviewTable.
 */

function InlineCode({ children }: { children?: React.ReactNode }) {
    const [copied, setCopied] = useState(false);
    const text = String(children || '');
    
    const handleClick = async () => {
        try {
            await navigator.clipboard.writeText(text.trim());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('Failed to copy inline code:', err);
        }
    };

    return (
        <span className="inline-code-wrapper" onClick={handleClick}>
            <code>{children}</code>
            {copied && <span className="inline-code-tooltip">تم النسخ ✓</span>}
        </span>
    );
}

const markdownComponents = {
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode; [key: string]: any }) {
        // Inline code: no language AND no newlines (single-backtick `code`)
        const isInline = !className && !String(children || '').includes('\n');
        if (isInline) {
            return <InlineCode {...props}>{children}</InlineCode>;
        }
        // Block code (with or without language): delegate to CodeBlock
        return (
            <CodeBlock className={className}>
                {children}
            </CodeBlock>
        );
    },
    // Prevent double-wrapping: CodeBlock renders its own <pre>
    pre({ children }: { children?: React.ReactNode }) {
        return <>{children}</>;
    },
    table({ children }: { children?: React.ReactNode }) {
        const data = extractTableData(children);
        if (data && isReviewTable(data.headers) && hasEmptyReviewCells(data.rows)) {
            return <ReviewTable headers={data.headers} rows={data.rows} />;
        }
        // Default table rendering
        return <table>{children}</table>;
    },
    a({ href, children, ...props }: { href?: string; children?: React.ReactNode; [key: string]: any }) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
            </a>
        );
    },
};

/**
 * Stable plugin arrays — defined outside component to preserve
 * referential equality across renders.
 */
const remarkPlugins = [remarkGfm];

const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        a: [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
    },
    protocols: {
        ...defaultSchema.protocols,
        href: ['http', 'https', 'mailto'],
    },
};

// rehypeBidi must run after rehype-sanitize (which would strip <bdi>) and after
// rehypeHighlight (its spans live inside code, which rehypeBidi skips anyway).
const rehypePlugins: any[] = [[rehypeSanitize, sanitizeSchema], rehypeHighlight, rehypeBidi];

/**
 * PreviewPane — renders markdown content with auto-detection of review tables.
 * Wrapped with React.memo to prevent re-renders when content hasn't changed.
 */
export const PreviewPane: React.FC<PreviewPaneProps> = React.memo(({ content }) => {
    return (
        <div id="print-area" className="preview-pane w-full h-full overflow-y-auto">
            <div className="preview-content max-w-3xl mx-auto pb-24" dir="rtl">
                <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={markdownComponents}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
});

PreviewPane.displayName = 'PreviewPane';
