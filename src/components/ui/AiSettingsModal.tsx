import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Loader2, Play, ShieldCheck, Trash2, X } from 'lucide-react';
import { addKey, clearAllKeys, getKeys, getSettings, maskKey, removeKey, subscribe, updateSettings } from '../../lib/ai/key-store';
import { testKey } from '../../lib/ai/providers/gemini';
import { speakWithFallback } from '../../lib/ai/fallback';
import { InvalidKeyError, NoKeyError, QuotaExhaustedError, type TtsVoice } from '../../lib/ai/types';
import { PcmPlayer } from '../../lib/tts/pcm-player';
import { useReadAloud } from '../../contexts/ReadAloudContext';

// eslint-disable-next-line react-refresh/only-export-components
export function openAiSettings() {
    window.dispatchEvent(new Event('nanomd:open-ai-settings'));
}

const buttonClass = 'rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm disabled:opacity-40 hover:bg-[var(--bg-tertiary)]';
const iconClass = 'rounded-lg p-2 hover:bg-[var(--bg-tertiary)] disabled:opacity-40 shrink-0';

export function AiSettingsModal() {
    const { cachedBytes, clearAudioCache } = useReadAloud();
    const [clearingCache, setClearingCache] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState(getSettings);
    const [keys, setKeys] = useState(() => getKeys('gemini'));
    const [draft, setDraft] = useState('');
    const [visible, setVisible] = useState(false);
    const [confirmAdd, setConfirmAdd] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, string>>({});
    const [testing, setTesting] = useState<Record<string, boolean>>({});
    const [message, setMessage] = useState('');
    const [previewVoice, setPreviewVoice] = useState<TtsVoice | null>(null);
    const previewRef = useRef<{ controller: AbortController; player: PcmPlayer } | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const testGeneration = useRef(0);

    const stopPreview = useCallback(() => {
        previewRef.current?.controller.abort();
        previewRef.current?.player.dispose();
        previewRef.current = null;
        setPreviewVoice(null);
    }, []);

    const close = useCallback(() => {
        stopPreview();
        testGeneration.current++;
        setTesting({});
        setIsOpen(false);
        setDraft('');
        setVisible(false);
        setConfirmAdd(false);
        setMessage('');
    }, [stopPreview]);

    useEffect(() => subscribe(() => {
        setSettings(getSettings());
        setKeys(getKeys('gemini'));
    }), []);

    useEffect(() => {
        const open = () => {
            returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setIsOpen(true);
        };
        window.addEventListener('nanomd:open-ai-settings', open);
        return () => {
            window.removeEventListener('nanomd:open-ai-settings', open);
            previewRef.current?.controller.abort();
            previewRef.current?.player.dispose();
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (confirmAdd) setConfirmAdd(false);
                else close();
            }
            if (event.key === 'Tab') {
                const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]') ?? [])
                    .filter(item => item.getClientRects().length > 0);
                if (!items?.length) return;
                const first = items[0];
                const last = items[items.length - 1];
                if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey);
            returnFocusRef.current?.focus();
        };
    }, [isOpen, confirmAdd, close]);

    const runTest = async (id: string, key: string) => {
        const generation = testGeneration.current;
        setTesting(prev => ({ ...prev, [id]: true }));
        const { ok, detail } = await testKey(key);
        if (generation !== testGeneration.current) return;
        setTesting(prev => ({ ...prev, [id]: false }));
        const label = ok ? 'المفتاح شغال ✓' : 'المفتاح مرفوض';
        setTestResults(prev => ({ ...prev, [id]: detail ? `${label} — ${detail}` : label }));
    };

    const saveKey = () => {
        try {
            addKey('gemini', draft);
            setDraft('');
            setVisible(false);
            testGeneration.current++;
            setTesting({});
            setTestResults(prev => ({ ...prev, draft: '' }));
            setMessage('تمت إضافة المفتاح');
        } catch {
            setMessage('المفتاح موجود بالفعل أو غير صالح للإضافة');
        }
        setConfirmAdd(false);
    };

    const preview = async (voice: TtsVoice) => {
        stopPreview();
        setMessage('');
        const player = new PcmPlayer();
        const controller = new AbortController();
        const run = { player, controller };
        previewRef.current = run;
        setPreviewVoice(voice);
        player.onEnded = () => {
            if (previewRef.current === run) stopPreview();
        };
        try {
            player.prepare();
            for await (const pcm of speakWithFallback('أهلاً، ده شكل صوتي وأنا بقرا النص بتاعك.', {
                voice, signal: controller.signal
            })) {
                if (previewRef.current !== run) return;
                player.enqueue(pcm);
            }
            if (previewRef.current === run) player.markEnd();
        } catch (error) {
            if (controller.signal.aborted || previewRef.current !== run) return;
            setMessage(error instanceof NoKeyError ? 'ضيف مفتاح Gemini الأول'
                : error instanceof QuotaExhaustedError ? 'الحصة المتاحة لمفاتيحك خلصت حالياً'
                    : error instanceof InvalidKeyError ? 'المفتاح مرفوض من Google'
                        : 'حصلت مشكلة في الاتصال. جرّب تاني.');
            stopPreview();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div dir="rtl" className="fixed inset-0 z-[10000] flex items-center justify-center p-3" style={{ color: 'var(--text-primary)' }}>
            <div className="absolute inset-0 bg-black/70" onClick={close} />
            <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" tabIndex={-1}
                className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl outline-none"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}>
                <header className="flex items-center justify-between gap-2 border-b p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
                    <h2 id="ai-settings-title" className="text-base font-bold">الذكاء الاصطناعي</h2>
                    <button className={iconClass} onClick={close} title="إغلاق" aria-label="إغلاق"><X size={18} /></button>
                </header>
                <div className="space-y-5 overflow-y-auto p-4 text-sm" hidden={confirmAdd}>
                    <section className="space-y-3" aria-label="المفاتيح">
                        <label className="block">المزوّد
                            <select className={`${buttonClass} mt-1 block w-full`} style={{ background: 'var(--bg-secondary)' }} value="gemini" onChange={() => {}}>
                                <option value="gemini">Google Gemini</option>
                            </select>
                        </label>
                        <div className="flex min-w-0 items-center rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                            <input aria-label="مفتاح Gemini" type={visible ? 'text' : 'password'} autoComplete="off" spellCheck={false} dir="ltr"
                                value={draft} disabled={confirmAdd} onChange={event => {
                                    testGeneration.current++;
                                    setTesting({});
                                    setDraft(event.target.value);
                                    setTestResults(prev => ({ ...prev, draft: '' }));
                                }} className="min-w-0 flex-1 bg-transparent p-2 outline-none" />
                            <button className={iconClass} onClick={() => setVisible(prev => !prev)} title={visible ? 'إخفاء المفتاح' : 'إظهار المفتاح'} aria-label={visible ? 'إخفاء المفتاح' : 'إظهار المفتاح'}>
                                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className={buttonClass} disabled={!draft.trim() || testing.draft} onClick={() => void runTest('draft', draft.trim())}>
                                {testing.draft ? <Loader2 className="animate-spin" size={16} aria-label="جاري الاختبار" /> : 'اختبار'}
                            </button>
                            <button className={buttonClass} disabled={!draft.trim()} onClick={() => getKeys('gemini').length ? setConfirmAdd(true) : saveKey()}>إضافة</button>
                            <span className="text-xs" role="status">{testResults.draft}</span>
                        </div>
                        <a className="block text-xs underline" style={{ color: 'var(--accent-primary)' }} href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">احصل على مفتاح مجاني</a>
                        <ul className="space-y-2">
                            {keys.map(key => <li key={key.id} className="rounded-lg border p-2" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 font-mono" dir="ltr">{maskKey(key.key)}</span>
                                    <button className={iconClass} disabled={testing[key.id]} title="اختبار المفتاح" aria-label="اختبار المفتاح" onClick={() => void runTest(key.id, key.key)}>
                                        {testing[key.id] ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                                    </button>
                                    <button className={iconClass} title="حذف المفتاح" aria-label="حذف المفتاح" onClick={() => {
                                        if (window.confirm('متأكد إنك عايز تحذف المفتاح؟')) removeKey(key.id);
                                    }}><Trash2 size={17} /></button>
                                </div>
                                {testResults[key.id] && <p role="status" className="text-xs">{testResults[key.id]}</p>}
                            </li>)}
                        </ul>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.rememberOnDevice} onChange={event => updateSettings({ rememberOnDevice: event.target.checked })} />احفظ المفاتيح على الجهاز ده</label>
                        {!settings.rememberOnDevice && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>المفاتيح هتتمسح لما تقفل التاب</p>}
                    </section>
                    <fieldset className="space-y-2">
                        <legend className="mb-2 font-semibold">الصوت</legend>
                        <div className="flex gap-2">
                            {(['Kore', 'Charon'] as const).map(voice => <div key={voice} className="flex flex-1 items-center justify-between rounded-lg border p-2" style={{ borderColor: settings.voice === voice ? 'var(--accent-primary)' : 'var(--border-default)' }}>
                                <label className="flex items-center gap-2"><input type="radio" name="ai-voice" checked={settings.voice === voice} onChange={() => updateSettings({ voice })} />{voice}</label>
                                <button className={iconClass} title={`تجربة صوت ${voice}`} aria-label={`تجربة صوت ${voice}`} onClick={() => void preview(voice)}>
                                    {previewVoice === voice ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                </button>
                            </div>)}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>التجربة بتستهلك طلب من حصتك</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}>
                            <p className="text-xs" role="status">الصوت المحفوظ في المتصفح: {(cachedBytes / 1048576).toFixed(1)} ميجا</p>
                            <button className={`${buttonClass} text-xs`} disabled={clearingCache} onClick={async () => {
                                if (!window.confirm('متأكد إنك عايز تمسح الصوت المحفوظ؟')) return;
                                setClearingCache(true);
                                try {
                                    await clearAudioCache();
                                    setMessage('تم مسح الصوت المحفوظ');
                                } catch {
                                    setMessage('تعذر مسح الصوت المحفوظ. جرّب تاني.');
                                } finally {
                                    setClearingCache(false);
                                }
                            }}>مسح الصوت المحفوظ</button>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>الصوت اللي اتولد قبل كده بيشتغل تاني من غير ما يستهلك من حصتك.</p>
                    </fieldset>
                    <fieldset className="space-y-2">
                        <legend className="mb-2 font-semibold">مصدر الترجمة</legend>
                        <label className="flex items-center gap-2"><input type="radio" name="translation-source" checked={settings.translationSource === 'builtin'} onChange={() => updateSettings({ translationSource: 'builtin' })} />خدمة الموقع (مجانية)</label>
                        <label className={`flex items-center gap-2 ${keys.length ? '' : 'opacity-40'}`}><input type="radio" name="translation-source" disabled={!keys.length} checked={settings.translationSource === 'gemini'} onChange={() => updateSettings({ translationSource: 'gemini' })} />مفتاح Gemini بتاعي</label>
                    </fieldset>
                    <div className="space-y-2 rounded-lg p-3 text-xs leading-relaxed" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <p>المفتاح بيتحفظ في متصفحك بس، وبيتبعت لـ Google مباشرة. موقعنا ما بيشوفهوش.</p>
                        <p>المفتاح المجاني للتجربة: حوالي 10 قراءات في اليوم و3 في الدقيقة. للاستخدام اليومي فعّل الدفع على مفتاحك (غالباً أقل من دولار في الشهر).</p>
                        <p>في الباقة المجانية Google ممكن تستخدم النص المرسل لتحسين خدماتها.</p>
                        <p>للأمان: اقفل المفتاح على nanomd.pages.dev و Gemini API بس من إعدادات Google Cloud. <a className="underline" style={{ color: 'var(--accent-primary)' }} href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">إعدادات المفاتيح</a></p>
                    </div>
                    <p role="status" className="text-xs">{message}</p>
                    <button className={`${buttonClass} w-full text-red-500`} disabled={!keys.length} onClick={() => {
                        if (window.confirm('متأكد إنك عايز تمسح كل المفاتيح؟')) {
                            stopPreview();
                            clearAllKeys();
                        }
                    }}>مسح كل المفاتيح</button>
                </div>
                {confirmAdd && <div className="space-y-4 overflow-y-auto p-4" role="alertdialog" aria-modal="true" aria-labelledby="ai-add-title" aria-describedby="ai-add-body">
                    <h3 id="ai-add-title" className="font-bold">مفتاح إضافي لـ Gemini</h3>
                    <p id="ai-add-body" className="text-sm leading-relaxed">المفاتيح الإضافية بتُستخدم كاحتياط لو المفتاح الحالي وقف أو رصيده خلص. استخدامك لمفاتيح المزود خاضع لشروطه، وإنت مسؤول عن الالتزام بيها. إنشاء حسابات أو مشاريع متعددة للتحايل على الحدود ممكن يؤدي لإيقاف حسابك عند المزود.</p>
                    <div className="flex flex-wrap gap-2">
                        <button className={buttonClass} onClick={saveKey}>فهمت، أضف المفتاح</button>
                        <button className={buttonClass} onClick={() => setConfirmAdd(false)}>إلغاء</button>
                    </div>
                </div>}
            </div>
        </div>, document.body
    );
}
