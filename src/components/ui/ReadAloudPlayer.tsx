import { useEffect, useRef } from 'react';
import { Loader2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useReadAloud } from '../../contexts/ReadAloudContext';
import { PLAYBACK_SPEEDS } from '../../lib/ai/types';
import { openAiSettings } from './AiSettingsModal';

export function ReadAloudPlayer() {
    const { status, error, quotaRetryAt, blockIndex, blockCount, speed, setSpeed, play, pause, stop, next, prev, seekToBlock } = useReadAloud();
    const openedForNoKey = useRef(false);

    useEffect(() => {
        if (status === 'error' && error === 'no-key') {
            if (!openedForNoKey.current) {
                openedForNoKey.current = true;
                openAiSettings();
            }
        } else openedForNoKey.current = false;
    }, [status, error]);

    if (status === 'idle') return null;

    const messages = {
        'no-key': 'ضيف مفتاح Gemini الأول',
        quota: 'الحصة المتاحة لمفاتيحك خلصت حالياً. جرّب تاني بعد شوية، أو أضف مفتاح احتياطي من الإعدادات.',
        'invalid-key': 'المفتاح مرفوض من Google. راجع المفتاح في الإعدادات.',
        network: 'حصلت مشكلة في الاتصال. جرّب تاني.'
    };
    let message = messages[error ?? 'network'];
    if (error === 'quota' && quotaRetryAt !== null) {
        const date = new Date(quotaRetryAt);
        const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        message += ` (متاحة تاني حوالي الساعة ${time})`;
    }
    const buttonClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-40';
    const currentBlock = Math.min(Math.max(blockIndex + 1, 0), blockCount);
    const hasSettingsLink = error === 'quota' || error === 'invalid-key';
    const [beforeSettings, afterSettings] = message.split('الإعدادات');

    return (
        <div className="sticky top-0 z-30 shrink-0 border-b print:hidden" dir="rtl"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            <div role="region" aria-label="مشغل القراءة الصوتية" className="mx-auto flex h-12 w-full max-w-3xl items-center gap-1 px-2 sm:gap-2 sm:px-4">
                {status === 'error' ? <p role="alert" title={message} className="flex min-w-0 flex-1 items-center gap-0.5 whitespace-nowrap text-xs">
                    {hasSettingsLink ? <>
                        <span className="min-w-0 truncate">{beforeSettings}</span>
                        <a href="#ai-settings" className="shrink-0 underline underline-offset-2" style={{ color: 'var(--accent-primary)' }}
                            onClick={event => { event.preventDefault(); openAiSettings(); }}>الإعدادات</a>
                        <span className="max-w-[45%] truncate">{afterSettings}</span>
                    </> : <span className="truncate">{message}</span>}
                </p> : <>
                    <button className={buttonClass} title="الفقرة اللي فاتت" aria-label="الفقرة اللي فاتت" disabled={!blockCount} onClick={prev}><SkipBack size={20} /></button>
                    <button className={`${buttonClass} text-white`} style={{ background: 'var(--accent-primary)' }} title={status === 'playing' ? 'إيقاف مؤقت' : 'تشغيل'} aria-label={status === 'playing' ? 'إيقاف مؤقت' : 'تشغيل'} disabled={status === 'loading'} onClick={status === 'playing' ? pause : play}>
                        {status === 'loading' ? <Loader2 className="animate-spin" size={20} /> : status === 'playing' ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button className={buttonClass} title="الفقرة اللي بعدها" aria-label="الفقرة اللي بعدها" disabled={!blockCount} onClick={next}><SkipForward size={20} /></button>
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 border-x px-2" dir="ltr" style={{ borderColor: 'var(--border-default)' }}>
                        <input type="range" aria-label="موضع القراءة" min={0} max={Math.max(blockCount - 1, 1)} step={1} value={Math.max(currentBlock - 1, 0)} disabled={blockCount < 2}
                            onChange={event => seekToBlock(Math.round(Number(event.target.value)))}
                            className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent-primary)] [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--accent-primary)]"
                            style={{ background: `linear-gradient(to right, var(--accent-primary) ${blockCount ? currentBlock / blockCount * 100 : 0}%, var(--border-default) 0%)` }} />
                        <span className="shrink-0 text-[10px] tabular-nums">{currentBlock} / {blockCount}</span>
                    </div>
                    <button className="h-9 min-w-[52px] shrink-0 rounded-full px-2 text-xs font-semibold tabular-nums hover:bg-[var(--bg-tertiary)]"
                        title="سرعة التشغيل" aria-label={`سرعة التشغيل ${speed}×`} dir="ltr"
                        onClick={() => setSpeed(PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(speed) + 1) % PLAYBACK_SPEEDS.length])}>
                        {speed}×
                    </button>
                </>}
                <button className={buttonClass} title="إغلاق" aria-label="إغلاق" onClick={stop}><X size={20} /></button>
            </div>
        </div>
    );
}
