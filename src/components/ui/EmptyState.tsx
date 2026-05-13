import React, { useState, useRef } from 'react';
import { htmlToMarkdown, plainTextSmartConvert } from '../../utils/htmlToMarkdown';
import { Logo } from './Logo';
import { FeatureCardsGrid } from './FeatureCardsGrid';
import { ReviewModeGuide } from './ReviewModeGuide';
import { Toast } from './Toast';

interface EmptyStateProps {
    onSelectTemplate: (content: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectTemplate }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isReviewGuideOpen, setIsReviewGuideOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'warning') => setToast({ message, type });

    // Handle file upload from disk
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) onSelectTemplate(text);
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    };

    // Drag and drop handlers specific to EmptyState bounds
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    if (text) onSelectTemplate(text);
                };
                reader.readAsText(file);
            }
        }
    };

    return (
        <>
            <div
                className={`flex-1 flex flex-col items-center justify-center p-6 transition-colors duration-200 ${isDragOver ? 'bg-secondary/50 border-2 border-dashed border-accent m-4 rounded-xl' : ''
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-10">

                    {/* Hero Section */}
                    <button
                        onClick={async () => {
                            try {
                                // Smart Paste: try HTML first, fallback to plain text
                                const clipboardItems = await navigator.clipboard.read();
                                for (const item of clipboardItems) {
                                    if (item.types.includes('text/html')) {
                                        const htmlBlob = await item.getType('text/html');
                                        const html = await htmlBlob.text();
                                        if (html) {
                                            onSelectTemplate(htmlToMarkdown(html));
                                            return;
                                        }
                                    }
                                    if (item.types.includes('text/plain')) {
                                        const textBlob = await item.getType('text/plain');
                                        const text = await textBlob.text();
                                        if (text) {
                                            onSelectTemplate(plainTextSmartConvert(text));
                                            return;
                                        }
                                    }
                                }
                            } catch {
                                try {
                                    const text = await navigator.clipboard.readText();
                                    if (text) onSelectTemplate(plainTextSmartConvert(text));
                                } catch (e) {
                                    console.error('Failed to read clipboard', e);
                                    showToast('يرجى إعطاء صلاحية اللصق أو استخدام Ctrl+V');
                                }
                            }
                        }}
                        className="relative group flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 hover:scale-[1.02] transition-all cursor-pointer focus:outline-none select-none"
                        aria-label="ألصق نص الـ AI هنا"
                    >
                        <Logo className="w-24 h-24 sm:w-28 sm:h-28 mb-6 group-hover:drop-shadow-[0_0_20px_var(--accent)] group-hover:-translate-y-2 group-hover:scale-110 transition-all duration-500" />
                        <h1 className="text-3xl sm:text-4xl font-bold text-foreground group-hover:text-accent transition-colors duration-300">
                            ألصق نص الـ AI هنا
                        </h1>
                        <p className="text-muted text-lg sm:text-xl font-medium">
                            اضغط <span className="text-foreground border-b border-dashed border-accent">هنا</span> أو استخدم <kbd className="font-mono bg-secondary px-2 py-1 rounded-md text-sm border border-border text-foreground">Ctrl+V</kbd>
                        </p>

                        {/* Tooltip (Lollipop) */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:-translate-y-2 bg-accent text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg pointer-events-none whitespace-nowrap">
                            اضغط للصق المحتوى ✨
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rotate-45 rounded-sm"></div>
                        </div>
                    </button>

                    {/* Drag Drop Hint + Upload Button */}
                    <div className="text-sm text-muted animate-in fade-in duration-1000 delay-300 flex flex-col items-center gap-3">
                        <p>أو اسحب ملف <span className="font-mono text-xs bg-secondary px-1 outline outline-1 outline-border rounded">.md</span> هنا</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md,.txt,.markdown"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:border-accent/40 hover:bg-accent/5 text-muted hover:text-accent transition-all duration-300"
                        >
                            📂 رفع ملف من الجهاز
                        </button>
                    </div>

                </div>

                {/* Feature Cards Grid (Review Mode Guide, etc.) */}
                <FeatureCardsGrid onReviewModeClick={() => setIsReviewGuideOpen(true)} />
            </div>

            <ReviewModeGuide
                isOpen={isReviewGuideOpen}
                onClose={() => setIsReviewGuideOpen(false)}
                onPaste={async () => {
                    try {
                        const clipboardItems = await navigator.clipboard.read();
                        for (const item of clipboardItems) {
                            if (item.types.includes('text/html')) {
                                const htmlBlob = await item.getType('text/html');
                                const html = await htmlBlob.text();
                                if (html) {
                                    setIsReviewGuideOpen(false);
                                    onSelectTemplate(htmlToMarkdown(html));
                                    return;
                                }
                            }
                            if (item.types.includes('text/plain')) {
                                const textBlob = await item.getType('text/plain');
                                const text = await textBlob.text();
                                if (text) {
                                    setIsReviewGuideOpen(false);
                                    onSelectTemplate(plainTextSmartConvert(text));
                                    return;
                                }
                            }
                        }
                    } catch {
                        try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                                setIsReviewGuideOpen(false);
                                onSelectTemplate(plainTextSmartConvert(text));
                            }
                        } catch (e) {
                            console.error('Failed to read clipboard', e);
                            showToast('\u064a\u0631\u062c\u0649 \u0625\u0639\u0637\u0627\u0621 \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0644\u0635\u0642 \u0623\u0648 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 Ctrl+V');
                        }
                    }
                }}
            />
            <Toast
                message={toast?.message ?? ''}
                type={toast?.type}
                isVisible={!!toast}
                onClose={() => setToast(null)}
            />
        </>
    );
};
