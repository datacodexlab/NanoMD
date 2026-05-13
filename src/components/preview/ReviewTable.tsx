import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RECOMMENDATION_COLUMNS } from './PreviewPane';

const QUICK_DECISIONS = [
    { label: '✅', value: '✅ موافق', title: 'موافق' },
    { label: '❌', value: '❌ رفض', title: 'رفض' },
    { label: '⏸️', value: '⏸️ تأجيل', title: 'تأجيل' },
];

const decisionsStore = new Map<string, string[]>();

function getTableFingerprint(headers: string[], rows: string[][]): string {
    const headerPart = headers.join('|');
    const rowPart = rows.map((r) => r[0] || '').join('|');
    return `${headerPart}::${rowPart}`;
}

function isSeparatorRow(row: string[]): boolean {
    const id = row[0]?.trim();
    const item = row[1]?.trim() || '';
    return !id && item.includes('📌');
}

interface ReviewTableProps {
    headers: string[];
    rows: string[][];
}

export const ReviewTable: React.FC<ReviewTableProps> = ({ headers, rows }) => {
    const fingerprint = useMemo(() => getTableFingerprint(headers, rows), [headers, rows]);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 640
    );
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const recommendationColIndex = useMemo(() => {
        const idx = headers.findIndex((h) =>
            RECOMMENDATION_COLUMNS.includes(h.trim().toLowerCase())
        );
        return idx;
    }, [headers]);

    const hasRecommendationCol = recommendationColIndex >= 0;

    const itemColIndex = useMemo(() => {
        const idx = headers.findIndex((h) => {
            const lower = h.trim().toLowerCase();
            return lower === 'البند' || lower === 'item' || lower === 'summary'
                || lower === 'البند ← التوصية';
        });
        return idx >= 0 ? idx : Math.min(1, headers.length - 1);
    }, [headers]);

    // Details column: the visible column that's not #, item, or recommendation
    const detailsColIndex = useMemo(() => {
        const lastIdx = headers.length - 1;
        const byName = headers.findIndex((h, i) => {
            if (i === lastIdx) return false;
            const lower = h.trim().toLowerCase();
            return lower === 'details' || lower === 'تفاصيل';
        });
        if (byName >= 0) return byName;
        for (let i = 1; i < lastIdx; i++) {
            if (i !== itemColIndex && i !== recommendationColIndex) return i;
        }
        return -1;
    }, [headers, itemColIndex, recommendationColIndex]);

    const { sectionIndices, separatorFlags } = useMemo(() => {
        let currentSection = 0;
        const indices: number[] = [];
        const flags: boolean[] = [];
        rows.forEach((row) => {
            const isSep = isSeparatorRow(row);
            flags.push(isSep);
            if (isSep) currentSection++;
            indices.push(currentSection);
        });
        return { sectionIndices: indices, separatorFlags: flags };
    }, [rows]);

    const dataRowIndices = useMemo(
        () => rows.map((_, i) => i).filter((i) => !separatorFlags[i]),
        [rows, separatorFlags]
    );
    const dataRowCount = dataRowIndices.length;

    const [decisions, setDecisions] = useState<string[]>(() => {
        const stored = decisionsStore.get(fingerprint);
        if (stored && stored.length === rows.length) return stored;
        const initial = rows.map((row) => row[row.length - 1]?.trim() || '');
        decisionsStore.set(fingerprint, initial);
        return initial;
    });

    const decisionsRef = useRef(decisions);
    useEffect(() => {
        decisionsRef.current = decisions;
        decisionsStore.set(fingerprint, decisions);
    }, [decisions, fingerprint]);

    const reviewedCount = dataRowIndices.filter((i) => decisions[i]?.trim().length > 0).length;
    const totalCount = dataRowCount;
    const allReviewed = reviewedCount === totalCount && totalCount > 0;
    const someReviewed = reviewedCount > 0;

    const handleQuickDecision = useCallback((rowIndex: number, value: string) => {
        setDecisions((prev) => {
            const next = [...prev];
            const current = next[rowIndex];
            if (current.startsWith(value)) return prev;
            const hasExistingDecision = QUICK_DECISIONS.some((d) => current.startsWith(d.value));
            if (hasExistingDecision) {
                const parts = current.split('—');
                const comment = parts.length > 1 ? parts.slice(1).join('—').trim() : '';
                next[rowIndex] = comment ? `${value} — ${comment}` : value;
            } else {
                next[rowIndex] = value;
            }
            return next;
        });
    }, []);

    const handleClear = useCallback((rowIndex: number) => {
        setDecisions((prev) => {
            const next = [...prev];
            next[rowIndex] = '';
            return next;
        });
    }, []);

    const handleInputChange = useCallback((rowIndex: number, value: string) => {
        setDecisions((prev) => {
            const next = [...prev];
            next[rowIndex] = value;
            return next;
        });
    }, []);

    const buildCopyText = useCallback(() => {
        const lines: string[] = [];
        for (let i = 0; i < rows.length; i++) {
            if (separatorFlags[i]) continue;
            const decision = decisions[i]?.trim();
            if (!decision) continue;
            const itemNum = rows[i][0]?.trim() || String(i + 1);
            const itemName = rows[i][itemColIndex]?.trim() || '';
            let mergedItem = itemName;
            if (hasRecommendationCol) {
                const recText = rows[i][recommendationColIndex]?.trim() || '';
                if (recText) mergedItem = `${itemName} ← ${recText}`;
            }
            lines.push(`${itemNum}. ${mergedItem} → ${decision}`);
        }
        if (lines.length === 0) return '';
        return [
            '✅ NanoMD Review — my decisions:',
            '',
            ...lines,
            '',
            '---',
            'Save these decisions in the review file and proceed with the required action.',
        ].join('\n');
    }, [rows, decisions, itemColIndex, separatorFlags, hasRecommendationCol, recommendationColIndex]);

    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(async () => {
        const text = buildCopyText();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy review:', err);
        }
    }, [buildCopyText]);

    const copyBtnLabel = copied
        ? '✅ تم النسخ!'
        : allReviewed
            ? `✅ نسخ الردود (${reviewedCount}/${totalCount})`
            : someReviewed
                ? `⚠️ نسخ الردود (${reviewedCount}/${totalCount})`
                : `نسخ الردود (0/${totalCount})`;

    const copyBtnClass = `review-copy-btn ${!someReviewed ? 'disabled' : allReviewed ? 'complete' : 'partial'}`;

    const progressPct = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

    // ─── Progress bar ─────────────────────────────────────────────────────────
    const progressBar = (sticky = false) => (
        <div className={`review-progress${sticky ? ' review-progress-sticky' : ''}`}>
            <div className="review-progress-bar">
                <div className="review-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="review-progress-text">
                {reviewedCount}/{totalCount} تم المراجعة
            </span>
        </div>
    );

    // ─── Auto-resize textarea helper ──────────────────────────────────────────
    const autoResize = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    // ─── Decision cell content ────────────────────────────────────────────────
    const decisionControls = (rowIdx: number, mobileBtns = false) => (
        <div className="review-decision-wrapper">
            <div className={`review-quick-buttons${mobileBtns ? ' review-card-buttons' : ''}`}>
                {QUICK_DECISIONS.map((btn) => (
                    <button
                        key={btn.value}
                        className={`review-quick-btn${mobileBtns ? ' review-quick-btn-mobile' : ''} ${decisions[rowIdx]?.startsWith(btn.value) ? 'active' : ''}`}
                        onClick={() => handleQuickDecision(rowIdx, btn.value)}
                        title={btn.title}
                        type="button"
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
            <div className="review-input-wrapper">
                {mobileBtns ? (
                    <textarea
                        className="review-input review-input-mobile"
                        value={decisions[rowIdx] || ''}
                        onChange={(e) => {
                            handleInputChange(rowIdx, e.target.value);
                            autoResize(e.target);
                        }}
                        onFocus={(e) => autoResize(e.target)}
                        placeholder="اكتب قرارك..."
                        dir="rtl"
                        rows={1}
                    />
                ) : (
                    <input
                        type="text"
                        className="review-input"
                        value={decisions[rowIdx] || ''}
                        onChange={(e) => handleInputChange(rowIdx, e.target.value)}
                        placeholder="اكتب قرارك..."
                        dir="rtl"
                    />
                )}
                {decisions[rowIdx]?.trim() && (
                    <button
                        className="review-clear-btn"
                        onClick={() => handleClear(rowIdx)}
                        title="مسح الرد"
                        type="button"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // MOBILE — Card Layout
    // ═══════════════════════════════════════════════════════════════════════════
    if (isMobile) {
        return (
            <div className="review-table-container">
                {progressBar(true)}

                <div className="review-cards">
                    {rows.map((row, rowIdx) => {
                        if (separatorFlags[rowIdx]) {
                            return (
                                <div key={rowIdx} className="review-separator-divider">
                                    {row[1]?.trim() || ''}
                                </div>
                            );
                        }

                        const sectionClass = `review-card-section-${sectionIndices[rowIdx] % 2}`;
                        const doneClass = decisions[rowIdx]?.trim() ? 'review-card-done' : '';
                        const itemNum = row[0]?.trim() || String(rowIdx + 1);
                        const itemName = row[itemColIndex]?.trim() || '';
                        const recText = hasRecommendationCol
                            ? row[recommendationColIndex]?.trim() || ''
                            : '';
                        const detailText = detailsColIndex >= 0
                            ? row[detailsColIndex]?.trim() || ''
                            : '';

                        return (
                            <div key={rowIdx} className={`review-card ${sectionClass} ${doneClass}`}>
                                <div className="review-card-header">
                                    <span className="review-card-num">{itemNum}</span>
                                    <span className="review-card-item">{itemName}</span>
                                </div>
                                {recText && (
                                    <div className="review-card-rec">← {recText}</div>
                                )}
                                {detailText && (
                                    <div className="review-card-detail">{detailText}</div>
                                )}
                                {decisionControls(rowIdx, true)}
                            </div>
                        );
                    })}
                </div>

                {/* Sticky copy button — stays at bottom of scroll container */}
                <div className="review-copy-bar review-copy-bar-sticky">
                    <button
                        className={copyBtnClass}
                        onClick={handleCopy}
                        disabled={!someReviewed}
                        type="button"
                    >
                        {copyBtnLabel}
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DESKTOP — Table Layout (unchanged)
    // ═══════════════════════════════════════════════════════════════════════════
    const reviewColIndex = headers.length - 1;
    const visibleHeaders = headers.slice(0, -1);

    return (
        <div className="review-table-container">
            {progressBar()}

            <table className="review-table">
                <thead>
                    <tr>
                        {visibleHeaders.map((h, i) => <th key={i}>{h}</th>)}
                        <th>{headers[reviewColIndex]}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIdx) => {
                        if (separatorFlags[rowIdx]) {
                            const separatorText = row[1]?.trim() || '';
                            return (
                                <tr key={rowIdx} className="review-separator-row">
                                    <td colSpan={headers.length} className="review-separator-cell">
                                        {separatorText}
                                    </td>
                                </tr>
                            );
                        }

                        const sectionClass = `review-section-${sectionIndices[rowIdx] % 2}`;
                        const doneClass = decisions[rowIdx]?.trim() ? 'review-row-done' : '';

                        return (
                            <tr key={rowIdx} className={`${sectionClass} ${doneClass}`}>
                                {visibleHeaders.map((_, colIdx) => (
                                    <td key={colIdx}>{row[colIdx] || ''}</td>
                                ))}
                                <td className="review-decision-cell">
                                    {decisionControls(rowIdx, false)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="review-copy-bar">
                <button
                    className={copyBtnClass}
                    onClick={handleCopy}
                    disabled={!someReviewed}
                    type="button"
                >
                    {copyBtnLabel}
                </button>
            </div>
        </div>
    );
};

export default ReviewTable;
