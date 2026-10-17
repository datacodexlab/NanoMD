import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, Pencil, ChevronUp, ChevronDown, Undo2, Loader2, FileOutput, Volume2, Pause, Play } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useReadAloud } from '../../contexts/ReadAloudContext';
import { openAiSettings } from '../ui/AiSettingsModal';

const LONG_PRESS_MS = 600;

// ─────────────────────────────────────────────────────────
// NavItem: a single polished tab button in the bottom bar
// ─────────────────────────────────────────────────────────
interface NavItemProps {
    icon: React.ReactNode;
    label?: string;
    active?: boolean;
    accent?: boolean;     // use accent color even when inactive
    amber?: boolean;      // amber tint (undo)
    disabled?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onLongPress?: () => void;
    contextActive?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
    icon, label, active, accent, amber, disabled, onClick, onLongPress, contextActive
}) => {
    const timerRef = React.useRef<NodeJS.Timeout>();
    const isLongPress = React.useRef(false);
    useEffect(() => () => clearTimeout(timerRef.current), []);

    const startPress = () => {
        clearTimeout(timerRef.current);
        isLongPress.current = false;
        if (onLongPress && !disabled) {
            timerRef.current = setTimeout(() => {
                isLongPress.current = true;
                if(window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                onLongPress();
            }, LONG_PRESS_MS);
        }
    };

    const cancelPress = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isLongPress.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (onClick) onClick(e);
    };

    const baseColor = amber
        ? 'text-amber-500'
        : accent
            ? 'text-accent'
            : active
                ? 'text-accent'
                : 'text-text-muted';

    const hoverColor = amber
        ? 'hover:text-amber-400'
        : 'hover:text-text-primary';

    const pillBg = amber
        ? 'hover:bg-amber-500/10'
        : 'hover:bg-bg-secondary/70';

    const pillStyle = active || contextActive
        ? { background: 'color-mix(in srgb, var(--accent-primary) 15%, var(--bg-primary))' }
        : { background: 'transparent' };

    return (
        <button
            onClick={handleClick}
            onPointerDown={event => { if (event.button === 0) startPress(); }}
            onPointerUp={cancelPress}
            onPointerMove={event => { if (event.pointerType === 'touch') cancelPress(); }}
            onPointerCancel={cancelPress}
            onPointerLeave={cancelPress}
            onContextMenu={event => {
                if (onLongPress && !disabled) {
                    event.preventDefault();
                    cancelPress();
                    if (!isLongPress.current) onLongPress();
                    isLongPress.current = true;
                }
            }}
            aria-label={label}
            disabled={disabled}
            className={`
                relative flex flex-col items-center justify-center flex-1 min-w-0
                py-1.5 gap-0.5 transition-all duration-200 ease-out
                ${baseColor} ${!disabled ? hoverColor : ''}
                ${disabled ? 'opacity-35 cursor-not-allowed' : 'active:scale-90'}
                group
            `}
        >
            {/* Icon container with active pill */}
            <div className={`
                flex items-center justify-center
                w-10 h-7 rounded-xl transition-all duration-200
                ${pillBg}
            `} style={pillStyle}>
                {/* Active accent top-line indicator */}
                {active && (
                    <span className="
                        absolute top-0 left-1/2 -translate-x-1/2
                        w-6 h-0.5 rounded-full bg-accent
                        shadow-[0_0_6px_1px_var(--color-accent,#6366f1)]
                    " />
                )}
                {icon}
            </div>

            {/* Label */}
            {label && (
                <span className={`
                    text-[8.5px] font-semibold tracking-wide leading-none
                    transition-all duration-200
                    ${active ? 'text-accent' : amber ? 'text-amber-500' : ''}
                `}>
                    {label}
                </span>
            )}
        </button>
    );
};

// ─────────────────────────────────────────────────────────
// Vertical Divider
// ─────────────────────────────────────────────────────────
const Divider = () => (
    <div className="flex-shrink-0 w-px mx-0.5 self-stretch my-3 bg-gradient-to-b from-transparent via-border-default to-transparent opacity-60" />
);

// ─────────────────────────────────────────────────────────
// MobileNav
// ─────────────────────────────────────────────────────────
export const MobileNav: React.FC = () => {
    const { appState, setAppState, translationState, translateContent, undoTranslation, toggleContextTranslation } = useAppContext();
    const [targetLang, setTargetLang] = useState<'ar' | 'en'>('ar');
    const { status, hasKey, play, pause } = useReadAloud();
    const [translationOptionsOpen, setTranslationOptionsOpen] = useState(false);
    const translationOptionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!translationOptionsOpen) return;
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Node && !translationOptionsRef.current?.contains(event.target)) setTranslationOptionsOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setTranslationOptionsOpen(false);
        };
        document.addEventListener('pointerdown', outside);
        window.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', outside);
            window.removeEventListener('keydown', escape);
        };
    }, [translationOptionsOpen]);

    const handleTabClick = (view: 'preview' | 'editor') => {
        setAppState(prev => ({ ...prev, viewMode: view }));
    };

    const scrollBy = useCallback((direction: 'up' | 'down') => {
        const container = document.getElementById('print-area');
        if (container) {
            const amount = container.clientHeight * 0.7;
            container.scrollBy({ top: direction === 'up' ? -amount : amount, behavior: 'smooth' });
        }
    }, []);

    const hasContent = appState.content.trim().length > 0;
    const isPreview = appState.viewMode === 'preview';
    const isEditor = appState.viewMode === 'editor' || appState.viewMode === 'split';

    return (
        <nav className="
            md:hidden fixed bottom-0 z-50 w-full pb-safe
            border-t border-border-default/60
            bg-bg-primary/80 backdrop-blur-2xl
            shadow-[0_-1px_0_0_rgba(0,0,0,0.04),0_-8px_32px_-4px_rgba(0,0,0,0.08)]
        ">
            {/* Subtle top highlight line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent pointer-events-none" />

            <div className="flex items-center px-1 h-[62px]">

                {/* ── View: Preview ── */}
                <NavItem
                    icon={<Eye className="w-[18px] h-[18px]" />}
                    label="عرض"
                    active={isPreview}
                    onClick={() => handleTabClick('preview')}
                />

                {/* ── View: Editor ── */}
                <NavItem
                    icon={<Pencil className="w-[18px] h-[18px]" />}
                    label="تحرير"
                    active={isEditor}
                    onClick={() => handleTabClick('editor')}
                />

                <Divider />

                {/* ── Scroll Up ── */}
                {hasContent && (
                    <NavItem
                        icon={<ChevronUp className="w-[18px] h-[18px]" />}
                        label="أعلى"
                        onClick={() => scrollBy('up')}
                    />
                )}

                {/* ── Scroll Down ── */}
                {hasContent && (
                    <NavItem
                        icon={<ChevronDown className="w-[18px] h-[18px]" />}
                        label="أسفل"
                        onClick={() => scrollBy('down')}
                    />
                )}

                {hasContent && <Divider />}

                {/* Read aloud */}
                {hasContent && (
                    <NavItem
                        icon={status === 'loading' ? <Loader2 className="w-[18px] h-[18px] animate-spin" />
                            : status === 'playing' ? <Pause className="w-[18px] h-[18px]" />
                                : status === 'paused' ? <Play className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
                        label="استماع"
                        active={status === 'playing' || status === 'paused'}
                        onClick={() => {
                            if (!hasKey) openAiSettings();
                            else if (status === 'playing') pause();
                            else play();
                        }}
                        onLongPress={openAiSettings}
                    />
                )}

                {/* ── Smart Translate ── */}
                {hasContent && (
                    <div ref={translationOptionsRef} className="relative flex min-w-0 flex-1 self-stretch">
                    <NavItem
                        icon={
                            translationState.isTranslating
                                ? <Loader2 className="w-[16px] h-[16px] animate-spin" />
                                : <span className="text-[12px] font-black tracking-tight leading-none">{targetLang === 'ar' ? 'AR' : 'EN'}</span>
                        }
                        label="ترجمة"
                        accent
                        contextActive={appState.useContextTranslation}
                        disabled={translationState.isTranslating}
                        onClick={() => translateContent(targetLang)}
                        onLongPress={() => setTranslationOptionsOpen(true)}
                    />
                    {translationOptionsOpen && <div role="dialog" aria-label="خيارات الترجمة" dir="rtl"
                        className="absolute bottom-full left-0 mb-3 w-56 space-y-3 rounded-xl border p-3 text-xs shadow-lg"
                        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-default)' }}>
                        <label className="flex items-center justify-between gap-2">
                            ترجمة بالسياق (CTX)
                            <input type="checkbox" checked={appState.useContextTranslation} onChange={toggleContextTranslation} />
                        </label>
                        <div className="flex gap-2" dir="ltr" role="group" aria-label="لغة الترجمة">
                            {(['ar', 'en'] as const).map(lang => <button key={lang} aria-pressed={targetLang === lang}
                                className="flex-1 rounded-lg border px-3 py-2" onClick={() => setTargetLang(lang)}
                                style={{ borderColor: 'var(--border-default)', background: targetLang === lang ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--bg-primary))' : 'transparent' }}>
                                {lang.toUpperCase()}
                            </button>)}
                        </div>
                    </div>}
                    </div>
                )}

                {/* ── Undo Translation ── */}
                {translationState.canUndo && (
                    <NavItem
                        icon={<Undo2 className="w-[18px] h-[18px]" />}
                        label="تراجع"
                        amber
                        onClick={undoTranslation}
                    />
                )}

                {/* ── Export / Copy Menu ── */}
                {hasContent && <Divider />}
                {hasContent && (
                    <NavItem
                        icon={<FileOutput className="w-[18px] h-[18px]" />}
                        label="تصدير"
                        onClick={() => window.dispatchEvent(new Event('open-export-menu'))}
                    />
                )}

            </div>
        </nav>
    );
};
