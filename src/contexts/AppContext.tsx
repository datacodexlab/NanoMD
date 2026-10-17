import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppState } from '../types';
import { getSettings } from '../lib/ai/key-store';
import { translateWithFallback } from '../lib/ai/fallback';
import { InvalidKeyError, NoKeyError, QuotaExhaustedError } from '../lib/ai/types';

interface TranslationState {
    isTranslating: boolean;
    error: string | null;
    canUndo: boolean;
}

interface AppContextType {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    translationState: TranslationState;
    translateContent: (targetLang: 'ar' | 'en') => Promise<void>;
    undoTranslation: () => void;
    toggleContextTranslation: () => void;
}

const defaultState: AppState = {
    content: '',
    theme: 'cream',
    viewMode: 'preview',
    isFocusMode: false,
    isDrawerOpen: false,
    isBottomSheetOpen: false,
    isCopyMenuOpen: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    isEmpty: true,
    lastActive: new Date().toISOString(),
    isSharedView: false,
    useContextTranslation: true,
    editorSelection: null
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [appState, setAppState] = useState<AppState>(defaultState);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateError, setTranslateError] = useState<string | null>(null);
    const [undoHistory, setUndoHistory] = useState<string | null>(null);

    const translateContent = async (targetLang: 'ar' | 'en') => {
        const selection = appState.editorSelection;
        const canUseEditorSelection = appState.viewMode === 'editor' || appState.viewMode === 'split';
        const hasEditorSelection = Boolean(canUseEditorSelection && selection && selection.end > selection.start && selection.text.trim());
        const textToTranslate = hasEditorSelection ? selection!.text : appState.content;

        if (!textToTranslate.trim()) return;

        setIsTranslating(true);
        setTranslateError(null);
        const useGemini = getSettings().translationSource === 'gemini';

        try {
            let data: { translated: string };
            if (useGemini) {
                data = { translated: await translateWithFallback(textToTranslate, targetLang, appState.useContextTranslation) };
            } else {
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: textToTranslate,
                        targetLang,
                        useContextTranslation: appState.useContextTranslation
                    })
                });

                data = await response.json();
                if (!response.ok) {
                    throw new Error((data as { error?: string }).error || 'Translation failed');
                }
            }

            setUndoHistory(appState.content);
            setAppState(prev => {
                if (hasEditorSelection && selection) {
                    return {
                        ...prev,
                        content: prev.content.slice(0, selection.start) + data.translated + prev.content.slice(selection.end),
                        editorSelection: null
                    };
                }

                return {
                    ...prev,
                    content: data.translated,
                    editorSelection: null
                };
            });
        } catch (error: unknown) {
            const message = error instanceof NoKeyError ? 'ضيف مفتاح Gemini من إعدادات الصوت والذكاء الاصطناعي'
                : error instanceof QuotaExhaustedError ? 'حصة الترجمة على مفاتيحك خلصت حالياً'
                    : error instanceof InvalidKeyError ? 'مفتاح Gemini مرفوض'
                        : useGemini ? 'حصلت مشكلة في الاتصال. جرّب تاني.'
                            : error instanceof Error ? error.message : 'Translation failed';
            setTranslateError(message);
            setTimeout(() => setTranslateError(null), 3000);
            if (!useGemini) console.error('Translation error:', error);
        } finally {
            setIsTranslating(false);
        }
    };

    const undoTranslation = () => {
        if (!undoHistory) return;
        setAppState(prev => ({ ...prev, content: undoHistory, editorSelection: null }));
        setUndoHistory(null);
    };

    const toggleContextTranslation = () => {
        setAppState(prev => ({
            ...prev,
            useContextTranslation: !prev.useContextTranslation
        }));
    };

    return (
        <AppContext.Provider
            value={{
                appState,
                setAppState,
                translationState: {
                    isTranslating,
                    error: translateError,
                    canUndo: Boolean(undoHistory)
                },
                translateContent,
                undoTranslation,
                toggleContextTranslation
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
