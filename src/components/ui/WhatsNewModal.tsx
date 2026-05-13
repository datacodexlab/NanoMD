import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Wand2, ShieldCheck, Zap, Globe, History, Smartphone, Share2 } from 'lucide-react';

interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const updates = [
    {
        version: 'v1.8.0',
        isLatest: true,
        title: 'الإطلاق العام — وضع المراجعة للموبايل وأكثر',
        items: [
            {
                icon: <Smartphone className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />,
                title: 'وضع المراجعة على الموبايل',
                desc: 'كل بند في جدول المراجعة يظهر كبطاقة عمودية مستقلة، مع شريط تقدم ثابت وزر نسخ القرارات دائماً في متناول إبهامك.',
            },
            {
                icon: <Share2 className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
                title: 'رابط مراجعة للوكلاء',
                desc: (<>وكلاء الذكاء الاصطناعي يرفعون مراجعاتهم عبر API ويرسلون رابطاً يفتح جدول المراجعة تفاعلياً مباشرة — بدون نسخ ولصق.</>),
            },
            {
                icon: <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
                title: 'بروتوكول Review Mode v3.0',
                desc: 'بروتوكول كامل مُضمَّن في التطبيق — تفعيل، لغة، وثلاثة سيناريوهات عمل جاهزة للنسخ وإرسالها لأي نموذج AI.',
            },
            {
                icon: <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
                title: 'اللصق في Firefox وإصلاحات عامة',
                desc: 'متصفحات لا تدعم Clipboard API (مثل Firefox) تعرض الآن نافذة لصق يدوي بدلاً من الصمت. كذلك إصلاح تلف النص العربي عند استرجاع المحتوى المشترك.',
            },
        ],
    },
    {
        version: 'v1.7.1',
        isLatest: false,
        title: 'إصلاحات RTL والأيقونة',
        items: [
            {
                icon: <Sparkles className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />,
                title: 'أيقونة NanoMD في التبويب والتطبيق',
                desc: 'يظهر شعار NanoMD الآن في تبويب المتصفح وعند تثبيت الموقع كتطبيق من Chrome على سطح المكتب أو الموبايل.',
            },
            {
                icon: <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
                title: 'كشف اتجاه الـ Code Block تلقائياً',
                desc: 'الـ code blocks تحدد اتجاهها (RTL أو LTR) بناءً على أول حرف قوي في المحتوى، بدلاً من تقييد الكل بـ LTR.',
            },
            {
                icon: <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
                title: 'اتجاه ذكي في المحرر',
                desc: 'المحرر الآن يكشف اتجاه كل سطر تلقائياً — الأسطر العربية RTL والإنجليزية LTR بدون قيود مسبقة.',
            },
        ],
    },
    {
        version: 'v1.7.0',
        isLatest: false,
        title: 'ترجمة سياقية أذكى',
        items: [
            {
                icon: <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
                title: 'نموذج ترجمة أحدث',
                desc: 'الترجمة الذكية تعمل الآن على Gemma 4 مع نموذج احتياطي سريع لضمان استقرار الخدمة.',
            },
            {
                icon: <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
                title: 'ترجمة واعية بالسياق',
                desc: 'خيار جديد يساعد الترجمة على فهم المجال قبل الصياغة، مع حد مباشر يصل إلى 50000 حرف.',
            },
        ],
    },
    {
        version: 'v1.6.0',
        isLatest: false,
        title: 'الدليل التفاعلي والنافذة الذكية',
        items: [
            {
                icon: <Wand2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />,
                title: 'دليل «وضع المراجعة» التفاعلي',
                desc: (<>نافذة شرح ذكية تفاعلية مع زر <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>«جربها الآن»</span> الذي يقرأ النص من الحافظة ويحوله إلى جدول مراجعة أمام عينيك.</>),
            },
            {
                icon: <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />,
                title: 'نافذة «ما الجديد» ونافذة «عن المنصة»',
                desc: 'وصول فوري لسجل التحديثات والدليل الشامل دون مغادرة المحرر.',
            },
        ],
    },
    {
        version: 'v1.5.0',
        isLatest: false,
        title: 'الترجمة الذكية وثورة الموبايل',
        items: [
            {
                icon: <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
                title: 'ترجمة فائقة الذكاء (Llama 3.1)',
                desc: 'ترجم بضغطة زر بين العربية والإنجليزية مع إمكانية ترجمة نص محدد فقط.',
            },
            {
                icon: <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
                title: 'ثورة في واجهة الموبايل',
                desc: 'شريط أدوات سفلي زجاجي (Glassmorphism) يجمع كل أدواتك في متناول إبهامك.',
            },
        ],
    },
    {
        version: 'v1.4.0',
        isLatest: false,
        title: 'أساسيات الإنتاجية',
        items: [
            {
                icon: <Globe className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
                title: 'المشاركة السحابية المؤقتة',
                desc: 'شارك نصوصك بأمان عبر رابط مخصص يُحذف آلياً بعد 30 يوماً.',
            },
            {
                icon: <History className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />,
                title: 'السجل الشامل والمسودات',
                desc: 'احفظ عملك محلياً وارجع له في أي وقت بدون إنترنت.',
            },
        ],
    },
];

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setIsRendered(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    const modalStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-primary)',
    };

    const headerFooterStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-secondary)',
    };

    return createPortal(
        <div
            dir="rtl"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    transition: 'opacity 0.3s',
                    opacity: isVisible ? 1 : 0,
                }}
            />

            {/* Modal */}
            <div
                style={{
                    ...modalStyle,
                    position: 'relative',
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '88dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
                    transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(2rem) scale(0.96)',
                    opacity: isVisible ? 1 : 0,
                    transition: 'transform 0.3s ease, opacity 0.3s ease',
                }}
            >
                {/* Header */}
                <div style={{
                    ...headerFooterStyle,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--border-default)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '0.625rem',
                            backgroundColor: 'rgba(59,130,246,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--accent-primary)',
                        }}>
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                ما الجديد في NanoMD؟
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                إصدار v1.8.0 — اكتشف أحدث الميزات
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        title="إغلاق"
                        style={{
                            padding: '0.5rem', border: 'none', cursor: 'pointer',
                            borderRadius: '0.5rem', color: 'var(--text-muted)',
                            backgroundColor: 'transparent', display: 'flex',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    ...modalStyle,
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                }}>
                    {updates.map((update) => (
                        <div key={update.version}>
                            {/* Section header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                                <span style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backgroundColor: update.isLatest ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                    color: update.isLatest ? '#ffffff' : 'var(--text-secondary)',
                                    border: update.isLatest ? 'none' : '1px solid var(--border-default)',
                                }}>
                                    {update.version}
                                </span>
                                {update.isLatest && (
                                    <span style={{
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '999px',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        backgroundColor: 'rgba(59,130,246,0.1)',
                                        color: 'var(--accent-primary)',
                                    }}>
                                        الأحدث
                                    </span>
                                )}
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    {update.title}
                                </span>
                            </div>

                            {/* Items */}
                            <div style={{
                                borderRight: `2px solid ${update.isLatest ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                                paddingRight: '1rem',
                                marginRight: '0.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.875rem',
                                opacity: update.isLatest ? 1 : 0.85,
                            }}>
                                {update.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '0.625rem' }}>
                                        {item.icon}
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                                {item.title}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                                {item.desc}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    ...headerFooterStyle,
                    flexShrink: 0,
                    padding: '0.875rem 1.25rem',
                    borderTop: '1px solid var(--border-default)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1.5rem',
                            backgroundColor: 'var(--accent-primary)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.625rem',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        رائع، شكراً! ✨
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
