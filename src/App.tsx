import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { EmptyState } from './components/ui/EmptyState';
import { PreviewPane } from './components/preview/PreviewPane';
import { EditorPane } from './components/editor/EditorPane';
import { SplitView } from './components/layout/SplitView';
import { FocusMode } from './components/layout/FocusMode';
import { CopyMenu } from './components/ui/CopyMenu';
import { ScrollNav } from './components/ui/ScrollNav';
import { SaveIndicator } from './components/ui/SaveIndicator';
import { useSmartPaste } from './hooks/useSmartPaste';
import { useKeyboard } from './hooks/useKeyboard';
import { useAppContext } from './contexts/AppContext';
import { useAutoSave } from './hooks/useAutoSave';

function App() {
    const { appState, setAppState } = useAppContext();

    const [isLoadingShare, setIsLoadingShare] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);

    // Load content from URL share ID or hash
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');

        if (shareId) {
            setIsLoadingShare(true);
            fetch(`/api/share/${shareId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.content) {
                        setAppState(prev => ({
                            ...prev,
                            content: data.content,
                            viewMode: 'preview',
                            isSharedView: true
                        }));
                    } else {
                        setShareError(data.error || 'فشل تحميل المحتوى المشترك');
                    }
                })
                .catch(err => {
                    console.error('[NanoMD] Error loading shared content:', err);
                    setShareError('تعذر الاتصال بالخادم لتحميل المحتوى');
                })
                .finally(() => {
                    setIsLoadingShare(false);
                });
            return;
        }

        const hash = window.location.hash.slice(1);
        if (hash) {
            try {
                const decoded = atob(decodeURIComponent(hash));
                if (decoded.trim().length > 0) {
                    setAppState(prev => ({ ...prev, content: decoded, viewMode: 'preview' }));
                    // Clear hash from URL to prevent re-loading on refresh
                    window.history.replaceState(null, '', window.location.pathname);
                    return; // Skip localStorage loading
                }
            } catch (e) {
                console.warn('[NanoMD] Invalid URL hash content:', e);
            }
        }

        // Fallback: Load initial draft from localStorage if available
        try {
            const draft = window.localStorage.getItem('nanomd_current_draft');
            if (draft && draft.length > 0) {
                setAppState(prev => ({ ...prev, content: JSON.parse(draft) }));
            }
        } catch (e) {
            console.warn('Failed to load draft', e);
        }
    }, [setAppState]);

    // Handle template selection from EmptyState
    const handleSelectTemplate = (templateContent: string) => {
        setAppState(prev => ({
            ...prev,
            content: templateContent,
            viewMode: 'preview'
        }));
    };

    // Smart Paste & Drop Handler (Updates global context)
    useSmartPaste((pastedText) => {
        setAppState(prev => ({ ...prev, content: pastedText, viewMode: 'preview' }));
    });

    // Global Keyboard Shortcuts
    useKeyboard();

    // Auto-Save Mechanism
    const { saveStatus } = useAutoSave(appState.content);

    // Sync content emptiness
    const hasContent = appState.content.trim().length > 0;

    if (isLoadingShare) {
        return (
            <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-primary text-text-primary" dir="rtl">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mb-4"></div>
                <p>جاري تحميل المحتوى المشترك...</p>
            </div>
        );
    }

    if (shareError) {
        return (
            <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-primary text-text-primary" dir="rtl">
                <div className="text-red-500 mb-4 text-xl">⚠️</div>
                <p className="text-lg mb-4">{shareError}</p>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 bg-accent-primary text-white rounded hover:bg-accent-hover transition-colors"
                >
                    العودة للمحرر
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-bg-primary text-text-primary transition-all duration-300" dir="rtl">
            {appState.viewMode !== 'focus' && <Header hasContent={hasContent} />}

            {appState.isSharedView && (
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 py-2 px-4 text-center text-sm border-b border-blue-100 dark:border-blue-800">
                    ℹ️ أنت في وضع القراءة لمحتوى تمت مشاركته. <a href="/" className="underline hover:text-blue-600 dark:hover:text-blue-400">انقر هنا لإنشاء ملف جديد.</a>
                </div>
            )}

            <main className="flex-1 overflow-hidden relative flex flex-col">
                {appState.viewMode === 'focus' ? (
                    <FocusMode content={appState.content} />
                ) : hasContent ? (
                    <>
                        <SplitView
                            viewMode={appState.isSharedView ? 'preview' : appState.viewMode}
                            previewPane={<PreviewPane content={appState.content} />}
                            editorPane={
                                !appState.isSharedView ? (
                                    <EditorPane
                                        content={appState.content}
                                        onChange={(text) => setAppState(prev => ({ ...prev, content: text }))}
                                        autoFocus={appState.viewMode === 'editor' || appState.viewMode === 'split'}
                                    />
                                ) : <div />
                            }
                        />
                        <CopyMenu markdownContent={appState.content} />
                        {(appState.viewMode === 'preview' || appState.viewMode === 'split') && <ScrollNav />}
                    </>
                ) : (
                    <EmptyState onSelectTemplate={handleSelectTemplate} />
                )}
            </main>

            <SaveIndicator status={saveStatus} />

            {appState.viewMode !== 'focus' && <MobileNav />}

            {appState.viewMode !== 'focus' && (
                <footer className="app-footer">
                    <span>v{__APP_VERSION__}</span>
                    <span>© {new Date().getFullYear()} DataCodex. All rights reserved.</span>
                </footer>
            )}
        </div>
    );
}

export default App;
