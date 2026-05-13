import React, { useState, useCallback } from 'react';
import { Eye, Pencil, ChevronUp, ChevronDown, Undo2, Loader2, FileOutput } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

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
    onClick?: (e?: any) => void;
    onLongPress?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
    icon, label, active, accent, amber, disabled, onClick, onLongPress
}) => {
    const timerRef = React.useRef<NodeJS.Timeout>();
    const isLongPress = React.useRef(false);

    const startPress = () => {
        isLongPress.current = false;
        if (onLongPress && !disabled) {
            timerRef.current = setTimeout(() => {
                isLongPress.current = true;
                if(window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                onLongPress();
            }, 500);
        }
    };

    const cancelPress = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
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

    const pillStyle = active
        ? { background: 'color-mix(in srgb, var(--accent-primary) 15%, var(--bg-primary))' }
        : {};

    return (
        <button
            onClick={handleClick}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress}
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onContextMenu={(e) => { if(onLongPress) e.preventDefault(); }}
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

                {/* ── Context Translate Toggle ── */}
                {hasContent && (
                    <NavItem
                        icon={<span className="text-[10px] font-black tracking-tight leading-none">CTX</span>}
                        label="سياق"
                        active={appState.useContextTranslation}
                        disabled={translationState.isTranslating}
                        onClick={toggleContextTranslation}
                    />
                )}

                {/* ── Smart Translate ── */}
                {hasContent && (
                    <NavItem
                        icon={
                            translationState.isTranslating
                                ? <Loader2 className="w-[16px] h-[16px] animate-spin" />
                                : <span className="text-[12px] font-black tracking-tight leading-none">{targetLang === 'ar' ? 'AR' : 'EN'}</span>
                        }
                        label="ترجمة"
                        accent
                        disabled={translationState.isTranslating}
                        onClick={() => translateContent(targetLang)}
                        onLongPress={() => setTargetLang(prev => prev === 'ar' ? 'en' : 'ar')}
                    />
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
