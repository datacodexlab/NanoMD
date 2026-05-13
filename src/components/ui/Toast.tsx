import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    type?: ToastType;
    duration?: number;
}

const styles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
    success: {
        bg: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.35)',
        icon: <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />,
    },
    error: {
        bg: 'rgba(239,68,68,0.12)',
        border: 'rgba(239,68,68,0.35)',
        icon: <XCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />,
    },
    warning: {
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.35)',
        icon: <AlertTriangle size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />,
    },
    info: {
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.35)',
        icon: <Info size={16} style={{ color: '#3B82F6', flexShrink: 0 }} />,
    },
};

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success', duration = 3000 }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    const s = styles[type];

    return (
        <div style={{
            position: 'fixed',
            bottom: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            animation: 'toastIn 0.25s ease',
        }}>
            <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '999px',
                backgroundColor: s.bg,
                border: `1px solid ${s.border}`,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
            }} onClick={onClose}>
                {s.icon}
                {message}
            </div>
        </div>
    );
};
