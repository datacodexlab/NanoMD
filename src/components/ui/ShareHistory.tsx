import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, X, Trash2, ExternalLink, Copy } from 'lucide-react';
import { Toast } from './Toast';

export interface ShareHistoryItem {
    id: string;
    url: string;
    title: string;
    timestamp: number;
    expiresAt?: number;
    contentPreview?: string;
    type?: 'shared' | 'local';
    fullContent?: string;
}

interface ShareHistoryProps {
    onClose: () => void;
    onRestore?: (content: string) => void;
}

export const ShareHistory: React.FC<ShareHistoryProps> = ({ onClose, onRestore }) => {
    const [history, setHistory] = useState<ShareHistoryItem[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type });

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('nano_share_history') || '[]');
        setHistory(stored);
    }, []);

    const handleDelete = (id: string) => {
        const newHistory = history.filter(item => item.id !== id);
        localStorage.setItem('nano_share_history', JSON.stringify(newHistory));
        setHistory(newHistory);
    };

    const handleCopy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            showToast('تم نسخ الرابط');
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const isExpired = (expiresAt?: number) => {
        if (!expiresAt) return false; // For older records without expiresAt
        return Date.now() > expiresAt;
    };

    return <>{createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden p-4" onClick={onClose}>
            <div className="bg-bg-primary rounded-2xl border border-border-default shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-default">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-accent" /> سجل المشاركات
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-secondary rounded-lg text-muted hover:text-foreground transition-colors"
                        title="إغلاق"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 flex-1 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center text-muted py-12 flex flex-col items-center gap-3">
                            <History className="w-12 h-12 opacity-20" />
                            <p>لا توجد روابط مشاركة سابقة</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {history.map(item => {
                                const expired = isExpired(item.expiresAt);
                                return (
                                    <div 
                                        key={item.id} 
                                        className={`bg-secondary/30 border border-border-default p-4 rounded-xl flex flex-col gap-3 transition-all ${expired ? 'opacity-50 grayscale' : 'hover:border-accent/40'}`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-semibold text-sm line-clamp-1" title={item.title}>
                                                {item.title || 'وثيقة غير مسماة'}
                                            </div>
                                            <span className="font-mono text-[10px] bg-secondary px-2 py-0.5 rounded text-accent flex-shrink-0">
                                                {item.id}
                                            </span>
                                        </div>

                                        {item.contentPreview && (
                                            <div className="text-xs text-muted line-clamp-2 italic border-r-2 border-accent/20 pr-2">
                                                {item.contentPreview}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                                            <div className="flex gap-4">
                                                <span dir="ltr">📅 {new Date(item.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                {item.expiresAt && (
                                                    <span dir="ltr" className={expired ? 'text-red-500 line-through' : ''}>
                                                        ⏳ ينتهي: {new Date(item.expiresAt).toLocaleString('ar-EG', { dateStyle: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-2">
                                            {item.type === 'local' ? (
                                                <button 
                                                    onClick={() => {
                                                        if (item.fullContent) {
                                                            onRestore?.(item.fullContent);
                                                        } else {
                                                            showToast('تعذر استرجاع المحتوى. ربما مسودة قديمة جداً.', 'error');
                                                        }
                                                    }}
                                                    className="flex-1 flex justify-center items-center gap-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent py-2 rounded-lg font-medium transition-colors"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> استرجاع النص
                                                </button>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleCopy(item.url)} 
                                                        disabled={expired}
                                                        className="flex-1 flex justify-center items-center gap-1.5 text-xs bg-accent/10 hover:bg-accent/20 disabled:hover:bg-accent/10 text-accent py-2 rounded-lg font-medium transition-colors"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" /> نسخ الرابط
                                                    </button>
                                                    <a 
                                                        href={item.url} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className={`flex-1 flex justify-center items-center gap-1.5 text-xs bg-secondary hover:bg-secondary/80 text-center py-2 rounded-lg font-medium transition-colors border border-border-default ${expired ? 'pointer-events-none opacity-50' : ''}`}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" /> فتح
                                                    </a>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="flex items-center justify-center px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                                                title="حذف من السجل"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )}{createPortal(
        <Toast
            message={toast?.message ?? ''}
            type={toast?.type}
            isVisible={!!toast}
            onClose={() => setToast(null)}
        />,
        document.body
    )}</>;
};

