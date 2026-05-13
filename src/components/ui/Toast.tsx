import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    type?: ToastType;
    duration?: number;
    action?: ToastAction;
}

const styles: Record<ToastType, { bg: string; border: string; shadow: string; icon: React.ReactNode; actionColor: string }> = {
    success: {
        bg: 'rgba(16,185,129,0.18)',
        border: 'rgba(16,185,129,0.55)',
        shadow: 'rgba(16,185,129,0.15)',
        icon: <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />,
        actionColor: '#10B981',
    },
    error: {
        bg: 'rgba(239,68,68,0.18)',
        border: 'rgba(239,68,68,0.55)',
        shadow: 'rgba(239,68,68,0.15)',
        icon: <XCircle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />,
        actionColor: '#EF4444',
    },
    warning: {
        bg: 'rgba(245,158,11,0.18)',
        border: 'rgba(245,158,11,0.55)',
        shadow: 'rgba(245,158,11,0.15)',
        icon: <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />,
        actionColor: '#F59E0B',
    },
    info: {
        bg: 'rgba(59,130,246,0.18)',
        border: 'rgba(59,130,246,0.55)',
        shadow: 'rgba(59,130,246,0.15)',
        icon: <Info size={18} style={{ color: '#3B82F6', flexShrink: 0 }} />,
        actionColor: '#3B82F6',
    },
};

export const Toast: React.FC<ToastProps> = ({
    message,
    isVisible,
    onClose,
    type = 'success',
    duration = 5000,
    action,
}) => {
    useEffect(() => {
        if (!isVisible) return;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [isVisible]);

    if (!isVisible) return null;

    const s = styles[type];

    return (
        <div style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            animation: 'toastSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            minWidth: '240px',
            maxWidth: '90vw',
        }}>
            <style>{`
                @keyframes toastSlideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.92); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
                }
            `}</style>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: action ? '0.65rem 0.75rem 0.65rem 1rem' : '0.7rem 1.2rem',
                borderRadius: '14px',
                backgroundColor: s.bg,
                border: `1.5px solid ${s.border}`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 8px 30px ${s.shadow}, 0 2px 8px rgba(0,0,0,0.18)`,
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
            }} onClick={onClose}>
                {s.icon}
                <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
                {action && (
                    <button
                        onClick={(e) => { e.stopPropagation(); action.onClick(); onClose(); }}
                        style={{
                            padding: '0.3rem 0.8rem',
                            borderRadius: '8px',
                            border: `1.5px solid ${s.actionColor}`,
                            backgroundColor: `${s.actionColor}22`,
                            color: s.actionColor,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${s.actionColor}40`)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = `${s.actionColor}22`)}
                    >
                        {action.label}
                    </button>
                )}
            </div>
        </div>
    );
};
