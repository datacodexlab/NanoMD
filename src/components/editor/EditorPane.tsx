import React, { useRef, useEffect } from 'react';
import { htmlToMarkdown, plainTextSmartConvert } from '../../utils/htmlToMarkdown';
import { useAppContext } from '../../contexts/AppContext';

interface EditorPaneProps {
    content: string;
    onChange: (value: string) => void;
    autoFocus?: boolean;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ content, onChange, autoFocus }) => {
    const { setAppState } = useAppContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        updateEditorSelection(e.currentTarget);
    };

    const updateEditorSelection = (textarea: HTMLTextAreaElement) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value.slice(start, end);

        setAppState(prev => ({
            ...prev,
            editorSelection: start < end && text.trim()
                ? { start, end, text }
                : null
        }));
    };

    /**
     * Smart Paste: intercept paste in the editor textarea.
     * Priority: 1) HTML → markdown, 2) Plain text with tabs → table, 3) Default paste
     */
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const html = e.clipboardData.getData('text/html');
        const plain = e.clipboardData.getData('text/plain');

        let markdown: string | null = null;

        if (html) {
            markdown = htmlToMarkdown(html);
        } else if (plain && plain.includes('\t')) {
            markdown = plainTextSmartConvert(plain);
        }

        if (markdown) {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newContent = content.substring(0, start) + markdown + content.substring(end);
                onChange(newContent);
                // Restore cursor position after the pasted content
                requestAnimationFrame(() => {
                    textarea.selectionStart = start + markdown!.length;
                    textarea.selectionEnd = start + markdown!.length;
                });
            }
        }
        // If no conversion needed, let default paste behavior handle it
    };

    return (
        <div className="w-full h-full flex flex-col bg-background/50 border-l border-border transition-colors print-hide">
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border text-xs font-semibold text-muted">
                <span>المحرر (Markdown)</span>
                <span>{content.length} حرف</span>
            </div>
            <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onPaste={handlePaste}
                onSelect={(e) => updateEditorSelection(e.currentTarget)}
                onKeyUp={(e) => updateEditorSelection(e.currentTarget)}
                onMouseUp={(e) => updateEditorSelection(e.currentTarget)}
                onBlur={() => {
                    if (!textareaRef.current) return;
                    updateEditorSelection(textareaRef.current);
                }}
                className="editor-textarea flex-1 w-full p-4 sm:p-6 bg-transparent resize-none outline-none text-foreground font-mono leading-relaxed"
                placeholder="اكتب أو الصق نص الماركداون هنا..."
                dir="rtl"
                spellCheck={false}
            />
        </div>
    );
};
